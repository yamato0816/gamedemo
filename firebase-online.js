/* Firebase Realtime Database relay. Host still owns the game engine.
   Each player reads only their own private projection. */
(function(root){
'use strict';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const roomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(7)),n=>ALPHABET[n%ALPHABET.length]).join('');
const safeName=n=>String(n||'旅人').replace(/[<>\r\n]/g,'').trim().slice(0,14)||'旅人';
const errorText=e=>e?.code==='PERMISSION_DENIED'?'Firebaseのアクセス権限が拒否されました。データベースのRulesを確認してください':String(e?.message||e||'不明な通信エラー');
function validConfig(){
 let config;
 try{config=JSON.parse(localStorage.getItem('cr_firebase_config')||'null');}catch{}
 if(!config&&root.CHAOS_FIREBASE_CONFIG)config=root.CHAOS_FIREBASE_CONFIG;
 if(!config||!config.apiKey||!config.databaseURL||!config.projectId||!config.appId)
  throw Error('📡 通信 → Firebase設定にWebアプリの構成情報を登録してください');
 if(!/^https:\/\/[a-z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)\/?$/i.test(config.databaseURL))
  throw Error('Firebase databaseURLが不正です。Realtime DatabaseのURLを指定してください');
 return config;
}
let sdkPromise;
function loadSDK(){
 if(sdkPromise)return sdkPromise;
 const files=['firebase-app-compat.js','firebase-auth-compat.js','firebase-database-compat.js'];
 sdkPromise=files.reduce((p,file)=>p.then(()=>new Promise((resolve,reject)=>{
  if(file==='firebase-app-compat.js'&&root.firebase?.apps)return resolve();
  if(file==='firebase-auth-compat.js'&&root.firebase?.auth)return resolve();
  if(file==='firebase-database-compat.js'&&root.firebase?.database)return resolve();
  const node=document.createElement('script');
  node.src='https://www.gstatic.com/firebasejs/11.10.0/'+file;
  node.onload=resolve;node.onerror=()=>reject(Error('Firebase SDKを読み込めません（'+file+'）。GoogleのCDNへの通信を確認してください'));
  document.head.appendChild(node);
 })),Promise.resolve()).catch(e=>{sdkPromise=null;throw e});
 return sdkPromise;
}
class FirebaseOnline{
 constructor({onState,onInfo,onError,onClosed}){
  Object.assign(this,{onState,onInfo,onError,onClosed});
  this.ready=false;this.isHost=false;this.room=null;this.code='';this.id='';
  this.db=null;this.app=null;this.clock=null;this.tick=0;this.refs=[];this.actionRefs=new Map();
  this.members=new Set();this.queue=Promise.resolve();this.generation=0;this.participantRef=null;this.roomRef=null;
  this.claimTimer=null;this.claiming=false;this.promoting=false;this.checkpointWrite=Promise.resolve();this.metaListener=null;this.absenceTimers=new Map();
 }
 _listen(ref,event,fn){
  ref.on(event,fn,err=>this.onError('Firebase: '+errorText(err)));
  this.refs.push(()=>ref.off(event,fn));
 }
 _trackGuest(id,ref,fn){ref.on('child_added',fn,e=>this.onError('操作の受信に失敗: '+errorText(e)));this.actionRefs.set(id,()=>ref.off('child_added',fn));}
 async _boot(){
  const config=validConfig();
  await loadSDK();
  const firebase=root.firebase;
  this.app=firebase.apps.find(x=>x.name==='chaos-relic-game')||firebase.initializeApp(config,'chaos-relic-game');
  const auth=this.app.auth();
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  const credential=auth.currentUser?{user:auth.currentUser}:await auth.signInAnonymously();
  this.id=credential.user.uid;
  this.db=this.app.database();
  if(localStorage.getItem('cr_firebase_longpoll')==='1'&&this.db.INTERNAL?.forceLongPolling){
   this.db.INTERNAL.forceLongPolling();
  }
  const connected=this.db.ref('.info/connected');
  this._listen(connected,'value',snap=>{
   if(!snap.val()){this.onInfo('Firebase接続待ち / 再接続中');return}
   this.onInfo(this.ready?'Firebaseで接続中':'Firebaseに接続しました');
   if(this.ready){
    if(this.isHost){
      const meta=this.roomRef?.child('meta');
      meta?.once('value').then(snapshot=>{
        if(!snapshot.exists()||snapshot.val().hostUid!==this.id){
          this.ready=false;clearInterval(this.clock);
          this.onClosed('別の参加者が新しいホストになりました。部屋に再参加してください');
          return;
        }
        return meta.update({connected:true,lastHeartbeat:Date.now()}).then(()=>meta.onDisconnect().update({connected:false}));
      }).catch(err=>this.onError('再接続: '+errorText(err)));
    }else if(this.participantRef){
      this.participantRef.set({name:this.name,joinedAt:Date.now()})
       .then(()=>this.participantRef?.onDisconnect().remove())
       .catch(err=>this.onError('再接続: '+errorText(err)));
    }
   }
  });
 }
 async create(name){
  this.disconnect();
  const token=this.generation;
  this.isHost=true;this.name=safeName(name);
  try{
   await this._boot();
   if(this.generation!==token)throw Error('接続がキャンセルされました');
   for(let i=0;i<6;i++){
    const code=roomCode();
    const meta=this.db.ref('rooms/'+code+'/meta');
    const result=await meta.transaction(old=>old===null?{hostUid:this.id,connected:true,epoch:0,createdAt:root.firebase.database.ServerValue.TIMESTAMP}:undefined,undefined,false);
    if(result.committed){this.code=code;break}
   }
   if(!this.code)throw Error('部屋コードが重複しました。もう一度作成してください');
   this.roomRef=this.db.ref('rooms/'+this.code);
   // Never delete a room on a momentary Wi-Fi disconnection: this caused the
   // entire match to disappear on campuses with unstable WebSockets.
   await this.roomRef.child('meta').update({connected:true,lastHeartbeat:Date.now()});
   await this.roomRef.child('meta').onDisconnect().update({connected:false});
   this._listen(this.roomRef.child('meta'),'value',snap=>{
     if(this.ready&&!snap.exists()){
       this.ready=false;clearInterval(this.clock);this.onClosed('Firebaseの部屋が閉じられました。新しい部屋を作成してください');
     }
   });
   this.participantRef=this.roomRef.child('participants/'+this.id);
   await this.participantRef.set({name:this.name,joinedAt:Date.now()});
   await this.participantRef.onDisconnect().remove();
   this.room=GameEngine.create(this.code,this.id,this.name);
   this.members.add(this.id);
   this.ready=true;
   const members=this.roomRef.child('participants');
   this._listen(members,'child_added',snap=>{if(snap.key!==this.id)this._addMember(snap).catch(e=>this.onError(errorText(e)));});
   this._listen(members,'child_removed',snap=>{if(snap.key!==this.id)this._removeMember(snap.key);});
   this._startClock();
   await this._broadcast();
   return this.code;
  }catch(err){this.disconnect();throw Error('Firebase部屋作成: '+errorText(err))}
 }
 _startClock(){
   clearInterval(this.clock);
   this.clock=setInterval(()=>{
    if(!this.room||!this.ready||!this.isHost)return;
    try{
     const before=JSON.stringify({phase:this.room.phase,turn:this.room.turnIndex,round:this.room.round,pending:this.room.pending,players:this.room.players.map(p=>[p.hp,p.mp,p.gold,p.status,p.guardian])});
     GameEngine.settle(this.room);
     const after=JSON.stringify({phase:this.room.phase,turn:this.room.turnIndex,round:this.room.round,pending:this.room.pending,players:this.room.players.map(p=>[p.hp,p.mp,p.gold,p.status,p.guardian])});
     if(before!==after||(++this.tick%10===0))this._broadcast();
    }catch(err){this.onError(errorText(err))}
   },1000);
 }
 async _addMember(snap,restoring=false){
  if(!this.ready||!this.room||this.members.has(snap.key))return;
  const id=snap.key,person=snap.val();
  if(!person||typeof person.name!=='string')return;
  try{
   const old=this.room.players.find(p=>p.id===id);
   if(old)old.lastSeen=Date.now();
   else GameEngine.join(this.room,id,safeName(person.name));
  }catch(e){
   await this.roomRef.child('errors/'+id).set({message:String(e.message).slice(0,150)});
   return;
  }
  clearTimeout(this.absenceTimers.get(id));this.absenceTimers.delete(id);
  this.members.add(id);
  const actionRef=this.roomRef.child('actions/'+id);
  // Do not replay stale queued actions after a browser refresh.
  if(!restoring)await actionRef.remove();
  const listener=snap=>{this.queue=this.queue.then(async()=>{
   if(!this.ready||!this.members.has(id))return;
   const msg=snap.val();
   try{
    if(!msg||typeof msg.action!=='object'||Array.isArray(msg.action)||JSON.stringify(msg.action).length>262144)throw Error('無効な操作');
    GameEngine.apply(this.room,id,msg.action);
    await this._broadcast();
   }catch(e){
     const message=errorText(e);
     this.onError(safeName(person.name)+' の操作: '+message);
     await this.roomRef.child('errors/'+id).set({message:message.slice(0,150)}).catch(()=>{});
   }finally{await snap.ref.remove().catch(()=>{});}
  }).catch(e=>this.onError(errorText(e)));};
  this._trackGuest(id,actionRef,listener);
  await this.roomRef.child('errors/'+id).remove();
  await this._broadcast();
 }
 _removeMember(id){
  this.members.delete(id);
  this.actionRefs.get(id)?.();this.actionRefs.delete(id);
  if(!this.room)return;
  const p=this.room.players.find(x=>x.id===id);
  if(!p)return;
  try{
   // Brief disconnections are not surrender: let the player reconnect
   // before the next host removes their seat.
   clearTimeout(this.absenceTimers.get(id));
   this.absenceTimers.set(id,setTimeout(()=>{
     this.absenceTimers.delete(id);
     if(!this.room||this.members.has(id))return;
     try{GameEngine.leave(this.room,id);this._broadcast();}
     catch(err){this.onError('退出判定: '+errorText(err))}
   },12000));
   this.onInfo(p.name+' の接続待ち（12秒間は対戦状態を保持）');
  }catch(err){this.onError(errorText(err))}
 }
 async _broadcast(){
  if(!this.ready||!this.room)return;
  GameEngine.settle(this.room);
  // Preserve an authoritative host-only checkpoint before notifying participants.
  // Writes are ordered to avoid an older snapshot overwriting newer turns.
  const roomSnapshot=JSON.parse(JSON.stringify(this.room));
  this.checkpointWrite=this.checkpointWrite.catch(()=>{}).then(()=>this.roomRef.child('checkpoint').set(roomSnapshot));
  try{await this.checkpointWrite;}catch(err){this.onError('対戦状態のバックアップに失敗: '+errorText(err));return;}
  const own=GameEngine.view(this.room,this.id);
  if(own)this.onState(own);
  const sends=[];
  for(const uid of this.members){
   if(uid===this.id)continue;
   const view=GameEngine.view(this.room,uid);
   if(view)sends.push(this.roomRef.child('views/'+uid).set(view));
  }
  const failures=await Promise.allSettled(sends);
  const bad=failures.find(x=>x.status==='rejected');
  if(bad)this.onError('画面同期失敗: '+errorText(bad.reason));
 }
 _scheduleClaim(){
  if(this.claimTimer||this.claiming||this.promoting||!this.ready||this.isHost)return;
  this.onInfo('👑 ホストが離脱しました。ホスト引継ぎを準備しています');
  this.claimTimer=setTimeout(()=>{
   this.claimTimer=null;this._claimHost().catch(err=>this.onError('ホスト引継ぎ: '+errorText(err)));
  },700+Math.floor(Math.random()*700));
 }
 async _claimHost(){
  if(!this.ready||this.isHost||this.claiming||!this.roomRef)return;
  this.claiming=true;
  try{
   const meta=this.roomRef.child('meta');
   const result=await meta.transaction(old=>{
    if(!old||old.connected!==false||old.hostUid===this.id)return;
    return {...old,hostUid:this.id,connected:true,epoch:(old.epoch||0)+1,lastHeartbeat:Date.now()};
   },undefined,false);
   if(result.committed)await this._promote();
  }finally{this.claiming=false;}
 }
 async _promote(){
  if(this.isHost||this.promoting||!this.roomRef)return;
  this.promoting=true;
  try{
   const snapshot=await this.roomRef.child('checkpoint').once('value');
   const data=snapshot.val();
   if(!data||data.code!==this.code||!Array.isArray(data.players)||!data.players.some(p=>p.id===this.id))
    throw Error('引継ぎ可能な対戦データがありません。部屋を作り直してください');
   this.room=data;this.room.host=this.id;
   // A crashed host has already disappeared from participants; surrender that
   // player so the next turn never waits for someone whose tab is gone.
   const online=(await this.roomRef.child('participants').once('value')).val()||{};
   for(const p of [...this.room.players])if(!p.bot&&!online[p.id]){
     const id=p.id;
     this.absenceTimers.set(id,setTimeout(()=>{
       this.absenceTimers.delete(id);
       if(!this.room||this.members.has(id))return;
       try{GameEngine.leave(this.room,id);this._broadcast();}
       catch(err){this.onError('切断者の処理: '+errorText(err))}
     },12000));
   }
   this.isHost=true;this.ready=true;
   this.members.clear();this.members.add(this.id);
   await this.participantRef?.onDisconnect().cancel();
   await this.participantRef?.onDisconnect().remove();
   await this.roomRef.child('meta').onDisconnect().update({connected:false});
   const members=this.roomRef.child('participants');
   this._listen(members,'child_added',snap=>{
    if(snap.key!==this.id)this._addMember(snap,true).catch(err=>this.onError(errorText(err)));
   });
   this._listen(members,'child_removed',snap=>{if(snap.key!==this.id)this._removeMember(snap.key)});
   this._startClock();
   this.onInfo('👑 あなたが新ホストです。対戦を引き継ぎました');
   await this._broadcast();
  }finally{this.promoting=false;}
 }
 async join(code,name){
  this.disconnect();const token=this.generation;
  this.isHost=false;this.name=safeName(name);
  this.code=String(code||'').trim().toUpperCase();
  if(!/^[A-HJ-NP-Z2-9]{7}$/.test(this.code))throw Error('部屋コードは7文字です');
  let deadline;
  try{
   await this._boot();
   if(this.generation!==token)throw Error('接続がキャンセルされました');
   this.roomRef=this.db.ref('rooms/'+this.code);
   const meta=await this.roomRef.child('meta').once('value');
   if(!meta.exists())throw Error('部屋が見つかりません。ホストが開いているか確認してください');
   this.participantRef=this.roomRef.child('participants/'+this.id);
   // Ensure the participant is removed when this connection drops.
   await this.participantRef.set({name:this.name,joinedAt:Date.now()});
   await this.participantRef.onDisconnect().remove();
   const viewRef=this.roomRef.child('views/'+this.id);
   const errorRef=this.roomRef.child('errors/'+this.id);
   return await new Promise((resolve,reject)=>{
    let done=false;const finish=(err)=>{
     if(done)return;done=true;clearTimeout(deadline);
     if(err)reject(err);else resolve(this.code);
    };
    this._listen(viewRef,'value',snap=>{
     if(this.generation!==token||this.isHost)return;
     const view=snap.val();if(!view)return;
     this.ready=true;this.onState(view);this.onInfo('Firebase 対戦接続');
     finish();
    });
    this._listen(errorRef,'value',snap=>{
     const message=snap.val()?.message;
     if(!message)return;
     if(!done)finish(Error(message));
     else this.onError('操作: '+message);
    });
    this._listen(this.roomRef.child('meta'),'value',snap=>{
     if(!snap.exists()){this.ready=false;this.onClosed('部屋が終了しました');finish(Error('部屋が終了しました'));return;}
     const value=snap.val();
     if(value.hostUid===this.id&&!this.isHost&&this.ready){this._promote().catch(e=>this.onError('ホスト引継ぎ: '+errorText(e)));return;}
     if(value.connected===false&&value.hostUid!==this.id&&this.ready&&!this.isHost)this._scheduleClaim();
     else if(value.connected!==false){clearTimeout(this.claimTimer);this.claimTimer=null;}
    });
    deadline=setTimeout(()=>finish(Error('Firebaseの参加がタイムアウトしました。匿名認証とRulesを確認してください')),19000);
   });
  }catch(err){
   // A rejected join must not leave an online participant occupying a seat.
   this.disconnect();throw Error('Firebase参加: '+errorText(err));
  }
 }
 act(action){
  if(!this.ready)throw Error('Firebaseに接続していません');
  if(this.isHost){
   GameEngine.apply(this.room,this.id,action);
   this._broadcast();
  }else{
   if(JSON.stringify(action).length>262144)throw Error('操作が大きすぎます');
   this.roomRef.child('actions/'+this.id).push().set({action,createdAt:Date.now()}).catch(err=>this.onError('送信失敗: '+errorText(err)));
  }
 }
 disconnect(){
  this.generation++;
  clearInterval(this.clock);this.clock=null;
  this.refs.splice(0).forEach(off=>{try{off()}catch{}});
  for(const fn of this.actionRefs.values())try{fn()}catch{}
  this.actionRefs.clear();this.members.clear();
  for(const timer of this.absenceTimers.values())clearTimeout(timer);this.absenceTimers.clear();
  clearTimeout(this.claimTimer);this.claimTimer=null;
  const room=this.roomRef,me=this.participantRef,wasHost=this.isHost;
  if(wasHost&&room){
    // A voluntary exit also triggers host migration. Keep the checkpoint and
    // never delete the full room while other participants are still present.
    this.checkpointWrite.catch(()=>{}).then(async()=>{
      await room.child('meta').update({connected:false,lastHeartbeat:Date.now()});
      await room.child('meta').onDisconnect().cancel();
      await me?.remove();
    }).catch(()=>{});
  }else if(me){
    me.onDisconnect().cancel().catch(()=>{});
    me.remove().catch(()=>{});
  }
  this.roomRef=null;this.participantRef=null;this.room=null;this.ready=false;this.isHost=false;
 }
}
root.FirebaseOnline=FirebaseOnline;
})(typeof globalThis!=='undefined'?globalThis:this);