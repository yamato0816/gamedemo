(function gfExperience(){
'use strict';
const action=(label,kind,extra='')=>`<button class="${kind}" data-action="${extra||kind}">${label}</button>`;
const iconMap={phoenix:'🦅',turtle:'🐢',sprite:'🧚',storm:'⚡',muse:'🌙'};
const statuses={poison:['☠','毒','自分の手番開始時に2ダメージ'],burn:['🔥','炎上','自分の手番開始時に3ダメージ'],freeze:['❄','凍結','次の行動ができなくなる'],curse:['◈','呪い','自分の手番開始時にMPが2減る'],weak:['↓','弱体','次の攻撃威力が3減る']};
const gods={phoenix:['不死鳥','倒れると一度だけHP8で復活'],turtle:['玄武','受けるダメージを3軽減'],sprite:['妖精','手番開始時にHPを3回復'],storm:['雷神','攻撃を受けると相手へ2ダメージ'],muse:['月の女神','手番開始時にMPを3回復']};
const omens={blessing:['天の祝福','全員がHPを5回復'],meteor:['流星雨','全員が4ダメージを受ける'],exchange:['資源の逆転','MPとお金が入れ替わる'],silence:['静寂','全員のMPが3減る'],fog:['深い霧','全員に弱体を2付与'],mana_rain:['魔力の雨','全員のMPが5増える'],earthquake:['地鳴り','全員に3ダメージ'],random:['未知の現象','ランダムな超常現象が発生']};
const descriptions={guard_hunt:'相手が持つ防御札の枚数×この札の威力',normal:'基本的な攻撃・防御',reflect:'完全防御時に相手へ反射ダメージ',counter:'完全防御時に相手へ反撃',pierce:'防御値を一部無視する',drain:'与えたダメージでHP吸収',splash:'周囲にも巻き添えダメージ',wild:'確率で強化または空振り',burn:'炎上を付与',poison:'毒を付与',freeze:'凍結を付与',curse:'呪いを付与',heal:'HPを回復',mana:'MPを回復',gold:'お金を増やす',draw:'手札を補充',cleanse:'状態異常を解除',lottery:'お金が増減するくじ',blast:'攻撃魔法',hex:'ランダムな呪い',phoenix:'不死鳥の守護',turtle:'玄武の守護',sprite:'妖精の守護',storm:'雷神の守護',muse:'月の女神の守護',random:'ランダムな超常現象',blessing:'祝福',meteor:'流星雨',exchange:'資源の交換',reflect_full:'受けた攻撃を全威力で相手に返す',reflect_double:'受けた攻撃を2倍にして相手へ返す',redirect:'攻撃をランダムなほかのプレイヤーに転送',scatter:'攻撃を最大3人に分散する',nullify:'どんな攻撃も無効化する',absorb:'攻撃ダメージからMPを得る',chain:'攻撃命中時に周囲へ連鎖ダメージ',double_hit:'攻撃命中時に追加攻撃',siphon:'攻撃命中で相手のMPを奪う',swap_hp:'選んだ相手とHPを交換',mass_poison:'ほかの全員を毒にする',steal_mp:'相手のMPを奪う',scramble:'全員の手札を引き直させる'};
function gfScore(p) {
 const stats=Object.entries(statuses).filter(([k])=>(p[k]||0)>0).map(([k,v])=>`<span class="gf-status" title="${e(v[1]+': '+v[2])}">${v[0]}${p[k]}</span>`).join('');
 const targetable=p.id!==state.me&&p.hp>0;
 return `<button class="gf-score ${p.id===state.me?'mine':''} ${p.id===state.turn?'turn':''} ${p.id===target?'target':''}" ${targetable?`data-action="target" data-id="${e(p.id)}"`:'disabled'}><span class="gf-light"></span><b>${e(p.name)}</b><span class="gf-numbers">HP <strong>${p.hp}</strong>　MP <strong>${p.mp}</strong>　¥ <strong>${p.gold}</strong></span><span class="gf-effects">${p.guardian?`<span title="守護神">👼${e(gods[p.guardian.kind]?.[0]||'守護神')}</span>`:''}${stats}${p.shield?`<span>🛡${p.shield}</span>`:''}</span></button>`;
}
function gfTopCard(c){
 return `<div class="gf-top-card ${e(c?.type||'attack')}"><span>${e(c?.emoji||'🃏')}</span><strong>${e(c?.name||'待機中')}</strong><small>${c?.power?'威力 '+c.power:''}</small></div>`;
}
function gfFighter(p,label,cards) {
 return `<div class="gf-fighter"><div class="gf-fighter-title"><span class="gf-mark"></span>${e(p?.name||'待機中')}</div><small>${label}</small><div class="gf-played-cards">${cards?.length?cards.slice(0,3).map(gfTopCard).join(''):gfTopCard(null)}</div></div>`;
}
let gfHoldTimer=0,gfWasHold=false,gfInfoUid='';
const gfCardKind={attack:['⚔','攻撃札'],defense:['🛡','防御札'],magic:['✦','奇跡札'],item:['🧪','道具札'],guardian:['👼','守護神札'],omen:['☄','超常現象札']};
function gfCompactNum(n){const x=Number(n)||0;return Math.abs(x)>=1000?x.toLocaleString('ja-JP',{notation:'compact',maximumFractionDigits:1}):String(x);}
function gfCardIcon(c,enabled){
 const active=chosen.has(c.uid);
 const kind=gfCardKind[c.type]||['?','不明な札'];
 return `<button class="gf-compact-card ${e(c.type)} ${active?'picked':''} ${enabled?'usable':'unusable'}" data-gf-action="card" data-id="${e(c.uid)}" title="${e(c.name)} / ${c.power?'威力'+c.power:'特殊'} / ${c.cost?'消費MP'+c.cost:'無料'}" aria-label="${e(c.name)}（長押しで詳細）" aria-pressed="${active}"><span class="gf-card-type-icon" aria-hidden="true" title="${e(kind[1])}">${e(kind[0])}</span><span class="gf-card-em">${e(c.emoji||'🃏')}</span>${c.power?`<b class="gf-card-pow">${c.type==='defense'?'守':'攻'}${gfCompactNum(c.power)}</b>`:''}${c.cost?`<small class="gf-card-mp">${c.resource==='gold'?'¥':'◆'}${c.cost}</small>`:''}</button>`;
}
function gfCardInfo(id){
 const c=state?.hand.find(c=>c.uid===id);if(!c)return;
 document.getElementById('gf-inspect')?.remove();
 const el=document.createElement('div');el.id='gf-inspect';el.className='gf-inspect';
 const description=c.description||descriptions[c.effect]||'特殊効果';
 el.innerHTML=`<div class="gf-inspect-body" role="dialog" aria-label="カードの詳細"><button data-gf-action="close-info" aria-label="閉じる">×</button><div class="gf-inspect-art">${e(c.emoji||'🃏')}</div><h2>${e(c.name)}</h2><p>${e(description)}</p><div class="gf-inspect-tags"><span>${e(TYPE[c.type]?.[0]||'札')}</span><span>${c.power?'威力 '+c.power:'特殊効果'}</span><span>${c.cost?'消費 '+c.cost+' '+(c.resource==='gold'?'G':'MP'):'無料'}</span><span>${e(ELEMENT[c.element]||'無')}属性</span></div></div>`;
 document.body.appendChild(el);
}
function gfHistory(){document.getElementById('gf-history')?.remove();const el=document.createElement('div');el.className='gf-history';el.id='gf-history';el.innerHTML=`<div class="gf-history-body"><div class="gf-history-head"><b>📜 バトル履歴</b><button data-gf-action="close-history">×</button></div>${(state?.log||[]).map(t=>`<p>${e(t)}</p>`).join('')||'<p>まだ履歴はありません。</p>'}</div>`;document.body.appendChild(el);}
function gfSimpleScore(p){const allowed=p.id!==state.me&&p.hp>0;const statusesHTML=Object.entries(statuses).filter(([key])=>p[key]>0).map(([key,v])=>`<span title="${e(v[1])}">${v[0]}</span>`).join('');return `<button class="gf-small-score ${p.id===state.me?'mine':''} ${p.id===state.turn?'turn':''} ${p.id===target?'target':''}" ${allowed?`data-action="target" data-id="${e(p.id)}"`:'disabled'}><b>${e(p.name)}</b><small>♥${p.hp}　◆${p.mp}　¥${p.gold}</small>${p.guardian?`<i class="gf-god-icon" title="${e(gods[p.guardian.kind]?.[0]||'守護神')}">${e(iconMap[p.guardian.kind]||'👼')}</i>`:''}<span class="gf-status-dots">${statusesHTML}</span></button>`;}
function gfCurrentEvent(){const n=state?.visualEvent;if(n)return n;return {kind:'neutral',icon:'✦',title:'対戦中',detail:(state?.log?.[0]||'カードを選んでください')};}
battle=function(){
 const def=amDefending(),active=amTurn(),held=chosenCards(),incoming=state.pending;
 const from=incoming?state.players.find(p=>p.id===incoming.from):state.players.find(p=>p.id===state.turn);
 const to=incoming?state.players.find(p=>p.id===incoming.to):state.players.find(p=>p.id===target);
 const cards=incoming?.cards||((active&&held.length)?held:[]);
 const info=gfCurrentEvent();
 const script=state?.scriptFeedback;
 const activeScript=script&&Date.now()-(script.at||0)<20000;
 const scriptBadge=activeScript?`<div class="gf-script-status ${script.ok?'success':'failed'}" role="status">🐍 ${e(script.card)} / on_${e(script.event)}：${script.ok?e(script.actions)+'効果が実行されました':'エラー：'+e(script.message||'不明')}</div>`:'';

 const cmds=def?`<button class="gf-primary" data-action="defend">🛡 防御する ${held.length?'('+held.length+'枚)':''}</button><button class="gf-secondary" data-gf-action="all-guards">まとめて選ぶ</button><button class="gf-secondary" data-action="take-hit">受ける</button>`:active?`<button class="gf-primary" data-action="play" ${held.length?'':'disabled'}>⚔ ${held[0]?.type==='attack'?'攻撃':'使う'}</button><button class="gf-secondary" data-action="pray">祈る+5MP</button><button class="gf-secondary" data-action="trade">交換</button><button class="gf-quiet" data-action="pass">パス</button>`:'<span class="gf-wait">'+e(incoming?'防御を待っています':'次の手番を待っています')+'</span>';
 const played=c=>c?`<span class="gf-play-small">${e(c.emoji||'🃏')}<small>${e(c.name)}</small></span>`:'<span class="gf-play-small quiet">？<small>待機</small></span>';
 return `<div class="gf-game gf-compact"><header class="gf-game-header"><span>✦ CHAOS RELIC</span><strong>第${state.round}R</strong><span id="clock" class="gf-timer">--秒</span><button data-gf-action="dictionary" title="辞書">📖</button></header>
 <div class="gf-field gf-compact-field"><div class="gf-announcement ${e(info.kind||'neutral')}"><span>${e(info.icon||'✦')}</span><div><b>${e(info.title||'対戦中')}</b><small>${e(info.detail||'次の行動を待っています')}</small></div></div>
 ${scriptBadge}
 <div class="gf-compact-duel"><div><b>${e(from?.name||'攻撃側')}</b>${played(cards[0])}</div><span class="gf-duel-arrow">➜<small>${incoming?'攻 '+incoming.damage:'攻防'}</small></span><div><b>${e(to?.name||'防御側')}</b>${played(cards[1])}</div></div>
 <div class="gf-hand-heading gf-compact-title"><b>持ち札 <small>${state.hand.length}枚</small></b><span>${def?'防御札は全部重ねられます':'⚔ 攻撃 / 🛡 防御　長押しで説明'}</span></div>
 <section class="gf-icon-grid" aria-label="持ち札">${state.hand.map(c=>gfCardIcon(c,(def&&c.type==='defense')||(active&&c.type!=='defense'))).join('')}</section>
 <div class="gf-compact-selection">${held.length?(def?'防御 '+held.length+'枚 / 合計守'+held.reduce((n,c)=>n+c.power,0):'選択：'+held.map(c=>e(c.name)).join('＋')):'札を選んでください'}${target?`<span>標的：${e(state.players.find(p=>p.id===target)?.name||'')}</span>`:''}</div>
 <div class="gf-controls gf-compact-controls">${cmds}</div>
 <div class="gf-compact-scores">${state.players.map(gfSimpleScore).join('')}</div>
 <div class="gf-compact-nav"><button data-gf-action="dictionary">📚 辞書</button><button data-gf-action="history">📜 履歴</button><button data-action="leave">退出</button>${state.phenomenon?`<span>🌌 ${e(omens[state.phenomenon.kind]?.[0]||'超常現象')}</span>`:''}</div>
 </div></div>`;
};
const originalRenderModal=renderModal;
renderModal=function(){
 if(modal!=='dictionary')return originalRenderModal();
 const categories={
  '神器・道具':GameEngine.base.filter(c=>['attack','defense','item','magic'].includes(c.type)).concat(state?.customCards||[]).map(c=>({icon:c.emoji,title:c.name,subtitle:TYPE[c.type]?.[0]||'オリジナル',detail:(c.description||descriptions[c.effect]||'特殊効果')+(c.power?' / 威力'+c.power:'')+(c.cost?' / 消費MP '+c.cost:'')})),
  '守護神':Object.entries(gods).map(([k,v])=>({icon:iconMap[k],title:v[0],subtitle:'守護神',detail:v[1]})),
  '超常現象':Object.entries(omens).map(([k,v])=>({icon:'🌌',title:v[0],subtitle:'超常現象',detail:v[1]})),
  '状態異常':Object.values(statuses).map(v=>({icon:v[0],title:v[1],subtitle:'状態異常',detail:v[2]}))
 };
 const all=Object.entries(categories).map(([name,items])=>`<section class="gf-dict-section"><h3>${name} <small>${items.length}</small></h3><div class="gf-dict-grid">${items.map(c=>`<article class="gf-dict-entry"><span class="gf-dict-icon">${e(c.icon||'✨')}</span><div><b>${e(c.title)}</b><small>${e(c.subtitle)}</small><p>${e(c.detail)}</p></div></article>`).join('')}</div></section>`).join('');
 $('modal-root').innerHTML=`<div class="modal-backdrop"><div class="paper modal gf-dictionary" role="dialog" aria-modal="true" aria-label="神話辞典"><div class="modal-title"><h2>📖 神話辞典</h2><button class="icon-button" data-gf-action="close-dictionary" aria-label="閉じる">×</button></div><p class="gf-dict-desc">すべての神器・奇跡・守護神・超常現象・状態異常を確認できます。</p><input id="gf-dict-search" placeholder="名前や効果で検索" aria-label="辞書を検索"><div id="gf-dict-content">${all}</div></div></div>`;
 const input=$('gf-dict-search');
 input.addEventListener('input',()=>{
   const needle=input.value.toLocaleLowerCase().trim();
   for(const group of document.querySelectorAll('.gf-dict-section')){
     let visible=0;
     for(const el of group.querySelectorAll('.gf-dict-entry')){
       const ok=el.textContent.toLocaleLowerCase().includes(needle);el.hidden=!ok;if(ok)visible++;
     }
     group.hidden=!visible;
   }
 });
};
const holder=document.createElement('div');holder.id='gf-battle-fx';holder.setAttribute('aria-live','polite');document.body.appendChild(holder);
let oldHead='',animTimeout=0,oldNotice=0;
function gfEffect(){
 if(!state||state.phase!=='game'){oldHead='';oldNotice=0;return;}
 const n=state.visualEvent;if(!n?.seq||n.seq===oldNotice)return;oldNotice=n.seq;
 if(!['omen','guardian','reflect','safe','attack','damage','heal','status'].includes(n.kind))return;
 const particles=(n.kind==='omen'||n.kind==='guardian')?Array.from({length:9},(_,i)=>`<i style="--i:${i}">${n.kind==='omen'?'✦':'✧'}</i>`).join(''):'';
 holder.className='gf-battle-fx gf-v2-fx '+e(n.kind)+' '+e(n.variant||'');
 holder.innerHTML=`<div class="gf-fx-particles">${particles}</div><span class="gf-fx-emoji">${e(n.icon||'✨')}</span><strong>${e(n.title||'奇跡！')}</strong><small>${e(n.detail||'')}</small>`;
 holder.style.animation='none';void holder.offsetWidth;holder.style.animation='';
 clearTimeout(animTimeout);animTimeout=setTimeout(()=>{holder.innerHTML='';holder.className='gf-battle-fx';},1950);
}
const originalRender=render;
let gfPreviousStats=null,gfPreviousRoom='',gfTransitionTimer=null;
render=function(){
 const roomKey=(state?.room||'')+':'+(state?.phase||'');
 const changed=[],impactPlayers=new Set();
 if(roomKey!==gfPreviousRoom){gfPreviousRoom=roomKey;gfPreviousStats=null;}
 if(state?.phase==='game'){
   const newer=new Map((state.players||[]).map(p=>[p.id,{name:p.name,hp:p.hp,mp:p.mp,gold:p.gold,shield:p.shield}]));
   if(gfPreviousStats){
     for(const [id,stats] of newer){
       const old=gfPreviousStats.get(id);if(!old)continue;
       for(const [key,icon] of [['hp','❤️'],['mp','💠'],['gold','🪙'],['shield','🛡️']]){
         if(old[key]===stats[key])continue;
         const diff=stats[key]-old[key],fmt=n=>Number(n).toLocaleString('ja-JP');
         changed.push({id,name:stats.name,key,icon,old:fmt(old[key]),now:fmt(stats[key]),diff:diff>0?'+'+fmt(diff):fmt(diff)});
         impactPlayers.add(id);
       }
     }
   }
   gfPreviousStats=newer;
 }
 originalRender();gfEffect();
 if(changed.length&&document.querySelector('.gf-compact-field')){
   document.getElementById('gf-impact-feed')?.remove();
   const feed=document.createElement('div');feed.id='gf-impact-feed';feed.className='gf-impact-feed';
   for(const stat of changed.slice(0,8)){
     const row=document.createElement('div');row.className='gf-impact-row '+(stat.diff.startsWith('-')?'decrease':'increase');
     row.textContent=stat.icon+' '+stat.name+' '+stat.key.toUpperCase()+' '+stat.old+' → '+stat.now+' ('+stat.diff+')';
     feed.appendChild(row);
   }
   document.querySelector('.gf-compact-field').appendChild(feed);
   clearTimeout(gfTransitionTimer);
   gfTransitionTimer=setTimeout(()=>feed.remove(),3100);
   const ids=(state.players||[]).map(p=>p.id);
   document.querySelectorAll('.gf-small-score').forEach((el,i)=>{if(impactPlayers.has(ids[i]))el.classList.add('gf-stat-pulse')});
 }
};
document.addEventListener('click',event=>{
 const btn=event.target.closest('[data-gf-action]');if(!btn)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(btn.dataset.gfAction==='dictionary'){modal='dictionary';renderModal();}
 if(btn.dataset.gfAction==='close-dictionary'){modal='';renderModal();}
 if(btn.dataset.gfAction==='all-guards'){
   if(!amDefending())return;
   const player=me();let mp=0,gold=0;
   const cards=state.hand.filter(c=>c.type==='defense');
   chosen.clear();
   for(const c of cards){
     const price=Number(c.cost)||0;
     if(c.resource==='gold'){if(gold+price>player.gold)continue;gold+=price;}
     else{if(mp+price>player.mp)continue;mp+=price;}
     chosen.add(c.uid);
   }
   if(!chosen.size)toast('使える防御札がありません',true);
   render();return;
 }
 if(btn.dataset.gfAction==='card'){if(gfWasHold){gfWasHold=false;return;}const c=state?.hand?.find(c=>c.uid===btn.dataset.id);if(!c)return;const allowed=(amDefending()&&c.type==='defense')||(amTurn()&&c.type!=='defense');if(allowed)selectCard(c.uid);else gfCardInfo(c.uid);}
 if(btn.dataset.gfAction==='close-info')document.getElementById('gf-inspect')?.remove();
 if(btn.dataset.gfAction==='history')gfHistory();
 if(btn.dataset.gfAction==='close-history')document.getElementById('gf-history')?.remove();
},true);
const header=document.querySelector('.header-right');
if(header){
 const button=document.createElement('button');button.className='header-link gf-dict-header';button.textContent='📚 辞書';button.setAttribute('data-gf-action','dictionary');header.insertBefore(button,header.firstChild);
}
document.addEventListener('pointerdown',ev=>{const btn=ev.target.closest('[data-gf-action="card"]');if(!btn)return;clearTimeout(gfHoldTimer);gfWasHold=false;gfInfoUid=btn.dataset.id;gfHoldTimer=setTimeout(()=>{gfWasHold=true;gfCardInfo(gfInfoUid);},450);},{passive:true});
for(const evName of ['pointerup','pointercancel','pointerleave'])document.addEventListener(evName,()=>clearTimeout(gfHoldTimer));
document.addEventListener('contextmenu',ev=>{const btn=ev.target.closest('[data-gf-action="card"]');if(!btn)return;ev.preventDefault();clearTimeout(gfHoldTimer);gfWasHold=true;gfCardInfo(btn.dataset.id);});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){document.getElementById('gf-inspect')?.remove();document.getElementById('gf-history')?.remove();}});
render();
})();
