/* Run: node tests/relay-worker-large-popups.test.mjs
 * Worker must relay sizeable staged-animation snapshots instead of closing at 65k.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../relay-worker/src/worker.js',import.meta.url),'utf8');
const {RoomRelay}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
class FakeSocket{
 attachment=null;messages=[];closed=false;
 serializeAttachment(a){this.attachment=a}
 deserializeAttachment(){return this.attachment}
 send(json){this.messages.push(JSON.parse(json))}
 close(code){this.closed=code}
}
class Pair{constructor(){this[0]=new FakeSocket();this[1]=new FakeSocket()}}
class ResponseStub{constructor(body,opts){this.body=body;this.status=opts?.status||200;this.webSocket=opts?.webSocket}}
globalThis.WebSocketPair=Pair;
globalThis.Response=ResponseStub;
const sessions=[];
const relay=new RoomRelay({getWebSockets:()=>sessions,acceptWebSocket:s=>sessions.push(s)},{});
const req=(role,id)=>({url:'https://local/room/ABCDEF1?role='+role+'&id='+id});
assert.equal((await relay.fetch(req('host','host-test-0001'))).status,101);
assert.equal((await relay.fetch(req('guest','guest-test-001'))).status,101);
const host=sessions[0],guest=sessions[1];
const staged={room:'ABCDEF1',phase:'game',popupBusyUntil:123456789,
 customPopups:Array.from({length:12},(_,seq)=>({
  seq:seq+1,card:'CRフィーバー777',at:1000,durationMs:6000,
  stages:Array.from({length:12},(_,step)=>({
   title:'レインボー'+seq+'-'+step,detail:'当たり'.repeat(150),
   icon:'🌈',theme:'rainbow',duration:500
  }))
 }))};
const message=JSON.stringify({type:'state',to:'guest-test-001',state:staged});
assert.ok(message.length>65000&&message.length<262144,message.length+' should demonstrate the expanded limit');
relay.webSocketMessage(host,message);
assert.equal(host.closed,false);
assert.equal(guest.messages.at(-1).state.customPopups.length,12);
relay.webSocketMessage(host,'x'.repeat(262145));
assert.equal(host.closed,1009,'oversized payloads still blocked');
console.log('PASS staged animation state >65k relays safely, >256k is rejected');
