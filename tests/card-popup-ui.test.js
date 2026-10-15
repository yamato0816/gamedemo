/* Run with: node tests/card-popup-ui.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const handlers=new Map();let token=0;
const callbacks=[];
function element(tag){
 const el={
  tagName:tag,style:{},children:[],attributes:{},parent:null,isConnected:false,textContent:'',
  className:'',
  setAttribute(k,v){this.attributes[k]=v;},
  append(...items){for(const x of items){x.parent=this;x.isConnected=this.isConnected;this.children.push(x);}},
  replaceChildren(...items){for(const c of this.children)c.isConnected=false;this.children=[];this.append(...items);},
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);}this.isConnected=false;},
  classList:{add(){}}
 };
 return el;
}
const body=element('body');body.isConnected=true;
const document={body,createElement:element};
const global={document,setTimeout:(fn)=>{const id=++token;handlers.set(id,fn);callbacks.push(id);return id;},clearTimeout:id=>handlers.delete(id)};
global.globalThis=global;
vm.createContext(global);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../card-popups.js'),'utf8'),global);
const api=global.ChaosPopups;
const event=(seq,text)=>({seq,title:'説明 '+seq,detail:text,icon:'⚡',theme:'danger',card:'カスタムカード'});
api.ingest('ROOM-A','game',[event(1,'<script>bad</script> & {bonus}'),event(2,'2番目')]);
assert.equal(body.children.length,1);
const overlay=body.children[0];
assert.equal(overlay.children.length,1);
const card=overlay.children[0];
assert.equal(card.className,'cr-popup-card cr-popup-danger');
assert.equal(card.children[2].children[2].textContent,'<script>bad</script> & {bonus}');
assert.equal(card.children[2].children[1].textContent,'説明 1');
assert.equal(card.children.length,3,'icon label and details only, no HTML injection');
api.ingest('ROOM-A','game',[event(1,'old'),event(2,'2番目')]);
assert.equal(overlay.children[0].children[2].children[1].textContent,'説明 1','same event should not repeat');
for(let i=0;i<2;i++){const id=callbacks.shift();if(handlers.has(id)){const fn=handlers.get(id);handlers.delete(id);fn();}}
assert.equal(overlay.children[0].children[2].children[1].textContent,'説明 2','new event is shown after animation');
api.ingest('ROOM-B','game',[]);
assert.equal(overlay.children.length,0,'room switch resets queue');
api.preview('自作プレビュー','Gold +1000','🪙','gold');
assert.equal(overlay.children[0].className,'cr-popup-card cr-popup-gold');
console.log('PASS: safe text-only popups, event deduplication, sequential animation and room reset');
