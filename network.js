/* シグナリングのみPeerJS Cloud、対戦データはWebRTC DataChannel */
(function(root){
'use strict';
const sanitizeName=n=>String(n||'旅人').replace(/[<>\r\n]/g,'').trim().slice(0,14)||'旅人';
const PREFIX='chaosrelic26-';
// Use local cryptographic IDs for guests too: no /peerjs/id request (which can return 404).
const randomPeerId=()=>{
 const alphabet='abcdefghjkmnpqrstuvwxyz23456789';
 const entropy=crypto.getRandomValues(new Uint8Array(18));
 return PREFIX+'guest-'+Array.from(entropy,n=>alphabet[n%alphabet.length]).join('');
};
const explainPeerError=err=>{
 const kind=err?.type||'';
 if(kind==='peer-unavailable')return '部屋が見つかりません。部屋コードとホストの接続を確認してください';
 if(kind==='unavailable-id')return '通信IDが既に使用されています。もう一度お試しください';
 if(['network','server-error','socket-error','socket-closed','ssl-unavailable'].includes(kind))return 'PeerJSシグナリングサーバーに接続できません。ネットワーク設定を確認してください ('+kind+')';
 return String(err?.message||err||'不明な通信エラー');
};
class Online{
 constructor({onState,onInfo,onError,onClosed}){
  const invited=(typeof location!=='undefined')?new URLSearchParams(location.search).get('transport'):null;
  if(invited==='firebase')localStorage.setItem('cr_transport_mode','firebase');
  const transport=localStorage.getItem('cr_transport_mode');
  if(transport==='firebase'){
   if(typeof FirebaseOnline!=='function')throw Error('Firebase通信ライブラリが見つかりません');
   return new FirebaseOnline({onState,onInfo,onError,onClosed});
  }
  if((transport==='relay'||(!transport&&localStorage.getItem('cr_relay_url')))&&typeof RelayOnline==='function')
   return new RelayOnline({onState,onInfo,onError,onClosed});
  Object.assign(this,{onState,onInfo,onError,onClosed});this.peer=null;this.connection=null;this.connections=new Map();this.room=null;this.code='';this.isHost=false;this.name='';this.clock=null;this.lastStamp='';this.ready=false;this.heartbeat=0;
 }
 _makePeer(id){
  if(typeof Peer!=='function')throw Error('PeerJSを読み込めません。ネット接続と広告ブロック設定を確認してください');
  return new Peer(id,{debug:1,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]}});
 }
 create(name){return new Promise((resolve,reject)=>{
  this.disconnect();this.name=sanitizeName(name);this.code=Array.from(crypto.getRandomValues(new Uint8Array(7)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');
  this.isHost=true;let settled=false;const wait=setTimeout(()=>{if(!settled){settled=true;this.disconnect();reject(Error('P2Pサーバーへの接続がタイムアウトしました（20秒）。ネットワークまたはシグナリングサーバーを確認してください'));}},20000);
  try{this.peer=this._makePeer(PREFIX+this.code.toLowerCase());}catch(e){clearTimeout(wait);reject(e);return;}
  this.peer.on('open',id=>{
   this.ready=true;this.room=GameEngine.create(this.code,id,this.name);this.onInfo('P2P ホスト接続中');this._broadcast();
   this.clock=setInterval(()=>{if(!this.room)return;const snap=JSON.stringify({round:this.room.round,phase:this.room.phase,turn:this.room.turnIndex,pending:this.room.pending,deadline:this.room.deadline,log:this.room.log,players:this.room.players.map(p=>[p.hp,p.status,p.mp,p.gold,p.guardian])});GameEngine.settle(this.room);const snap2=JSON.stringify({round:this.room.round,phase:this.room.phase,turn:this.room.turnIndex,pending:this.room.pending,deadline:this.room.deadline,log:this.room.log,players:this.room.players.map(p=>[p.hp,p.status,p.mp,p.gold,p.guardian])});if(snap!==snap2||(++this.heartbeat%5===0))this._broadcast();},950);
   settled=true;clearTimeout(wait);resolve(this.code);
  });
  this.peer.on('connection',conn=>this._accept(conn));
  this.peer.on('error',err=>{this.onError('接続エラー: '+explainPeerError(err));if(!settled){settled=true;clearTimeout(wait);reject(Error(explainPeerError(err)));}});
  this.peer.on('disconnected',()=>this.onInfo('接続先を再探索中'));
 });}
 join(code,name){return new Promise((resolve,reject)=>{
  this.disconnect();this.isHost=false;this.name=sanitizeName(name);this.code=String(code).trim().toUpperCase();
  if(!/^[A-HJ-NP-Z2-9]{7}$/.test(this.code)){reject(Error('部屋コードは7文字です'));return;}
  let settled=false;const wait=setTimeout(()=>{if(!settled){settled=true;this.disconnect();reject(Error('接続がタイムアウトしました（20秒）。部屋コード・ホスト・NAT設定を確認してください'));}},20000);
  try{this.peer=this._makePeer(randomPeerId());}catch(e){clearTimeout(wait);reject(e);return;}
  this.peer.on('open',()=>{
    this.onInfo('ホストに接続しています…');
    const conn=this.peer.connect(PREFIX+this.code.toLowerCase(),{reliable:true,serialization:'json'});this.connection=conn;
    conn.on('open',()=>{this.onInfo('参加情報を送信中…');conn.send({type:'hello',name:this.name});});
    conn.on('data',data=>{
      if(data?.type==='state'&&data.state){this.ready=true;this.onInfo('P2P 直接接続');this.onState(data.state);if(!settled){settled=true;clearTimeout(wait);resolve(this.code);}}
      if(data?.type==='error'){this.onError(data.message||'対戦エラー');if(!settled){settled=true;clearTimeout(wait);reject(Error(data.message));}}
      if(data?.type==='closed'){this.onClosed('ホストが部屋を閉じました');}
    });
    conn.on('close',()=>{this.ready=false;this.onClosed('ホストとの接続が切れました');});
    conn.on('error',err=>{this.onError(err.message);if(!settled){settled=true;clearTimeout(wait);reject(err);}});
    // Timeout covers both signaling and WebRTC negotiations.
  });
  this.peer.on('error',err=>{this.onError('PeerJS: '+explainPeerError(err));if(!settled){settled=true;clearTimeout(wait);reject(Error(explainPeerError(err)));}});
 });}
 _accept(conn){
  conn.on('data',msg=>{
    if(!msg||typeof msg!=='object'||Array.isArray(msg))return;
    if(msg.type==='hello'){
      try{
        if(!this.room)throw Error('部屋が存在しません');
        GameEngine.join(this.room,conn.peer,sanitizeName(msg.name));this.connections.set(conn.peer,conn);
        const p=this.room.players.find(p=>p.id===conn.peer);if(p)p.lastSeen=Date.now();this._broadcast();
      }catch(e){conn.send({type:'error',message:e.message});setTimeout(()=>conn.close(),200);}
      return;
    }
    if(!this.connections.has(conn.peer))return;
    if(msg.type!=='action'||!msg.action||typeof msg.action!=='object')return;
    const a=msg.action;const actions=['publish','removeCard','bot','start','reset','leave','defend','attack','use','pray','trade','shop','pass'];
    if(!actions.includes(a.type))return;
    try{
      const data=JSON.stringify(a);if(data.length>262144)throw Error('メッセージが大きすぎます');
      const p=this.room.players.find(p=>p.id===conn.peer);if(p)p.lastSeen=Date.now();
      GameEngine.apply(this.room,conn.peer,a);this._broadcast();
      if(a.type==='leave')conn.close();
    }catch(e){conn.send({type:'error',message:e.message});}
  });
  conn.on('close',()=>{this.connections.delete(conn.peer);if(!this.room)return;
    const p=this.room.players.find(p=>p.id===conn.peer);if(p){if(this.room.phase==='lobby'||this.room.phase==='finished')GameEngine.leave(this.room,conn.peer);else {p.lastSeen=0;/* 一時切断なら試合中の席は保持 */}this._broadcast();}
  });
  conn.on('error',err=>this.onError(err.message));
 }
 _broadcast(){if(!this.room)return;
  GameEngine.settle(this.room);
  for(const [id,conn] of this.connections){if(conn.open){const p=this.room.players.find(p=>p.id===id);if(p)p.lastSeen=Date.now();}}
  const s=GameEngine.view(this.room,this.room.host);if(s)this.onState(s);
  for(const [id,conn] of this.connections){if(conn.open){const view=GameEngine.view(this.room,id);if(view)conn.send({type:'state',state:view});}}
 }
 act(action){
  if(!this.ready)throw Error('対戦に接続していません');
  if(this.isHost){GameEngine.apply(this.room,this.room.host,action);this._broadcast();}
  else if(this.connection?.open)this.connection.send({type:'action',action});
  else throw Error('ホストに接続していません');
 }
 disconnect(){
  clearInterval(this.clock);this.clock=null;
  if(this.isHost&&this.room)for(const conn of this.connections.values())if(conn.open)conn.send({type:'closed'});
  this.connections.forEach(c=>{try{c.close();}catch{}});this.connections.clear();
  if(this.connection){try{this.connection.close();}catch{}}this.connection=null;
  if(this.peer){try{this.peer.destroy();}catch{}}this.peer=null;
  this.room=null;this.ready=false;this.isHost=false;
 }
}
root.Online=Online;
})(typeof globalThis!=='undefined'?globalThis:this);
