/* CHAOS RELIC: synchronized staged card popups and client-side busy shield.
 * Host remains authoritative. Event stages contain RESOLVED text and fixed
 * durations, so replay, reconnect and multiplayer see identical outcomes.
 * All content is textContent, never interpreted as HTML.
 */
(function(root){
'use strict';
const THEMES=new Set(['magic','danger','success','gold','info','rainbow','aurora','sunset','neon']);
let rootEl=null,cardEl=null,busyShield=null,hideTimer=0,nextTimer=0,busyTimer=0;
let room='',phase='',seen=0,queue=[],running=false,serverBusyUntil=0;
const safeTheme=value=>THEMES.has(value)?value:'magic';
const stageDuration=value=>Math.max(200,Math.min(24000,Number(value)||2500));
function ensure(){
 if(rootEl?.isConnected)return rootEl;
 rootEl=root.document.createElement('div');
 rootEl.id='cr-custom-popups';rootEl.className='cr-custom-popups';
 rootEl.setAttribute('aria-live','polite');rootEl.setAttribute('aria-atomic','true');
 root.document.body.appendChild(rootEl);return rootEl;
}
function clear(){
 root.clearTimeout(hideTimer);root.clearTimeout(nextTimer);root.clearTimeout(busyTimer);
 rootEl?.replaceChildren();busyShield?.remove();busyShield=null;
 cardEl=null;running=false;queue=[];serverBusyUntil=0;
}
function isBusy(){return running||queue.length>0||serverBusyUntil> Date.now();}
function syncBusyUntil(until){
 serverBusyUntil=Math.max(0,Number(until)||0);
 root.clearTimeout(busyTimer);
 if(serverBusyUntil<=Date.now()){
  busyShield?.remove();busyShield=null;return;
 }
 if(!busyShield){
  busyShield=root.document.createElement('div');
  busyShield.id='cr-popup-busy';busyShield.className='cr-popup-busy';
  busyShield.setAttribute('role','status');busyShield.setAttribute('aria-label','演出中は操作を待機しています');
  const info=root.document.createElement('span');
  info.className='cr-popup-busy-label';info.textContent='🎬 演出中 · 操作は一時待機';
  busyShield.appendChild(info);root.document.body.appendChild(busyShield);
 }
 busyTimer=root.setTimeout(()=>{
  if(serverBusyUntil<=Date.now()){busyShield?.remove();busyShield=null;serverBusyUntil=0;}
 },Math.min(25000,Math.max(1,serverBusyUntil-Date.now()+25)));
}
function frames(data){
 if(Array.isArray(data.stages)&&data.stages.length){
  return data.stages.slice(0,12).map(item=>({
   title:String(item.title??data.title??'特殊能力が発動！').slice(0,70),
   detail:String(item.detail??data.detail??'').slice(0,420),
   icon:String(item.icon??data.icon??'✨').slice(0,12),
   theme:safeTheme(item.theme??data.theme),
   duration:stageDuration(item.duration)
  }));
 }
 return [{title:String(data.title||'特殊能力が発動！').slice(0,70),
  detail:String(data.detail||'').slice(0,420),
  icon:String(data.icon||'✨').slice(0,12),theme:safeTheme(data.theme),
  duration:Math.min(4800,Math.max(2500,1300+String(data.detail||'').length*18))}];
}
function next(){
 if(running||!queue.length)return;
 const data=queue.shift(),stages=frames(data);
 if(!stages.length)return next();
 running=true;
 const host=ensure(),el=root.document.createElement('article');
 const edge=root.document.createElement('div');edge.className='cr-popup-edge';
 const icon=root.document.createElement('div');icon.className='cr-popup-icon';
 const text=root.document.createElement('div');text.className='cr-popup-main';
 const label=root.document.createElement('span');label.className='cr-popup-label';
 label.textContent='✦ '+String(data.card||'CUSTOM EFFECT').slice(0,64);
 const title=root.document.createElement('strong');title.className='cr-popup-title';
 const detail=root.document.createElement('p');detail.className='cr-popup-detail';
 text.append(label,title,detail);el.append(edge,icon,text);
 host.replaceChildren(el);cardEl=el;
 let at=0;
 function show(frame,isFirst){
  el.className='cr-popup-card cr-popup-'+frame.theme;
  icon.textContent=frame.icon;title.textContent=frame.title;detail.textContent=frame.detail;
  if(!isFirst){
   // Restart the text/number animation without touching the popup container.
   title.style.animation='none';detail.style.animation='none';
   void title.offsetWidth;
   title.style.animation='cr-pop-stage-in .42s cubic-bezier(.22,1,.36,1) both';
   detail.style.animation='cr-pop-stage-in .52s ease-out both';
  }
 }
 function advance(){
  at++;
  if(at<stages.length){
   show(stages[at],false);
   hideTimer=root.setTimeout(advance,stages[at].duration);
  }else{
   el.classList.add('cr-popup-out');
   nextTimer=root.setTimeout(()=>{
    if(el.isConnected)el.remove();
    running=false;cardEl=null;next();
   },360);
  }
 }
 show(stages[0],true);
 hideTimer=root.setTimeout(advance,stages[0].duration);
}
function enqueue(data){
 if(!data||typeof data!=='object')return;
 if(queue.length>=12)queue.shift();
 queue.push(data);next();
}
function ingest(roomId,gamePhase,events,busyUntil=0){
 const key=String(roomId||'');
 // Keep the victory sequence visible when a finishing blow ends a match.
 // Reset between rooms, on lobby return, and on a NEW game after finished.
 const reset=key!==room||(gamePhase==='lobby'&&phase!=='lobby')||
   (gamePhase==='game'&&phase!=='game');
 if(reset){room=key;seen=0;clear();}
 phase=gamePhase;
 if(gamePhase!=='game'&&gamePhase!=='finished'){
  syncBusyUntil(0);return;
 }
 if(Array.isArray(events)){
  for(const event of [...events].filter(x=>x&&Number.isSafeInteger(x.seq)).sort((a,b)=>a.seq-b.seq)){
   if(event.seq<=seen)continue;
   seen=event.seq;
   // An old checkpoint may contain already-expired animations. Do not
   // replay those when reconnecting many minutes later.
   if(event.durationMs&&event.at&&Date.now()>event.at+event.durationMs+6000)continue;
   enqueue(event);
  }
 }
 syncBusyUntil(busyUntil);
}
function previewSequence(stages,card='工房プレビュー'){
 if(!Array.isArray(stages)||!stages.length)return;
 const first=stages[0];
 enqueue({title:first.title,detail:first.detail,icon:first.icon,theme:first.theme,
  card,stages:stages.slice(0,12),at:Date.now()});
}
function preview(title,detail,icon='✨',theme='magic',duration=1900){
 previewSequence([{title:String(title),detail:String(detail),icon:String(icon),theme,duration}]);
}
root.ChaosPopups={ingest,preview,previewSequence,clear,isBusy};
})(typeof window!=='undefined'?window:globalThis);
