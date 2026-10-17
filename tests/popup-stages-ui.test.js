/* node tests/popup-stages-ui.test.js
 * Virtual DOM/clock verification for one popup morphing through multiple
 * text, icon and rainbow animation stages without replaying old events.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let clock=10000,seq=0;
class Clock extends Date{static now(){return clock;}}
const scheduled=new Map();
function later(fn,ms){const id=++seq;scheduled.set(id,{at:clock+Number(ms),fn});return id;}
function cancel(id){scheduled.delete(id);}
function advance(ms){
 const limit=clock+ms;
 for(let tries=0;tries<300;tries++){
  const ready=[...scheduled].filter(([,t])=>t.at<=limit).sort((a,b)=>a[1].at-b[1].at);
  if(!ready.length)break;
  const [id,task]=ready[0];
  scheduled.delete(id);clock=task.at;task.fn();
 }
 clock=limit;
}
function element(tag){
 const item={tagName:tag,children:[],style:{},attributes:{},parent:null,isConnected:false,
  textContent:'',className:'',id:'',
  setAttribute(key,value){this.attributes[key]=value;},
  append(...values){for(const child of values){child.parent=this;child.isConnected=this.isConnected;this.children.push(child);}},
  appendChild(value){this.append(value);return value;},
  replaceChildren(...children){for(const child of this.children)child.isConnected=false;this.children=[];this.append(...children);},
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.isConnected=false;},
  classList:{add(name){item.className+=' '+name;}}
 };
 return item;
}
const body=element('body');body.isConnected=true;
const ctx={console,Date:Clock,document:{body,createElement:element},setTimeout:later,clearTimeout:cancel};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../card-popups.js'),'utf8'),ctx);
const api=ctx.ChaosPopups;
const evt={seq:1,title:'図柄変動',detail:'？？？',icon:'🎰',theme:'neon',card:'確変777',
  at:clock,durationMs:1800,stages:[
   {title:'図柄変動',detail:'？？？',icon:'🎰',theme:'neon',duration:600},
   {title:'🌈 大当たり！',detail:'【7】【7】【7】',icon:'🌈',theme:'rainbow',duration:1200}
  ]};
api.ingest('GAME01','game',[evt],clock+1800);
const popupRoot=body.children.find(n=>n.id==='cr-custom-popups');
const shield=body.children.find(n=>n.id==='cr-popup-busy');
assert.ok(shield,'busy shield prevents clicks under the animation');
assert.ok(popupRoot);
const first=popupRoot.children[0];
assert.equal(first.className,'cr-popup-card cr-popup-neon');
assert.equal(first.children[1].textContent,'🎰');
assert.equal(first.children[2].children[1].textContent,'図柄変動');
assert.equal(first.children[2].children[2].textContent,'？？？');
assert.equal(api.isBusy(),true);
api.ingest('GAME01','game',[evt],clock+1800);
assert.equal(popupRoot.children.length,1,'duplicates should never restart the animation');
advance(599);
assert.equal(first.children[2].children[1].textContent,'図柄変動');
advance(1);
assert.equal(first.className,'cr-popup-card cr-popup-rainbow');
assert.equal(first.children[1].textContent,'🌈');
assert.equal(first.children[2].children[1].textContent,'🌈 大当たり！');
assert.equal(first.children[2].children[2].textContent,'【7】【7】【7】');
api.ingest('GAME01','finished',[evt],clock+1200);
assert.equal(popupRoot.children.length,1,'victory transition must not interrupt the finale');
advance(1200);
assert.ok(first.className.includes('cr-popup-out'),'finishing stage exits after its full duration');
advance(450);
assert.equal(api.isBusy(),false,'busy released after scheduled sequence ends');
assert.equal(popupRoot.children.length,0);
assert.ok(!body.children.some(n=>n.id==='cr-popup-busy'),'shield removed');
api.ingest('NEWROOM','game',[],0);
api.previewSequence([
 {title:'実行テスト',detail:'<img onerror=alert(1)>',icon:'⚡',theme:'aurora',duration:500},
 {title:'完成',detail:'100 Gold',icon:'👑',theme:'gold',duration:500}
]);
assert.equal(popupRoot.children[0].className,'cr-popup-card cr-popup-aurora');
assert.equal(popupRoot.children[0].children[2].children[2].textContent,'<img onerror=alert(1)>',
 'popup content is rendered as inert text');
advance(500);
assert.equal(popupRoot.children[0].className,'cr-popup-card cr-popup-gold');
api.clear();
assert.equal(api.isBusy(),false);
console.log('PASS multi-stage text/icon/gradient changes, host busy shield, finished-phase continuity, preview, XSS safety and timeout cleanup');
