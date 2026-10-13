/* CHAOS RELIC — visible eliminations and tactical gold shop */
(function(){
'use strict';
const stock=[
 {key:'mana',icon:'💠',name:'魔力の瓶',cost:5,note:'MPを10回復'},
 {key:'heal',icon:'💚',name:'命の薬',cost:7,note:'HPを8回復'},
 {key:'shield',icon:'🛡️',name:'守護障壁',cost:9,note:'バリアを12追加'},
 {key:'draw',icon:'🎴',name:'追加ドロー',cost:9,note:'札を3枚引く'},
 {key:'cleanse',icon:'✨',name:'状態浄化',cost:6,note:'状態異常を全解除'},
 {key:'sabotage',icon:'🕵️',name:'魔力泥棒',cost:12,note:'標的のMPを最大8奪う'}
];
function self(){return state?.players?.find(p=>p.id===state.me)}
let priorElimination=0,deathTimer=0;
const originalBattle=battle;
battle=function(){
 let html=originalBattle();
 const p=self();
 if(!p||state?.phase!=='game')return html;
 const used=!!p.shopUsed,allowed=amTurn()&&!used;
 const panel='<div class="gf-market-bar"><div><b>🪙 所持金 ¥'+p.gold+'</b><small>毎ターン1回、購入後も攻撃できます</small></div><button data-market-action="open" '+(allowed?'':'disabled')+'>'+(used?'購入済み':amTurn()?'🏪 お店':'🏪 お店（手番のみ）')+'</button></div>';
 html=html.replace('<div class="gf-controls gf-compact-controls">',panel+'<div class="gf-controls gf-compact-controls">');
 if(p.hp<=0){
  html=html.replace('<div class="gf-compact-scores">','<div class="gf-death-banner" role="status"><b>💀 あなたは脱落しました</b><span>残りの対戦はこのまま観戦できます</span></div><div class="gf-compact-scores">');
 }
 return html;
};
const originalFinished=finished;
finished=function(){
 const winner=state?.players?.find(p=>p.id===state.winner);
 const mine=winner?.id===state?.me;
 const heading=winner?(mine?'🏆 優勝！':'🏆 '+e(winner.name)+' の勝利！'):'☠ 全員脱落！';
 const scores=(state?.players||[]).map(p=>'<div class="gf-final-player '+(p.hp>0?'alive':'dead')+'"><span>'+(p.hp>0?'🏆':'☠')+'</span><b>'+e(p.name)+'</b><small>'+(p.hp>0?'生存':'脱落')+' · HP '+p.hp+'</small></div>').join('');
 return '<div class="gf-final-summary"><h2>'+heading+'</h2><p>'+(mine?'最後まで生き残りました！':'今回の戦いは終了です')+'</p><div class="gf-final-list">'+scores+'</div></div>'+originalFinished();
};
function markDead(){
 if(state?.phase!=='game')return;
 const entries=document.querySelectorAll('.gf-compact-scores .gf-small-score');
 entries.forEach((el,i)=>{
  const p=state.players[i];
  if(!p||p.hp>0)return;
  el.classList.add('gf-ko-player');
  const badge=document.createElement('span');
  badge.className='gf-ko-tag';badge.textContent='☠ 脱落';
  el.appendChild(badge);
 });
}
function announceDeath(){
 const n=state?.lastElimination;
 if(!n?.seq){priorElimination=0;return}
 if(priorElimination===n.seq)return;
 priorElimination=n.seq;
 document.getElementById('gf-elimination-splash')?.remove();
 const mine=n.id===state.me, remaining=state.players.filter(p=>p.hp>0).length;
 const node=document.createElement('div');
 node.id='gf-elimination-splash';
 node.setAttribute('role','status');
 node.innerHTML='<div class="gf-ko-veil"></div><div class="gf-ko-hero"><span>💀</span><strong>'+(mine?'あなたは脱落！':e(n.name)+' が脱落！')+'</strong><small>'+e(n.cause||'HPが0になりました')+'</small><b>残り '+remaining+' 人</b></div>';
 document.body.appendChild(node);
 clearTimeout(deathTimer);
 deathTimer=setTimeout(()=>node.remove(),2600);
}
const previousRender=render;
render=function(){
 previousRender();
 markDead();
 announceDeath();
};
function closeShop(){document.getElementById('gf-market-dialog')?.remove()}
function openShop(){
 closeShop();const p=self();
 if(!p||!amTurn()){toast('購入できるのは自分の手番だけです',true);return}
 if(p.shopUsed){toast('この手番では購入済みです',true);return}
 const selected=state?.players.find(x=>x.id===target&&x.hp>0&&x.id!==state.me);
 const options=stock.map(item=>{
  const disabled=p.gold<item.cost||(item.key==='sabotage'&&!selected);
  return '<button class="gf-market-item" data-market-action="buy" data-item="'+item.key+'" '+(disabled?'disabled':'')+'><span>'+item.icon+'</span><b>'+item.name+'<small>'+item.note+'</small></b><strong>¥'+item.cost+'</strong></button>';
 }).join('');
 const el=document.createElement('div');el.id='gf-market-dialog';
 el.innerHTML='<div class="gf-market-shade" data-market-action="close"></div><section class="gf-market-sheet" role="dialog" aria-modal="true" aria-label="お店"><header><h2>🏪 カオス市場</h2><button data-market-action="close" aria-label="閉じる">×</button></header><p>所持金 <b>¥'+p.gold+'</b> · 自分の手番に1回購入できます。購入しても手番は終了しません。</p><div class="gf-market-grid">'+options+'</div><small>魔力泥棒は現在選択している相手（'+e(selected?.name||'標的未選択')+'）に発動します。</small></section>';
 document.body.appendChild(el);
}
document.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-market-action]');if(!btn)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const a=btn.dataset.marketAction;
 if(a==='open')return openShop();
 if(a==='close')return closeShop();
 if(a==='buy'){
  try{net.act({type:'shop',item:btn.dataset.item,target});closeShop()}
  catch(err){toast(err.message||'購入に失敗しました',true)}
 }
},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeShop()});
render();
})();