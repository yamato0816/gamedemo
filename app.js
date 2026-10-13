'use strict';
const $=id=>document.getElementById(id);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={attack:['攻撃','⚔️'],defense:['防御','🛡️'],magic:['奇跡','🔮'],item:['道具','🧪'],guardian:['守護神','👼'],omen:['超常現象','🌌']};
const ELEMENT={none:'無',fire:'火',water:'水',forest:'森',lightning:'雷',dark:'闇'};
const STAT={poison:['毒','☠'],burn:['炎上','🔥'],freeze:['凍結','❄'],curse:['呪い','◈'],weak:['弱体','↓']};
const GD={phoenix:'不死鳥',turtle:'玄武',sprite:'妖精',storm:'雷神',muse:'月の女神'};
const OM={blessing:'天の祝福',meteor:'流星雨',exchange:'資源の逆転',silence:'静寂',fog:'深い霧',mana_rain:'魔力の雨',earthquake:'地鳴り',random:'未知の現象'};
const ICONS=['🦊','🐱','🐸','🐻','🐙','🐼','🐰','🦉'];
const SAMPLE=`# イベントごとに発動する能力を作れます\n# ダメージ値は防御・バリア計算後の実ダメージ\n\ndef on_play():\n    bonus = 3\n    if my_hp() < 20:\n        shield("self", bonus * 2)\n\ndef on_hit():\n    dealt = damage_dealt()\n    recovery = min(8, dealt // 2)\n    if recovery > 0:\n        heal("self", recovery)\n\ndef on_turn_start():\n    if chance(0.35):\n        resource("self", "mp", 2)`;
const TEMPLATES={
 lifesteal:`def on_hit():\n    dealt = damage_dealt()\n    if dealt > 0:\n        heal("self", min(8, dealt // 2))`,
 gamble:`def on_play():\n    luck = randint(1, 6)\n    if luck >= 5:\n        damage("target", luck * 3)\n    elif luck == 1:\n        damage("self", 5)\n    else:\n        shield("self", luck + 2)`,
 guardian:`def on_play():\n    summon("self", "sprite", 4)\n\ndef on_turn_start():\n    health = my_hp()\n    if health < 25:\n        heal("self", 4)\n    else:\n        resource("self", "mp", 2)`,
 counter:`def on_defend():\n    received = damage_taken()\n    if received > 0:\n        damage("target", min(received, 10))\n\ndef on_block():\n    heal("self", 3)`
};
const initial={name:'吸血の爪',type:'attack',emoji:'🦇',effect:'drain',power:7,cost:1,resource:'mp',element:'dark',weight:2,description:'与えた実ダメージの半分を回復',script:TEMPLATES.lifesteal};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let name=load('cr3-name',''),custom=load('cr3-cards',[]),state=null,chosen=new Set(),target=null,modal='',draft={...initial},draftCode=SAMPLE;
let pending=false,showRules=false;let timer=null,lastViewHash='';
function toast(message,bad=false){const t=$('toast');t.textContent=message;t.className='visible'+(bad?' error':'');clearTimeout(timer);timer=setTimeout(()=>t.className='',3300);}
const net=new Online({onState:s=>{const hash=JSON.stringify(s);state=s;if(hash===lastViewHash)return;lastViewHash=hash;chosen=new Set([...chosen].filter(id=>s.hand.some(c=>c.uid===id)));const enemies=s.players.filter(p=>p.hp>0&&p.id!==s.me);if(!enemies.some(p=>p.id===target))target=enemies[0]?.id||null;render();},onInfo:message=>{if($('connection-status'))$('connection-status').textContent=message;$('connection-dot')?.classList.toggle('on',net.ready);},onError:message=>toast(message,true),onClosed:message=>{toast(message,true);$('connection-status').textContent='通信切断';$('connection-dot').classList.remove('on');}});
function ready(){return state&&net.ready;}
function me(){return state?.players.find(p=>p.id===state.me);}
function amTurn(){return state?.phase==='game'&&state.turn===state.me&&!state.pending&&me()?.hp>0;}
function amDefending(){return state?.phase==='game'&&state.pending?.to===state.me&&me()?.hp>0;}
function chosenCards(){return (state?.hand||[]).filter(c=>chosen.has(c.uid));}
function formatCost(c){return c.cost?`${c.cost} ${c.resource==='gold'?'G':'MP'}`:'無料';}
function cardLabel(c){const from={normal:'通常',pierce:'防御貫通',poison:'毒',drain:'吸収',splash:'範囲',wild:'一か八か',burn:'炎上',freeze:'凍結',counter:'反撃',reflect:'反射',mana:'MP回復',blast:'攻撃魔法',heal:'回復',gold:'お金',hex:'ランダム',draw:'ドロー',cleanse:'浄化',lottery:'宝くじ',phoenix:'復活',turtle:'軽減',sprite:'継続回復',storm:'反撃',muse:'MP補助',random:'ランダム',blessing:'祝福',meteor:'隕石',exchange:'交換',curse:'呪い'};return from[c.effect]||'特殊';}
function cardHTML(c,enabled=false){let active=chosen.has(c.uid);return `<button class="card ${e(c.type)} ${active?'picked':''} ${enabled?'pickable':'inactive'}" type="button" ${enabled?'data-action="card" data-id="'+e(c.uid)+'"':''} aria-pressed="${active}" ${enabled?'':'disabled'}>
  <div class="card-heading"><span>${TYPE[c.type]?.[1]} ${TYPE[c.type]?.[0]}</span><span class="card-element">${e(ELEMENT[c.element]||'無')}</span></div>
  <div class="card-picture" aria-hidden="true">${e(c.emoji)}</div><div class="card-title">${e(c.name)}</div><div class="card-details">${e(c.description||cardLabel(c))}</div>
  <div class="card-foot"><b>${c.power?'威力 '+c.power:'特殊'}</b><span>${formatCost(c)}</span></div>
 </button>`;}
function playerItem(p,i){const targeting=p.id===target,canTarget=p.id!==state.me&&p.hp>0;return `<button class="player-tile ${p.id===state.turn?'acting':''} ${state.pending?.to===p.id?'under-attack':''} ${targeting?'targeting':''} ${p.hp<=0?'eliminated':''}" type="button" ${canTarget?'data-action="target" data-id="'+e(p.id)+'"':'disabled'}>
  <div class="player-avatar">${ICONS[i%ICONS.length]}${p.guardian?`<span class="guardian-icon">${p.guardian.kind==='phoenix'?'🦅':p.guardian.kind==='turtle'?'🐢':p.guardian.kind==='sprite'?'🧚':p.guardian.kind==='storm'?'⚡':'🌙'}</span>`:''}</div>
  <div class="player-data"><div class="player-name">${e(p.name)} ${p.id===state.me?'<small>YOU</small>':''}</div><div class="health-bar"><i style="width:${Math.max(0,Math.min(100,p.hp/40*100))}%"></i></div><div class="player-stats"><span>♥ ${p.hp}/40</span><span>◆ ${p.mp}</span><span>● ${p.gold}</span><span>▣ ${p.handCount}</span></div>
  <div class="statuses">${Object.entries(STAT).filter(([k])=>p[k]>0).map(([k,v])=>`<span title="${v[0]}">${v[1]}${p[k]}</span>`).join('')}${p.shield?'<span title="バリア">🛡'+p.shield+'</span>':''}${p.guardian?`<span>${GD[p.guardian.kind]||'守護神'}</span>`:''}</div></div>
  ${p.id===state.turn?'<span class="turn-pin">手番</span>':''}${targeting?'<span class="target-pin">標的</span>':''}
 </button>`;}
function landing(){const invited=new URLSearchParams(location.search).get('room')||'';return `<div class="landing-shell"><section class="welcome">
  <div class="stamp">✦ FREE TO PLAY · PEER TO PEER ✦</div><h1>一枚で、<em>天地がひっくり返る。</em></h1><p>運も読み合いも、ひらめきも。友達とわいわい遊ぶ、ちいさな神話のカードバトル。<br>しかも、<b>好きな能力をコードで作れる。</b></p>
  <div class="intro-art"><span>☄️</span><span>⚔️</span><span>🛡️</span><span>🦅</span><span>🔮</span></div>
  <div class="welcome-box"><label class="field"><span>あなたの名前</span><input id="player-name" maxlength="14" placeholder="プレイヤー名を入力" value="${e(name)}"/></label>
    <button class="primary big" data-action="create">部屋をつくる <span>→</span></button>
    <div class="between-line"><span>または、友達の部屋へ</span></div>
    <div class="join-row"><input id="room-input" maxlength="7" placeholder="7文字の部屋コード" value="${e(invited.toUpperCase())}"/><button class="secondary" data-action="join">参加する</button></div>
  </div><div class="feature-strip"><span>⌛ 5〜15分</span><span>♟ 2〜8人</span><span>⚡ WebRTC通信</span><span>✎ カード作成</span></div>
  </section><aside class="landing-side"><div class="preview-card-layers"><div class="feature-card fade-back">🦅<small>不死鳥の守護</small></div><div class="feature-card foreground">⚔️<small>逆転の一撃</small></div></div><h3>その一手が、勝負を決める。</h3><p>攻撃を重ねて、相手の防御を読み、奇跡を引き当てよう。毒・凍結・守護神、そして突然の超常現象。</p><button class="textlink" data-action="editor">カード工房を見てみる ↗</button></aside></div>`;}
function lobby(){const room=state;return `<div class="lobby-head"><div><span class="section-overline">待機室 · P2P LOBBY</span><h1>冒険の準備をしよう。</h1><p>部屋コードをコピーして、友達を招待してください。</p></div><div class="room-code"><span>ROOM CODE</span><strong>${e(state.room)}</strong><button class="small secondary" data-action="invite">招待リンクをコピー ↗</button></div></div>
  <div class="lobby-columns"><section class="paper"><h2><span>♟</span> 参加プレイヤー <small>${state.players.length}/8人</small></h2>
  <div class="lobby-players">${state.players.map((p,i)=>`<div class="lobby-member"><span class="round-avatar">${ICONS[i%ICONS.length]}</span><div><b>${e(p.name)}</b><small>${p.id===state.me?'あなた':p.bot?'CPU':p.id===state.host?'部屋主':'参加中'}</small></div><span>${p.id===state.host?'👑':p.bot?'🤖':'●'}</span></div>`).join('')}</div>
  ${state.me===state.host?`<div class="row-actions"><button class="subtle" data-action="add-bot">＋ CPUを追加</button><button class="subtle" data-action="remove-bot">− CPUを外す</button></div><button class="primary big" ${state.players.length<2?'disabled':''} data-action="start">対戦開始 ⚔️</button>`:'<p class="hint">👑 部屋主が対戦を開始するのを待っています。</p>'}
  <p class="hint">⚠ ホストがブラウザを閉じると部屋は終了します。</p></section>
  <section class="paper"><div class="paper-title"><h2><span>✎</span> みんなの自作カード <small>${state.customCards.length}枚</small></h2><button class="secondary small" data-action="editor">＋ カードを作る</button></div>
   ${state.customCards.length?`<div class="shared-cards">${state.customCards.map(c=>`<div class="shared-card"><span>${e(c.emoji)}</span><div><b>${e(c.name)}</b><small>${e(c.author)} · ${e(TYPE[c.type][0])}</small></div>${c.owner===state.me||state.host===state.me?`<button data-action="remove" data-id="${e(c.id)}" class="small danger">×</button>`:''}</div>`).join('')}</div>`:'<div class="empty"><strong>まだ自作カードはありません</strong><p>作ったカードは全員の山札に混ざります。</p></div>'}
   <h3 class="my-card-heading">保存済みのカード</h3>
   <div class="shared-cards">${custom.length?custom.map(c=>`<div class="shared-card"><span>${e(c.emoji)}</span><div><b>${e(c.name)}</b><small>ローカル保存</small></div><button class="small secondary" data-action="publish" data-id="${e(c.localId)}">追加</button><button class="small danger" data-action="delete" data-id="${e(c.localId)}">×</button></div>`).join(''):'<p class="hint">自作カードはまだありません。</p>'}</div>
  </section></div><div class="bottom-bar"><button data-action="leave" class="subtle">← 部屋から退出</button><span>基本カード ${state.baseCardCount}種 + 追加 ${state.customCards.length}種</span></div>`;}
function battle(){const p=me(),active=amTurn(),def=amDefending(),cards=chosenCards();const inBattle=!!state.pending,attacker=state.players.find(x=>x.id===state.pending?.from),defender=state.players.find(x=>x.id===state.pending?.to);
 const mode=def?`⚠ ${e(attacker?.name||'相手')} から威力${state.pending.damage}の攻撃！ 防御を選ぼう`:active?'あなたの手番！ カードと相手を選んでください':inBattle?`${e(defender?.name||'相手')} が防御を選択中…`:`${e(state.players.find(x=>x.id===state.turn)?.name||'相手')} の手番です`;
 return `<div class="game-top"><div><span class="section-overline">ONLINE BATTLE · ROUND ${state.round}</span><h1>カオスレリック <small>対戦中</small></h1></div><div class="top-game-actions"><span class="round-pill">第${state.round}ラウンド</span><span class="countdown" id="clock">--秒</span><button class="subtle" data-action="leave">降参・退出</button></div></div>
 <div class="arena">
  <section class="arena-main"><div class="omen-bar">${state.phenomenon?`🌌 現在の超常現象：<strong>${e(OM[state.phenomenon.kind]||'未知')}</strong>`:'✧ 天象は穏やかだ。いつ何が起きるかわからない…'}</div>
  <div class="board-title"><span>対戦者</span><small>相手をタップして標的を変更</small></div><div class="player-grid">${state.players.map(playerItem).join('')}</div>
  <div class="status-banner ${def?'danger-state':active?'your-turn':''}"><span>${def?'🛡️':active?'✦':'⌛'}</span><b>${mode}</b></div>
  <div class="my-hand-head"><h2>あなたの手札 <small>${state.hand.length}枚</small></h2><span>${def?'防御カードを選択（最大3枚）':active?'カードをタップして選択（攻撃は最大3枚）':'次の手番まで待機中'}</span></div>
  <div class="hand-scroller"><div class="card-hand">${state.hand.map(c=>cardHTML(c,(def&&c.type==='defense')||(active&&c.type!=='defense'))).join('')}</div></div>
  <div class="command-bar"><div class="selection-label">${cards.length?`選択中：${cards.map(c=>e(c.name)).join(' ＋ ')} <b>（${cards.length}枚）</b>`:'カードを選択してください'}${target?`<small>標的：${e(state.players.find(x=>x.id===target)?.name||'')}</small>`:''}</div>
  <div class="command-buttons">${def?`<button class="primary" data-action="defend">🛡 防御する ${cards.length?'('+cards.length+'枚)':''}</button><button class="secondary" data-action="take-hit">防御しない</button>`:active?`<button class="primary" data-action="play" ${cards.length?'':'disabled'}>${cards[0]?.type==='attack'?'⚔️ 攻撃する':'✦ カードを使う'}</button><button class="secondary" data-action="pray">🙏 祈る</button><button class="secondary" data-action="trade">💱 交換</button><button class="subtle" data-action="pass">パス</button>`:'<span class="waiting-action">対戦の進行を待っています…</span>'}</div></div>
  </section><aside class="battle-sidebar"><div class="sidebar-section"><h3>📜 バトルログ</h3><div class="battle-log">${state.log.map(line=>`<div>${e(line)}</div>`).join('')}</div></div><div class="sidebar-section"><h3>📖 ルール早見表</h3><p>武器は最大3枚重ねられます。攻撃対象が防御で受け止めます。使ったカードは補充されます。</p><p>最後まで生き残った人が勝利。守護神と超常現象が勝負を左右します。</p></div></aside>
 </div>`;}
function finished(){const winner=state.players.find(x=>x.id===state.winner);return `<section class="finish-view"><span class="finish-emblem">${winner?'🏆':'☄️'}</span><span class="section-overline">BATTLE FINISHED</span><h1>${winner?`${e(winner.name)}の勝利！`:'引き分け！'}</h1><p>カード1枚で、また世界が変わる。次の戦いへ。</p><div class="finish-list">${state.players.map((p,i)=>`<div class="lobby-member"><span>${ICONS[i%ICONS.length]}</span><strong>${e(p.name)}</strong><b>${p.hp} HP ${p.id===state.winner?'🥇':''}</b></div>`).join('')}</div>${state.me===state.host?'<button class="primary big" data-action="reset">ロビーに戻って再戦 →</button>':'<p>ホストが次の試合を準備しています。</p>'}<button class="subtle" data-action="leave">部屋から退出</button></section>`;}
function render(){const app=$('app');if(!app)return;app.innerHTML=!state?landing():state.phase==='lobby'?lobby():state.phase==='game'?battle():finished();updateClock();}
function updateClock(){const el=$('clock');if(!el||!state)return;let sec=Math.max(0,Math.ceil(((state.deadline||0)-Date.now())/1000));el.textContent=Number.isFinite(sec)?sec+'秒':'--';el.classList.toggle('urgent',sec<10);}
setInterval(updateClock,400);
function act(type,args={}){try{net.act({type,...args});}catch(err){toast(err.message,true);}}
async function joinGame(kind){name=($('player-name')?.value||name||'旅人').trim().slice(0,14);save('cr3-name',name);$('connection-status').textContent='接続中…';try{
 if(kind==='create'){const code=await net.create(name);history.replaceState(null,'',location.pathname+'?room='+code);toast('部屋ができました。招待リンクを共有できます！');}
 else {const code=($('room-input')?.value||new URLSearchParams(location.search).get('room')||'').trim();await net.join(code,name);history.replaceState(null,'',location.pathname+'?room='+code.toUpperCase());}
}catch(err){toast(err.message||'接続できませんでした',true);$('connection-status').textContent='接続失敗';}}
function leave(){net.disconnect();state=null;lastViewHash='';chosen.clear();target=null;history.replaceState(null,'',location.pathname);$('connection-status').textContent='準備完了';$('connection-dot').classList.remove('on');render();}
function selectCard(uid){const c=state.hand.find(x=>x.uid===uid);if(!c)return;if(chosen.has(uid))chosen.delete(uid);else{const old=chosenCards();if(old.length&&(old[0].type!=='attack'||c.type!=='attack'))chosen.clear();if(chosen.size>=3){toast('最大3枚まで選択できます');return;}chosen.add(uid);}render();}
function play(){const cards=chosenCards();if(!cards.length)return;if(amDefending()){chosen.clear();act('defend',{cards:cards.map(c=>c.uid)});return;}
 if(!amTurn())return;const atk=cards.every(c=>c.type==='attack');chosen.clear();if(atk)act('attack',{cards:cards.map(c=>c.uid),target});
 else if(cards.length===1)act('use',{card:cards[0].uid,target});else toast('攻撃以外は1枚ずつ選んでください',true);}
function openEditor(){draft={...initial};draftCode=draft.script;modal='editor';renderModal();}
function getDraft(){for(const k of ['name','emoji','description','type','effect','element','cost','power','weight']){const v=$('edit-'+k);if(v)draft[k]=['cost','power','weight'].includes(k)?Number(v.value):v.value;}draft.script=$('code-input')?.value||'';return draft;}
function editorCard(){return `<div class="forge-preview-card ${e(draft.type)}"><div class="preview-top"><span>✦ ${TYPE[draft.type][0]}</span><span>${e(ELEMENT[draft.element]||'無')}属性</span></div><div class="preview-emoji">${e(draft.emoji||'✨')}</div><h2>${e(draft.name||'新しいカード')}</h2><p>${e(draft.description||'あなただけのカードを創造しよう。')}</p><div class="preview-bottom"><b>威力 ${Number(draft.power)||0}</b><b>コスト ${Number(draft.cost)||0} MP</b></div></div>`;}
const FX={attack:[['normal','通常'],['drain','HP吸収'],['poison','毒'],['burn','炎上'],['pierce','防御貫通'],['wild','ギャンブル'],['freeze','凍結']],defense:[['normal','通常'],['reflect','反射'],['counter','反撃'],['mana','MP回復']],magic:[['blast','攻撃魔法'],['drain','HP吸収魔法'],['heal','回復'],['poison','毒'],['freeze','凍結'],['curse','呪い'],['mana','MP補助']],item:[['heal','回復'],['mana','MP回復'],['gold','お金増加'],['draw','カード補充'],['cleanse','浄化'],['lottery','くじ']],guardian:[['sprite','妖精'],['phoenix','不死鳥'],['turtle','玄武'],['storm','雷神'],['muse','月の女神']],omen:[['random','ランダム'],['blessing','祝福'],['meteor','流星雨'],['exchange','資源交換']]};
const input=(id,label,value,kind='text',opts={})=>`<label class="forge-field"><span>${label}</span><input id="edit-${id}" type="${kind}" ${opts.max?'max="'+opts.max+'"':''} ${kind==='number'?'min="0"':''} value="${e(value)}" ${opts.maxLength?'maxlength="'+opts.maxLength+'"':''}/></label>`;
function select(id,label,arr,val){return `<label class="forge-field"><span>${label}</span><select id="edit-${id}">${arr.map(([v,t])=>`<option value="${e(v)}" ${v===val?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;}
function renderModal(){const parent=$('modal-root');if(!modal){parent.innerHTML='';return;}
 if(modal==='rules'){parent.innerHTML=`<div class="modal-backdrop"><div class="paper modal rules-dialog"><div class="modal-title"><h2>📖 あそびかた</h2><button class="icon-button" data-action="close">×</button></div><p>2〜8人で遊べる、ランダムな手札を使った生き残りカードバトルです。</p><ol><li>手札は最初に9枚。使用した枚数だけランダムに補充されます。</li><li>攻撃カードは1〜3枚同時使用可能。相手は防御カードで防ぎます。</li><li>奇跡・道具・守護神・超常現象を使って逆転を狙いましょう。</li><li>毒や凍結などの状態異常はターン開始時に効果があります。</li><li>最後に生き残った人が勝利です。</li></ol><button class="primary" data-action="close">閉じる</button></div></div>`;return;}
 parent.innerHTML=`<div class="modal-backdrop"><section class="forge-shell" role="dialog" aria-label="カード工房" aria-modal="true">
 <div class="forge-header"><div><span class="section-overline">THE FORGE / CARD LABORATORY</span><h2>✦ カード工房 <small>自分だけの奇跡をつくろう</small></h2></div><button data-action="close" class="icon-button" aria-label="閉じる">×</button></div>
 <div class="forge-layout"><div class="forge-left"><div class="forge-art"><div id="forge-preview">${editorCard()}</div></div><div class="form-block"><h3>カードの基本設定</h3><div class="two-col">${input('name','カード名',draft.name,'text',{maxLength:16})}${input('emoji','アイコン（絵文字）',draft.emoji,'text',{maxLength:6})}</div>
 <div class="two-col">${select('type','カードの種類',Object.entries(TYPE).map(([k,v])=>[k,v[0]]),draft.type)}${select('effect','基本効果',FX[draft.type],draft.effect)}</div>
 <div class="three-col">${input('power','威力',draft.power,'number',{max:18})}${input('cost','消費MP',draft.cost,'number',{max:15})}${input('weight','出現頻度 1〜5',draft.weight,'number',{max:5})}</div>
 ${select('element','属性',Object.entries(ELEMENT),draft.element)}${input('description','カードの説明',draft.description,'text',{maxLength:100})}
 </div></div><div class="forge-right"><div class="code-title"><div><span class="python-chip">🐍 Python風スクリプト</span><h3>効果プログラム</h3></div><button class="secondary small" data-action="validate">▶ 構文チェック</button></div>
 <div class="snippet-row"><span>テンプレート：</span><button data-action="snippet" data-id="lifesteal">吸血</button><button data-action="snippet" data-id="gamble">ギャンブル</button><button data-action="snippet" data-id="guardian">守護神</button><button data-action="snippet" data-id="counter">反撃</button></div>
 <div class="code-window"><div class="code-toolbar"><span class="three-dots"><i></i><i></i><i></i></span><b>card_effect.py</b><span>安全なPython構文サブセット</span></div><div class="code-region"><div id="code-lines" class="line-numbers"></div><pre id="code-highlight" aria-hidden="true"></pre><textarea id="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python効果プログラム">${e(draftCode)}</textarea></div></div>
 <div class="code-diagnostic" id="code-feedback">✦ 右の能力は保存すると、カードが対戦に登場したときに発動します。</div>
 <div class="api-heading">使用できる関数 <small>押すとコードへ挿入</small></div><div class="api-pills">${['damage_dealt()','damage_taken()','my_hp()','target_hp()','my_mp()','target_mp()','round_number()','chance(0.5)','randint(1, 6)','damage("target", 5)','heal("self", 5)','status("target", "poison", 2)','shield("self", 5)','summon("self", "phoenix", 3)','resource("self", "mp", 3)','draw("self", 1)','phenomenon("random")'].map(s=>`<button data-action="insert" data-code="${e(s)}">${e(s)}</button>`).join('')}</div>
 <details class="forge-help"><summary>関数の説明・Pythonの対応範囲</summary><p>使えるのは <code>def on_play():</code>、<code>on_hit()</code>、<code>on_defend()</code>、<code>on_block()</code>、<code>on_turn_start()</code>。変数、四則演算、<code>if / elif / else</code>、比較、<code>and / or / not</code>、<code>min / max / int / round</code> などが使えます。<code>damage_dealt()</code> は防御やバリア適用後の実ダメージ。<code>damage_taken()</code> は防御時に受けた実ダメージです。対象は <code>self</code> / <code>target</code> / <code>everyone</code> / <code>all_enemies</code>。ループ、import、任意関数、ファイル操作は安全性のため非対応です。</p></details>
 </div></div><div class="forge-footer"><p>スクリプトは安全な命令としてゲーム内で実行されます。無制限のPython実行ではありません。</p><div><button class="secondary" data-action="close">キャンセル</button><button class="primary" data-action="save-card">✓ マイカードに保存</button></div></div>
 </section></div>`;initCode();}
function syntaxHighlight(src){return e(src).replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g,'<span class="sy-string">$1</span>').replace(/\b(def|if|elif|else|and|or|not|True|False|None)\b/g,'<span class="sy-keyword">$1</span>').replace(/\b(on_play|on_hit|on_defend|on_block|on_turn_start|damage_dealt|damage_taken|heal|damage|shield|status|summon|chance|randint|min|max|my_hp|target_hp|resource)\b/g,'<span class="sy-call">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="sy-num">$1</span>');}
function initCode(){const area=$('code-input'),pre=$('code-highlight'),lines=$('code-lines');if(!area)return;
 const sync=()=>{pre.innerHTML=syntaxHighlight(area.value)+'\n';lines.innerHTML=Array.from({length:Math.max(1,area.value.split('\n').length)},(_,i)=>`<span>${i+1}</span>`).join('');pre.scrollTop=area.scrollTop;pre.scrollLeft=area.scrollLeft;lines.scrollTop=area.scrollTop;};
 area.addEventListener('input',()=>{draftCode=area.value;sync();});area.addEventListener('scroll',sync);
 area.addEventListener('keydown',ev=>{if(ev.key==='Tab'){ev.preventDefault();const a=area.selectionStart,b=area.selectionEnd;area.setRangeText('    ',a,b,'end');draftCode=area.value;sync();}});
 sync();}
function validateCode(show=true){try{const source=$('code-input')?.value||'';const ast=PyCards.compile(source);const message=`✓ 構文OK！ ${Object.keys(ast.handlers).map(k=>'on_'+k).join(' / ')} が登録されます。`;
 $('code-feedback').textContent=message;$('code-feedback').className='code-diagnostic valid';if(show)toast(message);return ast;
 }catch(err){$('code-feedback').textContent='⚠ '+err.message;$('code-feedback').className='code-diagnostic invalid';if(show)toast(err.message,true);return null;}}
function saveCard(){getDraft();if(!draft.name.trim()){toast('カード名が必要です',true);return;}if(!validateCode(false)){toast('コードにエラーがあるため保存できません',true);return;}
 try{GameEngine.card(draft,name||'作者');}catch(err){toast(err.message,true);return;}
 if(custom.length>=50){toast('カードは50枚まで保存できます',true);return;}
 custom.push({...draft,localId:crypto.randomUUID()});save('cr3-cards',custom);modal='';renderModal();render();toast('「'+draft.name+'」を保存しました！ 対戦部屋から追加できます。');}
function publishCard(id){const card=custom.find(c=>c.localId===id);if(!card)return;const data={...card};delete data.localId;act('publish',{card:data});}
function updatePreview(){getDraft();if(!FX[draft.type].some(([v])=>v===draft.effect))draft.effect=FX[draft.type][0][0];const f=$('edit-effect');if(f){const current=f.value;f.innerHTML=FX[draft.type].map(([v,t])=>`<option value="${e(v)}">${e(t)}</option>`).join('');f.value=FX[draft.type].some(([v])=>v===current)?current:draft.effect;}$('forge-preview').innerHTML=editorCard();}
function editCodeInsert(str){const el=$('code-input');if(!el)return;el.focus();const start=el.selectionStart,end=el.selectionEnd;el.setRangeText(str,start,end,'end');el.dispatchEvent(new Event('input'));}
async function copyInvite(){const link=location.origin+location.pathname+'?room='+state.room;try{await navigator.clipboard.writeText(link);toast('招待リンクをコピーしました');}catch{prompt('このURLを友達に送ってください',link);}}
document.addEventListener('input',ev=>{if(modal==='editor'&&ev.target?.id?.startsWith('edit-'))updatePreview();});
document.addEventListener('change',ev=>{if(modal==='editor'&&ev.target?.id==='edit-type'){draft.type=ev.target.value;draft.effect=FX[draft.type][0][0];const effect=$('edit-effect');effect.innerHTML=FX[draft.type].map(([v,t])=>`<option value="${e(v)}">${e(t)}</option>`).join('');updatePreview();}});
document.addEventListener('click',ev=>{const btn=ev.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action,id=btn.dataset.id;
 try{
 switch(a){case 'create':case 'join':joinGame(a);break;case 'invite':copyInvite();break;case 'leave':leave();break;
 case 'editor':openEditor();break;case 'rules':modal='rules';renderModal();break;case 'close':modal='';renderModal();break;
 case 'start':act('start');break;case 'reset':act('reset');break;case 'add-bot':act('bot',{action:'add'});break;case 'remove-bot':act('bot',{action:'remove'});break;
 case 'card':selectCard(id);break;case 'target':target=id;render();break;case 'play':play();break;case 'defend':play();break;case 'take-hit':chosen.clear();act('defend',{cards:[]});break;
 case 'pass':act('pass');break;case 'pray':act('pray');break;case 'trade':act('trade',{mode:'heal'});break;
 case 'publish':publishCard(id);break;case 'remove':act('removeCard',{id});break;case 'delete':custom=custom.filter(c=>c.localId!==id);save('cr3-cards',custom);render();break;
 case 'validate':validateCode();break;case 'save-card':saveCard();break;
 case 'snippet':getDraft();draftCode=TEMPLATES[id];$('code-input').value=draftCode;$('code-input').dispatchEvent(new Event('input'));break;
 case 'insert':editCodeInsert(btn.dataset.code);break;
 } }catch(err){toast(err.message,true);}});
$('brand').addEventListener('click',()=>{if(state){toast('対戦中は「退出」でトップに戻れます');return;}render();});
window.addEventListener('beforeunload',()=>{if(net.ready)net.disconnect();});
render();
