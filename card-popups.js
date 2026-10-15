/* CHAOS RELIC: synchronized designer popups.
   UI only. Server/game host constructs the event; all text uses textContent. */
(function(root){
'use strict';
let rootEl=null,cardEl=null,hideTimer=0,nextTimer=0;
let room='',phase='',seen=0,queue=[],running=false;
const THEMES=new Set(['magic','danger','success','gold','info']);
function ensure(){
 if(rootEl?.isConnected)return rootEl;
 rootEl=root.document.createElement('div');
 rootEl.id='cr-custom-popups';rootEl.className='cr-custom-popups';
 rootEl.setAttribute('aria-live','polite');rootEl.setAttribute('aria-atomic','true');
 root.document.body.appendChild(rootEl);return rootEl;
}
function clear(){
 root.clearTimeout(hideTimer);root.clearTimeout(nextTimer);
 rootEl?.replaceChildren();
 cardEl=null;running=false;queue=[];
}
function next(){
 if(running||!queue.length)return;
 const data=queue.shift();running=true;
 const host=ensure();
 const el=root.document.createElement('article');
 const theme=THEMES.has(data.theme)?data.theme:'magic';
 el.className='cr-popup-card cr-popup-'+theme;
 const edge=root.document.createElement('div');edge.className='cr-popup-edge';
 const icon=root.document.createElement('div');icon.className='cr-popup-icon';icon.textContent=String(data.icon||'✨').slice(0,12);
 const text=root.document.createElement('div');text.className='cr-popup-main';
 const label=root.document.createElement('span');label.className='cr-popup-label';label.textContent='✦ '+String(data.card||'CUSTOM EFFECT').slice(0,64);
 const title=root.document.createElement('strong');title.className='cr-popup-title';title.textContent=String(data.title||'特殊能力が発動！').slice(0,70);
 const detail=root.document.createElement('p');detail.className='cr-popup-detail';detail.textContent=String(data.detail||'').slice(0,420);
 text.append(label,title,detail);el.append(edge,icon,text);
 host.replaceChildren(el);cardEl=el;
 hideTimer=root.setTimeout(()=>{
  el.classList.add('cr-popup-out');
  nextTimer=root.setTimeout(()=>{
   if(el.isConnected)el.remove();
   running=false;cardEl=null;next();
  },360);
 },Math.min(4800,Math.max(2500,1300+String(data.detail||'').length*18)));
}
function enqueue(data){
 if(!data||typeof data!=='object')return;
 if(queue.length>=12)queue.shift();
 queue.push(data);next();
}
function ingest(roomId,gamePhase,events){
 const key=String(roomId||'');
 if(key!==room||gamePhase!==phase){
  room=key;phase=gamePhase;seen=0;clear();
 }
 if(gamePhase!=='game'||!Array.isArray(events))return;
 for(const event of [...events].filter(x=>x&&Number.isSafeInteger(x.seq)).sort((a,b)=>a.seq-b.seq)){
  if(event.seq<=seen)continue;
  seen=event.seq;enqueue(event);
 }
}
function preview(title,detail,icon='✨',theme='magic'){
 enqueue({title:String(title),detail:String(detail),icon:String(icon),theme,card:'工房プレビュー',at:Date.now()});
}
root.ChaosPopups={ingest,preview,clear};
})(typeof window!=='undefined'?window:globalThis);
