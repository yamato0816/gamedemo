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
      this.roomRef?.onDisconnect().remove().catch(err=>this.onError('切断監視: '+errorText(err)));
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
    const result=await meta.transaction(old=>old===null?{hostUid:this.id,createdAt:root.firebase.database.ServerValue.TIMESTAMP}:undefined,undefined,false);
    if(result.committed){this.code=code;break}
   }
   if(!this.code)throw Error('部屋コードが重複しました。もう一度作成してください');
   this.roomRef=this.db.ref('rooms/'+this.code);
   await this.roomRef.onDisconnect().remove();
   this._listen(this.roomRef.child('meta'),'value',snap=>{
     if(this.ready&&!snap.exists()){
       this.ready=false;clearInterval(this.clock);this.onClosed('Firebaseの部屋が閉じられました。新しい部屋を作成してください');
     }
   });
   this.participantRef=this.roomRef.child('participants/'+this.id);
   await this.participantRef.set({name:this.name,joinedAt:Date.now()});
   this.room=GameEngine.create(this.code,this.id,this.name);
   this.members.add(this.id);
   this.ready=true;
   const members=this.roomRef.child('participants');
   this._listen(members,'child_added',snap=>{if(snap.key!==this.id)this._addMember(snap).catch(e=>this.onError(errorText(e)));});
   this._listen(members,'child_removed',snap=>{if(snap.key!==this.id)this._removeMember(snap.key);});
   this.clock=setInterval(()=>{
    if(!this.room||!this.ready)return;
    try{
     const before=JSON.stringify({phase:this.room.phase,turn:this.room.turnIndex,round:this.room.round,pending:this.room.pending,players:this.room.players.map(p=>[p.hp,p.mp,p.gold,p.status,p.guardian])});
     GameEngine.settle(this.room);
     const after=JSON.stringify({phase:this.room.phase,turn:this.room.turnIndex,round:this.room.round,pending:this.room.pending,players:this.room.players.map(p=>[p.hp,p.mp,p.gold,p.status,p.guardian])});
     if(before!==after||(++this.tick%10===0))this._broadcast();
    }catch(err){this.onError(errorText(err))}
   },1000);
   await this._broadcast();
   return this.code;
  }catch(err){this.disconnect();throw Error('Firebase部屋作成: '+errorText(err))}
 }
 async _addMember(snap){
  if(!this.ready||!this.room||this.members.has(snap.key))return;
  const id=snap.key,person=snap.val();
  if(!person||typeof person.name!=='string')return;
  try{
   GameEngine.join(this.room,id,safeName(person.name));
  }catch(e){
   await this.roomRef.child('errors/'+id).set({message:String(e.message).slice(0,150)});
   return;
  }
  this.members.add(id);
  const actionRef=this.roomRef.child('actions/'+id);
  // Do not replay stale queued actions after a browser refresh.
  await actionRef.remove();
  const listener=snap=>{this.queue=this.queue.then(async()=>{
   if(!this.ready||!this.members.has(id))return;
   const msg=snap.val();
   try{
    if(!msg||typeof msg.action!=='object'||Array.isArray(msg.action)||JSON.stringify(msg.action).length>12000)throw Error('無効な操作');
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
   if(['lobby','finished'].includes(this.room.phase))GameEngine.leave(this.room,id);
   else p.lastSeen=0;
   this._broadcast();
  }catch(err){this.onError(errorText(err))}
 }
 async _broadcast(){
  if(!this.ready||!this.room)return;
  GameEngine.settle(this.room);
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
     if(this.generation!==token)return;
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
    let sawRoom=true;
    this._listen(this.roomRef.child('meta'),'value',snap=>{
     if(!snap.exists()&&sawRoom){this.ready=false;this.onClosed('ホストが部屋を閉じました');finish(Error('部屋が終了しました'))}
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
   if(JSON.stringify(action).length>12000)throw Error('操作が大きすぎます');
   this.roomRef.child('actions/'+this.id).push().set({action,createdAt:Date.now()}).catch(err=>this.onError('送信失敗: '+errorText(err)));
  }
 }
 disconnect(){
  this.generation++;
  clearInterval(this.clock);this.clock=null;
  this.refs.splice(0).forEach(off=>{try{off()}catch{}});
  for(const fn of this.actionRefs.values())try{fn()}catch{}
  this.actionRefs.clear();this.members.clear();
  const ref=this.isHost?this.roomRef:this.participantRef;
  if(ref){ref.onDisconnect().cancel().catch(()=>{});ref.remove().catch(()=>{});}
  this.roomRef=null;this.participantRef=null;this.room=null;this.ready=false;this.isHost=false;
 }
}
root.FirebaseOnline=FirebaseOnline;
})(typeof globalThis!=='undefined'?globalThis:this);