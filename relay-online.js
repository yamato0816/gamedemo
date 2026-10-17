/* Optional WebSocket relay (Cloudflare Durable Objects): room host remains authoritative. */
(function(root){'use strict';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(7)),n=>alphabet[n%alphabet.length]).join('');
const makeId=()=>crypto.randomUUID().replace(/-/g,'').slice(0,22);
class RelayOnline {
 constructor({onState,onInfo,onError,onClosed}){Object.assign(this,{onState,onInfo,onError,onClosed});this.socket=null;this.isHost=false;this.ready=false;this.room=null;this.code='';this.clock=null;this.peers=new Set();this.heartbeat=0;this.lastPopupBusy=0;this.id='';}
 url(role){const base=root.ChaosTransport?.relayUrl()||'';if(!/^wss:\/\//i.test(base||''))throw Error('通信設定に wss:// の中継URLを指定してください');return base.replace(/\/$/,'')+'/room/'+this.code+'?role='+role+'&id='+this.id;}
 _open(role,name){return new Promise((resolve,reject)=>{
   let finished=false;const settle=err=>{if(finished)return;finished=true;clearTimeout(timeout);if(err)reject(err);else resolve(this.code);};
   let ws;try{ws=new WebSocket(this.url(role));}catch(err){reject(err);return;}this.socket=ws;
   const timeout=setTimeout(()=>{settle(Error('中継への接続がタイムアウトしました。Worker URLまたはネットワーク設定を確認してください'));this.disconnect();},18000);
   ws.onopen=()=>this.onInfo('中継へ接続しています');
   ws.onmessage=ev=>{let msg;try{msg=JSON.parse(ev.data)}catch{return;}if(!msg||typeof msg!=='object')return;
      if(msg.type==='ready'){
        if(this.isHost){this.room=GameEngine.create(this.code,this.id,name);this.ready=true;this.onInfo('WSS中継（ホスト）');this._broadcast();this.clock=setInterval(()=>{if(this.room){GameEngine.settle(this.room);if(++this.heartbeat%2===0)this._broadcast();}},1000);settle();}
        else{this.onInfo('ホストを探しています');ws.send(JSON.stringify({type:'hello',name}));}
      }else if(msg.type==='state'&&!this.isHost){this.ready=true;this.onState(msg.state);this.onInfo('WSS中継に接続');settle();}
      else if(msg.type==='hello'&&this.isHost){try{GameEngine.join(this.room,msg.from,String(msg.name||'旅人').slice(0,14));this.peers.add(msg.from);this._broadcast();}catch(err){this.onError(err.message);}}
      else if(msg.type==='action'&&this.isHost&&this.peers.has(msg.from)){try{if(JSON.stringify(msg.action).length>262144)throw Error('操作が長すぎます');GameEngine.apply(this.room,msg.from,msg.action);this._broadcast();}catch(err){this.onError(err.message);}}
      else if(msg.type==='guest_left'&&this.isHost){this.peers.delete(msg.from);if(['lobby','finished'].includes(this.room.phase))GameEngine.leave(this.room,msg.from);else{const p=this.room.players.find(p=>p.id===msg.from);if(p)p.lastSeen=0;}this._broadcast();}
      else if(msg.type==='closed')this.onClosed('ホストが部屋を閉じました');
   };
   ws.onerror=()=>this.onError('中継サーバーへの接続に失敗。URLを確認してください');
   ws.onclose=ev=>{this.ready=false;clearInterval(this.clock);if(!finished)settle(Error('WSS接続が切れました（'+ev.code+'）'));else this.onClosed('中継通信が切れました');};
 });}
 create(name){this.disconnect();this.code=generateCode();this.id='host-'+makeId();this.isHost=true;return this._open('host',String(name||'旅人').slice(0,14));}
 join(roomCode,name){this.disconnect();this.code=String(roomCode||'').trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{7}$/.test(this.code))return Promise.reject(Error('部屋コードは7文字です'));this.id='guest-'+makeId();this.isHost=false;return this._open('guest',String(name||'旅人').slice(0,14));}
 _broadcast(){if(!this.room||this.socket?.readyState!==1)return;GameEngine.settle(this.room);const own=GameEngine.view(this.room,this.id);if(own)this.onState(own);for(const id of this.peers){const view=GameEngine.view(this.room,id);if(view)this.socket.send(JSON.stringify({type:'state',to:id,state:view}));}}
 act(action){if(!this.ready)throw Error('通信が未接続です');if(this.isHost){GameEngine.apply(this.room,this.id,action);this._broadcast();}else if(this.socket?.readyState===1)this.socket.send(JSON.stringify({type:'action',action}));else throw Error('中継が切れています');}
 disconnect(){clearInterval(this.clock);this.clock=null;this.peers.clear();if(this.socket){try{if(this.isHost&&this.socket.readyState===1)this.socket.send(JSON.stringify({type:'closed'}));this.socket.close()}catch{}}this.socket=null;this.room=null;this.ready=false;this.isHost=false;}
}
root.RelayOnline=RelayOnline;
})(typeof globalThis!=='undefined'?globalThis:this);
