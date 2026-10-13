(function gfExperience(){
'use strict';
const action=(label,kind,extra='')=>`<button class="${kind}" data-action="${extra||kind}">${label}</button>`;
const iconMap={phoenix:'🦅',turtle:'🐢',sprite:'🧚',storm:'⚡',muse:'🌙'};
const statuses={poison:['☠','毒','自分の手番開始時に2ダメージ'],burn:['🔥','炎上','自分の手番開始時に3ダメージ'],freeze:['❄','凍結','次の行動ができなくなる'],curse:['◈','呪い','自分の手番開始時にMPが2減る'],weak:['↓','弱体','次の攻撃威力が3減る']};
const gods={phoenix:['不死鳥','倒れると一度だけHP8で復活'],turtle:['玄武','受けるダメージを3軽減'],sprite:['妖精','手番開始時にHPを3回復'],storm:['雷神','攻撃を受けると相手へ2ダメージ'],muse:['月の女神','手番開始時にMPを3回復']};
const omens={blessing:['天の祝福','全員がHPを5回復'],meteor:['流星雨','全員が4ダメージを受ける'],exchange:['資源の逆転','MPとお金が入れ替わる'],silence:['静寂','全員のMPが3減る'],fog:['深い霧','全員に弱体を2付与'],mana_rain:['魔力の雨','全員のMPが5増える'],earthquake:['地鳴り','全員に3ダメージ'],random:['未知の現象','ランダムな超常現象が発生']};
const descriptions={normal:'基本的な攻撃・防御',reflect:'完全防御時に相手へ反射ダメージ',counter:'完全防御時に相手へ反撃',pierce:'防御値を一部無視する',drain:'与えたダメージでHP吸収',splash:'周囲にも巻き添えダメージ',wild:'確率で強化または空振り',burn:'炎上を付与',poison:'毒を付与',freeze:'凍結を付与',curse:'呪いを付与',heal:'HPを回復',mana:'MPを回復',gold:'お金を増やす',draw:'手札を補充',cleanse:'状態異常を解除',lottery:'お金が増減するくじ',blast:'攻撃魔法',hex:'ランダムな呪い',phoenix:'不死鳥の守護',turtle:'玄武の守護',sprite:'妖精の守護',storm:'雷神の守護',muse:'月の女神の守護',random:'ランダムな超常現象',blessing:'祝福',meteor:'流星雨',exchange:'資源の交換'};
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
battle=function(){
 const def=amDefending(),active=amTurn(),held=chosenCards(),incoming=state.pending,from=incoming?state.players.find(p=>p.id===incoming.from):state.players.find(p=>p.id===state.turn),to=incoming?state.players.find(p=>p.id===incoming.to):state.players.find(p=>p.id===target);
 const attackCards=incoming?.cards||((active&&held.some(c=>c.type==='attack'))?held:[]);
 const info=def?`${e(from?.name||'相手')}から攻撃！ 防御札を選んでください`:active?'あなたの手番です。札と標的を選択':incoming?`${e(to?.name||'相手')}が防御を選択中`:`${e(from?.name||'相手')}の手番です`;
 const command=def?`${action('🛡 弾く'+(held.length?' ('+held.length+'枚)':''),'gf-primary','defend')}${action('受ける','gf-secondary','take-hit')}`:active?`<button class="gf-primary" data-action="play" ${held.length?'':'disabled'}>${held[0]?.type==='attack'?'⚔ 攻撃':'✦ 使う'}</button>${action('祈る','gf-secondary','pray')}${action('交換','gf-secondary','trade')}${action('パス','gf-quiet','pass')}`:'<span class="gf-wait">相手の行動を待っています…</span>';
 return `<div class="gf-game"><header class="gf-game-header"><span>✦ CHAOS RELIC</span><strong>第${state.round}ラウンド</strong><span id="clock" class="gf-timer">--秒</span><button data-gf-action="dictionary" title="辞書を開く">📖</button></header>
 <div class="gf-field"><div class="gf-duel">${gfFighter(from,'攻撃側',attackCards)}<div class="gf-arrow">➜</div>${gfFighter(to,'防御側',[])}</div>
 <div class="gf-power"><span>攻撃 ${incoming?.damage??(active?attackCards.reduce((n,c)=>n+(c.power||0),0):0)}</span><span>${def?'🛡 弾く':active?'⚔ 攻める':'⏳ 待機中'}</span></div>
 <div class="gf-context ${def?'danger':active?'active':''}">${info}</div>
 <section class="gf-hand-shell"><div class="gf-hand-heading"><b>持ち札 <small>${state.hand.length}枚</small></b><span>タップして選ぶ</span></div><div class="gf-hand-grid">${state.hand.map(c=>cardHTML(c,(def&&c.type==='defense')||(active&&c.type!=='defense'))).join('')}</div></section>
 <div class="gf-actions"><div class="gf-selection">${held.length?`選択中：${held.map(c=>e(c.name)).join(' ＋ ')}`:'札を選んでください'} <span>${target?'標的：'+e(to?.name||state.players.find(p=>p.id===target)?.name||'') :''}</span></div><div class="gf-controls">${command}</div></div>
 <section class="gf-scoreboard">${state.players.map(gfScore).join('')}</section>
 <div class="gf-omen"><button data-gf-action="dictionary">✦ 起こした奇跡：${e(omens[state.phenomenon?.kind]?.[0]||'なし')}　›</button></div>
 <div class="gf-mini-log"><b>直近の出来事</b><div>${state.log.slice(0,5).map((s,i)=>`<p class="${i===0?'latest':''}">${e(s)}</p>`).join('')}</div></div>
 <div class="gf-toolbar"><button data-gf-action="dictionary">📚 神話辞典</button><button data-action="rules">あそびかた</button><button data-action="leave">退出</button></div>
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
let oldHead='',animTimeout=0;
const calls=[[/跳ね返|反射/,'跳ね返した！','blue'],[/無事/,'無事！','green'],[/反撃/,'反撃！','red'],[/クリティカル/,'クリティカル！','red'],[/復活/,'復活！','gold'],[/凍結/,'凍結！','blue'],[/炎上/,'炎上！','red'],[/毒/,'毒！','purple'],[/超常現象/,'超常現象！','gold']];
function gfEffect(){
 if(!state||state.phase!=='game'){oldHead='';return;}
 const logs=state.log||[];
 if(oldHead){
   const idx=logs.indexOf(oldHead),newItems=idx<0?[]:logs.slice(0,idx);
   for(const [regex,label,tone] of calls){
      if(newItems.some(line=>regex.test(line))){
        holder.className='gf-battle-fx '+tone;holder.textContent=label;
        holder.style.animation='none';holder.offsetHeight;holder.style.animation='';
        clearTimeout(animTimeout);animTimeout=setTimeout(()=>{holder.textContent='';holder.className=''},1700);
        break;
      }
   }
 }
 oldHead=logs[0]||'';
}
const originalRender=render;
render=function(){originalRender();gfEffect();};
document.addEventListener('click',event=>{
 const btn=event.target.closest('[data-gf-action]');if(!btn)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(btn.dataset.gfAction==='dictionary'){modal='dictionary';renderModal();}
 if(btn.dataset.gfAction==='close-dictionary'){modal='';renderModal();}
},true);
const header=document.querySelector('.header-right');
if(header){
 const button=document.createElement('button');button.className='header-link gf-dict-header';button.textContent='📚 辞書';button.setAttribute('data-gf-action','dictionary');header.insertBefore(button,header.firstChild);
}
render();
})();
