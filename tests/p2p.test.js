const vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const registry=new Map();
let serial=0;
class Evented{
 constructor(){this.listeners={}}
 on(event,cb){(this.listeners[event]||=[]).push(cb);return this}
 emit(event,...args){for(const cb of (this.listeners[event]||[]))cb(...args)}
}
class Conn extends Evented{
 constructor(peer){super();this.peer=peer;this.open=false;this.other=null}
 send(data){if(this.open&&this.other?.open)setTimeout(()=>this.other.emit('data',JSON.parse(JSON.stringify(data))),1)}
 close(){if(!this.open)return;this.open=false;this.emit('close');if(this.other?.open){this.other.open=false;this.other.emit('close')}}
}
class Peer extends Evented{
 constructor(id){super();assert.equal(typeof id,'string','PeerJS peers must supply local IDs to avoid /peerjs/id 404');this.id=id;registry.set(this.id,this);setTimeout(()=>this.emit('open',this.id),1)}
 connect(dest){const remote=registry.get(dest);const a=new Conn(dest),b=new Conn(this.id);a.other=b;b.other=a;
  setTimeout(()=>{if(!remote){this.emit('error',Error('peer-unavailable'));return;}remote.emit('connection',b);a.open=true;b.open=true;a.emit('open');b.emit('open')},3);
  return a;
 }
 destroy(){registry.delete(this.id)}
}
const ctx=vm.createContext({crypto,Math,Date,console,Peer,setInterval,clearInterval,setTimeout,clearTimeout});
for(const f of ['pycards.js','engine.js','network.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+f,'utf8'),ctx);
const {Online}=ctx;
async function test(){
 let hostView,guestView,warning=[];
 const host=new Online({onState:s=>hostView=s,onInfo:()=>{},onError:s=>warning.push(s),onClosed:()=>{}});
 const guest=new Online({onState:s=>guestView=s,onInfo:()=>{},onError:s=>warning.push(s),onClosed:()=>{}});
 try{
  const code=await host.create('店長');assert.equal(code.length,7);
  await guest.join(code,'勇者');assert.equal(hostView.players.length,2);assert.equal(guestView.players.length,2);
  assert.equal(hostView.me,host.room.host);assert.notEqual(hostView.me,guestView.me);
  console.log('✓ handshake',code);
  const source='def on_play():\n    power = randint(4, 4)\n    damage("target", power)';
  guest.act({type:'publish',card:{type:'item',name:'試験特製カード',emoji:'✨',power:1,effect:'heal',cost:0,script:source}});
  await new Promise(r=>setTimeout(r,60));
  assert.equal(hostView.customCards.length,1);assert.equal(guestView.customCards.length,1);
  host.act({type:'start'});await new Promise(r=>setTimeout(r,40));
  assert.equal(hostView.phase,'game');assert.equal(guestView.phase,'game');
  assert.equal(hostView.hand.length,9);assert.equal(guestView.hand.length,9);
  assert.deepEqual(warning,[]);
  console.log('✓ shared custom cards + synchronized game + private hands');
 }finally{host.disconnect();guest.disconnect();}
}
test().then(()=>console.log('P2P MOCK PASSED')).catch(ex=>{console.error(ex);process.exitCode=1});
