(function(){
const bc=new BroadcastChannel('chaos-relic-test-signaling-v1');
const listeners=new Map();const id=()=> 'test-'+Math.random().toString(36).slice(2,11);
class MockConn{
 constructor(local,peer,channel){this.local=local;this.peer=peer;this.channel=channel;this.open=false;this.listeners={};}
 on(event,fn){(this.listeners[event]||=([])).push(fn);return this;}
 emit(event,...args){(this.listeners[event]||[]).forEach(fn=>fn(...args));}
 send(data){bc.postMessage({to:this.peer,from:this.local,channel:this.channel,kind:'data',data});}
 close(){if(!this.open)return;this.open=false;bc.postMessage({to:this.peer,from:this.local,channel:this.channel,kind:'close'});this.emit('close');}
}
class Peer{
 constructor(spec){this.id=typeof spec==='string'?spec:id();this.listeners={};this.cons=new Map();listeners.set(this.id,this);setTimeout(()=>this.emit('open',this.id),45);}
 on(event,fn){(this.listeners[event]||=([])).push(fn);return this;}
 emit(event,...args){(this.listeners[event]||[]).forEach(fn=>fn(...args));}
 connect(peer){const ch=id();const conn=new MockConn(this.id,peer,ch);this.cons.set(ch,conn);bc.postMessage({to:peer,from:this.id,channel:ch,kind:'connect'});return conn;}
 destroy(){listeners.delete(this.id);for(const c of this.cons.values())c.close();}
}
bc.addEventListener('message',e=>{const m=e.data,peer=listeners.get(m.to);if(!peer)return;
  if(m.kind==='connect'){const conn=new MockConn(peer.id,m.from,m.channel);peer.cons.set(m.channel,conn);peer.emit('connection',conn);conn.open=true;bc.postMessage({to:m.from,from:peer.id,channel:m.channel,kind:'opened'});}
  else if(m.kind==='opened'){const conn=peer.cons.get(m.channel);if(conn){conn.open=true;conn.emit('open');}}
  else if(m.kind==='data'){const conn=peer.cons.get(m.channel);if(conn)setTimeout(()=>conn.emit('data',m.data),10);}
  else if(m.kind==='close'){const conn=peer.cons.get(m.channel);if(conn){conn.open=false;conn.emit('close');}}
});
window.Peer=Peer;
})();
