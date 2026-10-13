import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../relay-worker/src/worker.js',import.meta.url),'utf8');
const {RoomRelay}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
class FakeSocket{attachment=null;sent=[];serializeAttachment(x){this.attachment=x;}deserializeAttachment(){return this.attachment;}send(v){this.sent.push(JSON.parse(v))}close(){this.closed=true;}}
class FakePair{constructor(){this[0]=new FakeSocket();this[1]=new FakeSocket();}}
class FakeResponse{constructor(body,cfg){this.body=body;this.status=cfg?.status||200;this.webSocket=cfg?.webSocket;}}
globalThis.WebSocketPair=FakePair;globalThis.Response=FakeResponse;
const sessions=[];const relay=new RoomRelay({getWebSockets:()=>sessions,acceptWebSocket:x=>sessions.push(x)},{});
const req=(role,id)=>({url:'https://local/room/ABCDEFG?role='+role+'&id='+id});
assert.equal((await relay.fetch(req('guest','guest-first'))).status,404);
assert.equal((await relay.fetch(req('host','host-abc123'))).status,101);
assert.equal((await relay.fetch(req('host','host-other'))).status,409);
assert.equal((await relay.fetch(req('guest','guest-xyz123'))).status,101);
const host=sessions[0],guest=sessions[1];
relay.webSocketMessage(guest,JSON.stringify({type:'hello',name:'Visitor'}));
assert.equal(host.sent.at(-1).from,'guest-xyz123');
relay.webSocketMessage(guest,JSON.stringify({type:'action',action:{type:'pass'}}));
assert.equal(host.sent.at(-1).type,'action');
relay.webSocketMessage(host,JSON.stringify({type:'state',to:'guest-xyz123',state:{room:'ABCDEFG'}}));
assert.equal(guest.sent.at(-1).state.room,'ABCDEFG');
relay.webSocketMessage(guest,JSON.stringify({type:'state',to:'host-abc123',state:{fake:true}}));
assert.equal(host.sent.filter(m=>m.type==='state').length,0);
console.log('PASS: room routing, authorisation and states');
