'use strict';
const $=id=>document.getElementById(id);
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPE={attack:['攻撃','⚔️'],defense:['防御','🛡️'],magic:['奇跡','🔮'],item:['道具','🧪'],guardian:['守護神','👼'],omen:['超常現象','🌌']};
const ELEMENT={none:'無',fire:'火',water:'水',forest:'森',lightning:'雷',dark:'闇'};
const STAT={poison:['毒','☠'],burn:['炎上','🔥'],freeze:['凍結','❄'],curse:['呪い','◈'],weak:['弱体','↓']};
const GD={phoenix:'不死鳥',turtle:'玄武',sprite:'妖精',storm:'雷神',muse:'月の女神'};
const OM={blessing:'天の祝福',meteor:'流星雨',exchange:'資源の逆転',silence:'静寂',fog:'深い霧',mana_rain:'魔力の雨',earthquake:'地鳴り',random:'未知の現象'};
const ICONS=['🦊','🐱','🐸','🐻','🐙','🐼','🐰','🦉'];
const SAMPLE=`# イベントごとに発動する能力を作れます\n# ダメージ値は防御・バリア計算後の実ダメージ\n\ndef on_play():\n    bonus = 3\n    if my_hp() < 20:\n        shield("self", bonus * 2)\n\ndef on_hit():\n    dealt = damage_dealt()\n    recovery = dealt // 2\n    if recovery > 0:\n        heal("self", recovery)\n\ndef on_turn_start():\n    if chance(0.35):\n        resource("self", "mp", 2)`;
const TEMPLATES={
 lifesteal:`def on_hit():\n    dealt = damage_dealt()\n    if dealt > 0:\n        heal("self", dealt // 2)`,
 gamble:`def on_play():\n    luck = randint(1, 6)\n    if luck >= 5:\n        damage("target", luck * 3)\n    elif luck == 1:\n        damage("self", 5)\n    else:\n        shield("self", luck + 2)`,
 guardian:`def on_play():\n    summon("self", "sprite", 4)\n\ndef on_turn_start():\n    health = my_hp()\n    if health < 25:\n        heal("self", 4)\n    else:\n        resource("self", "mp", 2)`,
 counter:`def on_defend():\n    received = damage_taken()\n    if received > 0:\n        damage("target", min(received, 10))\n\ndef on_block():\n    heal("self", 3)`,
 shieldhunt:`# 防御札が多い相手ほど危険な一撃\ndef on_play():\n    shields = target_defense_cards()\n    boost_attack(shields * 9)`,
 superguard:`# 攻撃ダメージと手持ち盾の数で防御値を強化\ndef on_guard():\n    danger = incoming_damage()\n    defense_count = my_defense_cards()\n    boost_defense(danger // 2 + defense_count * 5)`,
 popup:"def on_play():\n    bonus = hand_count(\"target\", \"defense\") * 10\n    popup(\"盾の代償\", \"相手の防御札は {hand_count('target', 'defense')} 枚。追加威力 +{bonus}！\", \"⚡\", \"danger\")\n    boost_attack(bonus)",
 treasury:"def on_play():\n    prize = enemy_count() * 100\n    resource(\"self\", \"gold\", prize)\n    popup(\"黄金の祝福\", \"敵 {enemy_count()} 人 × 100 = {prize} Gold獲得！ 現在 {self.gold}G\", \"💰\", \"gold\")",
 shieldwall:"def on_guard():\n    extra = hand_power(\"self\", \"defense\")\n    boost_defense(extra)\n    popup(\"無敵の壁！\", \"盾の威力合計 {extra}！ 攻撃威力 {incoming_damage()} に対抗\", \"🛡️\", \"success\")",
 judgment:"def on_play():\n    count = alive_count()\n    popup(\"審判の刻\", \"生存者 {count} 人 / 合計HP {total_hp()}\", \"⚖️\", \"magic\")\n    if count > 2:\n        damage(\"all_enemies\", count * 25)",
 jackpot:'def on_play():\n    a = randint(0, 9)\n    b = randint(0, 9)\n    c = randint(0, 9)\n    popup("図柄変動開始！", "【？】【？】【？】", "🎰", "neon", 850)\n    popup_update("左停止！", "【{a}】【？】【？】", "⚡", "sunset", 950)\n    if a == b:\n        popup_update("激アツ！ リーチ！", "【{a}】【{b}】【？】", "🔥", "aurora", 1300)\n    else:\n        popup_update("中停止！", "【{a}】【{b}】【？】", "🎰", "info", 900)\n    if a == 7 and b == 7 and c == 7:\n        popup_update("🌈 超・大当たり！", "【{a}】【{b}】【{c}】 777777ダメージ！", "👑", "rainbow", 2800)\n        damage("all_enemies", 777777)\n    elif a == b and b == c:\n        popup_update("✨ 大当たり！", "【{a}】【{b}】【{c}】 全敵77ダメージ！", "💎", "gold", 2000)\n        damage("all_enemies", 77)\n    else:\n        popup_update("残念…", "【{a}】【{b}】【{c}】", "💀", "danger", 1000)\n        damage("self", 5)'

};
const initial={name:'吸血の爪',type:'attack',emoji:'🦇',effect:'drain',power:7,cost:1,resource:'mp',element:'dark',weight:2,description:'与えた実ダメージの半分を回復',script:TEMPLATES.lifesteal};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let name=load('cr3-name',''),custom=load('cr3-cards',[]),state=null,chosen=new Set(),target=null,modal='',draft={...initial},draftCode=SAMPLE;
let editorMode='form',editingCardId=null,editingPublishedId=null;
function editorDraftKey(){return editingPublishedId?'cr3-editor-draft-published-'+editingPublishedId:editingCardId?'cr3-editor-draft-edit-'+editingCardId:'cr3-editor-draft';}
let pending=false,showRules=false;let timer=null,lastViewHash='';
function toast(message,bad=false){const t=$('toast');t.textContent=message;t.className='visible'+(bad?' error':'');clearTimeout(timer);timer=setTimeout(()=>t.className='',3300);}
const net=new Online({onState:s=>{const hash=JSON.stringify(s);state=s;if(hash===lastViewHash)return;lastViewHash=hash;chosen=new Set([...chosen].filter(id=>s.hand.some(c=>c.uid===id)));const enemies=s.players.filter(p=>p.hp>0&&p.id!==s.me);if(!enemies.some(p=>p.id===target))target=enemies[0]?.id||null;render();},onInfo:message=>{if($('connection-status'))$('connection-status').textContent=message;$('connection-dot')?.classList.toggle('on',net.ready);if(message.includes('あなたが新ホスト'))toast('👑 新しい部屋主になりました！ 対戦を引き継ぎます');},onError:message=>toast(message,true),onClosed:message=>{toast(message,true);$('connection-status').textContent='通信切断';$('connection-dot').classList.remove('on');}});
function ready(){return state&&net.ready;}
function busyPopup(){return state?.phase==='game'&&((state.popupBusyUntil||0)>Date.now()||!!window.ChaosPopups?.isBusy());}
function me(){return state?.players.find(p=>p.id===state.me);}
function amTurn(){return state?.phase==='game'&&state.turn===state.me&&!state.pending&&me()?.hp>0&&!busyPopup();}
function amDefending(){return state?.phase==='game'&&state.pending?.to===state.me&&me()?.hp>0&&!busyPopup();}
function chosenCards(){return (state?.hand||[]).filter(c=>chosen.has(c.uid));}
function formatCost(c){return c.cost?`${c.cost} ${c.resource==='gold'?'G':'MP'}`:'無料';}
function cardLabel(c){const from={guard_hunt:'相手の防御札×威力',normal:'通常',pierce:'防御貫通',poison:'毒',drain:'吸収',splash:'範囲',wild:'一か八か',burn:'炎上',freeze:'凍結',counter:'反撃',reflect:'反射',mana:'MP回復',blast:'攻撃魔法',heal:'回復',gold:'お金',hex:'ランダム',draw:'ドロー',cleanse:'浄化',lottery:'宝くじ',phoenix:'復活',turtle:'軽減',sprite:'継続回復',storm:'反撃',muse:'MP補助',random:'ランダム',blessing:'祝福',meteor:'隕石',exchange:'交換',curse:'呪い'};return from[c.effect]||'特殊';}
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
  </div><div class="feature-strip"><span>⌛ 5〜15分</span><span>♟ 2〜8人</span><span>⚡ オンライン対戦</span><span>✎ カード作成</span></div>
  </section><aside class="landing-side"><div class="preview-card-layers"><div class="feature-card fade-back">🦅<small>不死鳥の守護</small></div><div class="feature-card foreground">⚔️<small>逆転の一撃</small></div></div><h3>その一手が、勝負を決める。</h3><p>攻撃を重ねて、相手の防御を読み、奇跡を引き当てよう。毒・凍結・守護神、そして突然の超常現象。</p><button class="textlink" data-action="editor">カード工房を見てみる ↗</button></aside></div>`;}
function lobby(){const room=state;return `<div class="lobby-head"><div><span class="section-overline">待機室 · ONLINE LOBBY</span><h1>冒険の準備をしよう。</h1><p>部屋コードをコピーして、友達を招待してください。</p></div><div class="room-code"><span>ROOM CODE</span><strong>${e(state.room)}</strong><button class="small secondary" data-action="invite">招待リンクをコピー ↗</button></div></div>
  <div class="lobby-columns"><section class="paper"><h2><span>♟</span> 参加プレイヤー <small>${state.players.length}/8人</small></h2>
  <div class="lobby-players">${state.players.map((p,i)=>`<div class="lobby-member"><span class="round-avatar">${ICONS[i%ICONS.length]}</span><div><b>${e(p.name)}</b><small>${p.id===state.me?'あなた':p.bot?'CPU':p.id===state.host?'部屋主':'参加中'}</small></div><span>${p.id===state.host?'👑':p.bot?'🤖':'●'}</span></div>`).join('')}</div>
  ${state.me===state.host?`<div class="row-actions"><button class="subtle" data-action="add-bot">＋ CPUを追加</button><button class="subtle" data-action="remove-bot">− CPUを外す</button></div><button class="primary big" ${state.players.length<2?'disabled':''} data-action="start">対戦開始 ⚔️</button>`:'<p class="hint">👑 部屋主が対戦を開始するのを待っています。</p>'}
  <p class="hint">👑 Firebase対戦ではホストが抜けても残った参加者へ自動引き継ぎします。P2P方式ではホストが抜けると終了します。</p></section>
  <section class="paper"><div class="paper-title"><h2><span>✎</span> みんなの自作カード <small>${state.customCards.length}枚</small></h2><button class="secondary small" data-action="editor">＋ カードを作る</button></div>
   ${state.customCards.length?`<div class="shared-cards">${state.customCards.map(c=>`<div class="shared-card"><span>${e(c.emoji)}</span><div><b>${e(c.name)}</b><small>${e(c.author)} · ${e(TYPE[c.type][0])}</small></div>${c.owner===state.me?`<button data-action="edit-published" data-id="${e(c.id)}" class="small secondary">✏ 編集</button>`:''}${c.owner===state.me||state.host===state.me?`<button data-action="remove" data-id="${e(c.id)}" class="small danger" title="ロビーから削除">×</button>`:''}</div>`).join('')}</div>`:'<div class="empty"><strong>まだ自作カードはありません</strong><p>作ったカードは全員の山札に混ざります。</p></div>'}
   <h3 class="my-card-heading">保存済みのカード</h3>
   <div class="shared-cards">${custom.length?custom.map(c=>`<div class="shared-card"><span>${e(c.emoji)}</span><div><b>${e(c.name)}</b><small>ローカル保存</small></div><button class="small secondary" data-action="edit-saved" data-id="${e(c.localId)}">✏ 編集</button><button class="small secondary" data-action="publish" data-id="${e(c.localId)}">${state.customCards.some(x=>x.owner===state.me&&x.sourceLocalId===c.localId)?'更新':'追加'}</button><button class="small danger" data-action="delete" data-id="${e(c.localId)}" title="端末から削除">×</button></div>`).join(''):'<p class="hint">自作カードはまだありません。</p>'}</div>
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
function updateClock(){const el=$('clock');if(!el||!state)return;if(busyPopup()){el.textContent='🎬 演出中';el.classList.remove('urgent');return;}let sec=Math.max(0,Math.ceil(((state.deadline||0)-Date.now())/1000));el.textContent=Number.isFinite(sec)?sec+'秒':'--';el.classList.toggle('urgent',sec<10);}
setInterval(updateClock,400);
function act(type,args={}){if(type!=='leave'&&busyPopup()){toast('🎬 演出中です。終わるまで操作をお待ちください');return;}try{net.act({type,...args});}catch(err){toast(err.message,true);}}
async function joinGame(kind){name=($('player-name')?.value||name||'旅人').trim().slice(0,14);save('cr3-name',name);$('connection-status').textContent='接続中…';try{
 if(kind==='create'){const code=await net.create(name);history.replaceState(null,'',location.pathname+'?room='+code);toast('部屋ができました。招待リンクを共有できます！');}
 else {const code=($('room-input')?.value||new URLSearchParams(location.search).get('room')||'').trim();await net.join(code,name);history.replaceState(null,'',location.pathname+'?room='+code.toUpperCase());}
}catch(err){toast(err.message||'接続できませんでした',true);$('connection-status').textContent='接続失敗';}}
function leave(){net.disconnect();state=null;lastViewHash='';chosen.clear();target=null;history.replaceState(null,'',location.pathname);$('connection-status').textContent='準備完了';$('connection-dot').classList.remove('on');render();}
function selectCard(uid){const c=state.hand.find(x=>x.uid===uid);if(!c)return;if(chosen.has(uid))chosen.delete(uid);else{const old=chosenCards();if(old.length&&(old[0].type!==c.type||!['attack','defense'].includes(c.type)))chosen.clear();const max=['attack','defense'].includes(c.type)?state.hand.filter(x=>x.type===c.type).length:1;if(chosen.size>=max){toast('この種類のカードをこれ以上選べません');return;}chosen.add(uid);}render();}
function play(){const cards=chosenCards();if(!cards.length)return;if(amDefending()){chosen.clear();act('defend',{cards:cards.map(c=>c.uid)});return;}
 if(!amTurn())return;const atk=cards.every(c=>c.type==='attack');chosen.clear();if(atk)act('attack',{cards:cards.map(c=>c.uid),target});
 else if(cards.length===1)act('use',{card:cards[0].uid,target});else toast('攻撃以外は1枚ずつ選んでください',true);}
const FULL_CARD_TEMPLATE="card.name = \"全手札を断つ巨剣\"\ncard.description = \"相手のすべての手札を調査し、防御札の威力の総和を攻撃に加算する。\"\ncard.type = \"attack\"\ncard.emoji = \"⚔️\"\ncard.power = 100\ncard.cost = 5\ncard.resource = \"mp\"\ncard.effect = \"normal\"\ncard.element = \"dark\"\ncard.weight = 3\n\ndef on_play():\n    bonus = 0\n    for item in target.hand:\n        if item.type == \"defense\":\n            bonus += item.power\n    boost_attack(bonus)\n\ndef on_hit():\n    heal(\"self\", damage_dealt() // 2)";
function openEditor(localId=null,publishedId=null){
 // Existing cards bypass the unsaved "new card" draft so editing cannot
 // accidentally overwrite a different card or make an unintended duplicate.
 let stored=null;
 editingPublishedId=publishedId;
 if(publishedId){
  if(state?.phase!=='lobby')throw Error('公開済みカードはロビーでのみ編集できます');
  const published=state.customCards.find(c=>c.id===publishedId);
  if(!published||published.owner!==state.me)throw Error('編集できるのは自分のカードだけです');
  const bySource=custom.find(c=>c.localId===published.sourceLocalId);
  const candidate=custom.filter(c=>c.name===published.name&&c.type===published.type&&c.script===published.script&&c.power===published.power&&c.cost===published.cost);
  stored=published;
  editingCardId=bySource?.localId||(candidate.length===1?candidate[0].localId:null);
 }else{
  stored=localId==null?null:custom.find(c=>c.localId===localId);
  if(localId!=null&&!stored)throw Error('保存されたカードが見つかりません');
  editingCardId=stored?.localId||null;
 }
 const saved=load(editorDraftKey(),null);
 draft=CardForge.editable(saved?.data||stored||{...initial,script:''},initial);
 draftCode=saved?.code??draft.script;
 editorMode=saved?.mode==='code'||saved?.mode==='form'?saved.mode:((stored&&draftCode.trim())?'code':'form');
 modal='editor';renderModal();
}
function savedCardsInForge(){
 return `<details class="forge-saved-library"><summary>📚 保存済みのカード <b>${custom.length}枚</b><span>${editingPublishedId?'公開カードを再編集中':editingCardId?'既存カードを編集中':'タップして再編集'}</span></summary><div class="forge-saved-list">
  <button class="forge-saved-new" data-action="new-card">＋ 新しいカードを作成</button>
  ${custom.length?custom.map(c=>`<div class="forge-saved-entry ${editingCardId===c.localId?'current':''}">
   <span class="forge-saved-emoji">${e(c.emoji||'🃏')}</span>
   <div><b>${e(c.name||'名前のないカード')}</b><small>${e(TYPE[c.type]?.[0]||'カード')} · ${e(c.cost||0)}${c.resource==='gold'?'G':'MP'} · ${c.script?.trim()?'🐍 コード付き':'🧩 フォーム'}</small></div>
   <button data-action="edit-saved" data-id="${e(c.localId)}" class="secondary small" ${editingCardId===c.localId?'aria-current="true"':''}>✏ 編集</button>
  </div>`).join(''):'<p class="forge-saved-empty">まだ保存したカードはありません。</p>'}
 </div></details>`;
}
function codeText(){
 return window.ForgeMonaco?.isMounted()?window.ForgeMonaco.getValue():($('code-input')?.value??draftCode??'');
}
function setCodeText(value){
 draftCode=String(value??'');
 const field=$('code-input');
 if(window.ForgeMonaco?.isMounted())window.ForgeMonaco.setValue(draftCode);
 else if(field){field.value=draftCode;field.dispatchEvent(new Event('input',{bubbles:true}));}
 draft.script=draftCode;
 save(editorDraftKey(),{data:draft,code:draftCode,mode:editorMode});
}
function getDraft(){
 for(const k of ['name','emoji','description','type','effect','element','resource','cost','power','weight']){
  const v=$('edit-'+k);if(v)draft[k]=['cost','power','weight'].includes(k)?Number(v.value):v.value;
 }
 draft.script=codeText();
 draftCode=draft.script;
 save(editorDraftKey(),{data:draft,code:draftCode,mode:editorMode});
 return draft;
}
function editorCard(){return `<div class="forge-preview-card ${e(draft.type)}"><div class="preview-top"><span>✦ ${TYPE[draft.type][0]}</span><span>${e(ELEMENT[draft.element]||'無')}属性</span></div><div class="preview-emoji">${e(draft.emoji||'✨')}</div><h2>${e(draft.name||'新しいカード')}</h2><p>${e(draft.description||'あなただけのカードを創造しよう。')}</p><div class="preview-bottom"><b>威力 ${Number(draft.power)||0}</b><b>コスト ${Number(draft.cost)||0} ${draft.resource==='gold'?'G':'MP'}</b></div></div>`;}
const FX={attack:[['normal','通常'],['drain','HP吸収'],['poison','毒'],['burn','炎上'],['pierce','防御貫通'],['wild','ギャンブル'],['freeze','凍結'],['chain','連鎖攻撃'],['double_hit','追撃'],['siphon','MP強奪'],['guard_hunt','防御札の枚数×威力']],defense:[['normal','通常'],['reflect','等倍反射'],['reflect_full','全反射'],['reflect_double','2倍反射'],['redirect','ランダム転送'],['scatter','攻撃分散'],['nullify','完全無効'],['absorb','魔力吸収'],['counter','反撃'],['mana','MP回復']],magic:[['blast','攻撃魔法'],['drain','HP吸収魔法'],['heal','回復'],['poison','毒'],['freeze','凍結'],['curse','呪い'],['mana','MP補助'],['swap_hp','HP交換'],['mass_poison','全体毒'],['steal_mp','MP強奪'],['scramble','手札一斉交換']],item:[['heal','回復'],['mana','MP回復'],['gold','お金増加'],['draw','カード補充'],['cleanse','浄化'],['lottery','くじ']],guardian:[['sprite','妖精'],['phoenix','不死鳥'],['turtle','玄武'],['storm','雷神'],['muse','月の女神']],omen:[['random','ランダム'],['blessing','祝福'],['meteor','流星雨'],['exchange','資源交換']]};
const input=(id,label,value,kind='text',opts={})=>`<label class="forge-field"><span>${label}</span><input id="edit-${id}" type="${kind}" ${opts.max?'max="'+opts.max+'"':''} ${kind==='number'?'min="0"':''} value="${e(value)}" ${opts.maxLength?'maxlength="'+opts.maxLength+'"':''}/></label>`;
function select(id,label,arr,val){return `<label class="forge-field"><span>${label}</span><select id="edit-${id}">${arr.map(([v,t])=>`<option value="${e(v)}" ${v===val?'selected':''}>${e(t)}</option>`).join('')}</select></label>`;}
function renderModal(){window.ForgeMonaco?.dispose();const parent=$('modal-root');if(!modal){parent.innerHTML='';return;}
 if(modal==='rules'){parent.innerHTML=`<div class="modal-backdrop"><div class="paper modal rules-dialog"><div class="modal-title"><h2>📖 あそびかた</h2><button class="icon-button" data-action="close">×</button></div><p>2〜8人で遊べる、ランダムな手札を使った生き残りカードバトルです。</p><ol><li>手札は最初に9枚。使用した枚数だけランダムに補充されます。</li><li>攻撃カードは1〜3枚同時使用可能。相手は防御カードで防ぎます。</li><li>奇跡・道具・守護神・超常現象を使って逆転を狙いましょう。</li><li>毒や凍結などの状態異常はターン開始時に効果があります。</li><li>最後に生き残った人が勝利です。</li></ol><button class="primary" data-action="close">閉じる</button></div></div>`;return;}
 parent.innerHTML=`<div class="modal-backdrop"><section class="forge-shell" role="dialog" aria-label="カード工房" aria-modal="true">
 <div class="forge-header"><div><span class="section-overline">THE FORGE / CARD LABORATORY</span><h2>✦ カード工房 <small>${editingCardId||editingPublishedId?"✏ 保存済みカードを再編集":"自分だけの奇跡をつくろう"}</small></h2></div><div class="forge-header-actions"><button class="secondary small" data-api-guide="open" type="button">📚 関数図鑑</button><button data-action="close" class="icon-button" aria-label="閉じる">×</button></div></div>
 ${savedCardsInForge()}
 <div class="forge-modes forge-tabs" role="tablist" aria-label="カードの作成方法"><button role="tab" aria-selected="${editorMode==='form'}" class="${editorMode==='form'?'active':''}" data-action="mode-form">🧩 入力で作成</button><button role="tab" aria-selected="${editorMode==='code'}" class="${editorMode==='code'?'active':''}" data-action="mode-code">🐍 コードで作成</button></div><p class="forge-mode-hint" id="forge-mode-hint">${editorMode==='form'?'フォームで設定した値を保存します。過去のコードが優先されることはありません。':'カードの名前・威力・コスト・効果はコード内の card.* で指定できます。'}</p><div class="forge-layout ${editorMode==='code'?'forge-code-mode':'forge-form-mode'}"><div class="forge-left" id="forge-form-panel" role="tabpanel"><div class="forge-art"><div id="forge-preview">${editorCard()}</div></div><div class="form-block"><h3>カードの基本設定</h3><div class="two-col">${input('name','カード名',draft.name,'text',{maxLength:64})}${input('emoji','アイコン（絵文字）',draft.emoji,'text',{maxLength:16})}</div>
 <div class="two-col">${select('type','カードの種類',Object.entries(TYPE).map(([k,v])=>[k,v[0]]),draft.type)}${select('effect','基本効果',FX[draft.type],draft.effect)}</div>
 <div class="three-col">${input('power','威力（上限なし）',draft.power,'number')}${input('cost','消費MP',draft.cost,'number')}${input('weight','出現頻度',draft.weight,'number')}</div>
 ${select('element','属性',Object.entries(ELEMENT),draft.element)}${select('resource','コストの支払い方法',[['mp','MPを消費'],['gold','お金を消費']],draft.resource)}<label class="forge-field"><span>カードの説明</span><textarea id="edit-description" maxlength="8000" rows="4" placeholder="このカードの効果を自由に説明">${e(draft.description)}</textarea></label>
 </div></div><div class="forge-right" id="forge-code-panel" role="tabpanel"><div class="code-title"><div><span class="python-chip">🐍 Python風スクリプト</span><h3>効果プログラム（任意）</h3></div><button class="secondary small" data-action="validate">✓ 構文チェック</button><button class="primary small" data-action="test-code">🧪 実行テスト</button><button class="secondary small" data-action="preview-popup">🎬 ポップ見本</button></div>
 <div class="forge-mobile-actions"><button class="secondary small" data-action="code-only">📝 完全なカード例</button><button class="secondary small" data-action="form-to-code">🧩 フォームからコード生成</button><button class="secondary small" data-action="snippet" data-id="shieldhunt">🎯 盾狩り</button><button class="secondary small" data-action="snippet" data-id="counter">↩️ 反撃</button><button class="secondary small" data-action="snippet" data-id="popup">🎬 ポップ</button><button class="secondary small" data-action="snippet" data-id="jackpot">🌈 パチンコ</button></div><div class="snippet-row"><span>テンプレート：</span><button data-action="snippet" data-id="lifesteal">吸血</button><button data-action="snippet" data-id="gamble">ギャンブル</button><button data-action="snippet" data-id="guardian">守護神</button><button data-action="snippet" data-id="counter">反撃</button><button data-action="snippet" data-id="shieldhunt">盾狩り</button><button data-action="snippet" data-id="superguard">超防御</button><button data-action="snippet" data-id="popup">🎬 ポップ</button><button data-action="snippet" data-id="jackpot">🌈 パチンコ演出</button><button data-action="snippet" data-id="treasury">💰 黄金</button><button data-action="snippet" data-id="shieldwall">🛡 強化</button><button data-action="snippet" data-id="judgment">⚖️ 審判</button></div>
 <div class="forge-quick-keys" aria-label="コード入力補助"><button data-action="insert" data-code="    ">⇥4字</button><button data-action="insert" data-code=":">:</button><button data-action="insert" data-code="()">()</button><button data-action="insert" data-code="&quot;&quot;">“”</button><button data-action="insert" data-code="def on_play():&#10;    ">▶ on_play</button><button data-action="insert" data-code="def on_guard():&#10;    ">🛡 on_guard</button><button data-action="insert" data-code="for item in target.hand:&#10;    ">♻ for</button></div><div class="code-window"><div class="code-toolbar"><span class="three-dots"><i></i><i></i><i></i></span><b>card_effect.py</b><button class="code-fallback-toggle" data-action="code-lightweight" title="スマホや低速回線では軽量入力に変更できます">軽量入力</button><span id="code-editor-status" aria-live="polite">Monaco Editor / Python補完対応</span></div><div class="code-region"><div id="code-lines" class="line-numbers"></div><pre id="code-highlight" aria-hidden="true"></pre><textarea id="code-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Python効果プログラム">${e(draftCode)}</textarea><div id="monaco-editor" aria-label="Monaco Pythonエディター"></div></div></div>
 <div class="code-diagnostic" id="code-feedback">✦ 書いたコードは構文チェックの後、実行テストできます。</div><pre id="code-test-output" class="code-diagnostic" aria-live="polite" style="display:none;white-space:pre-wrap;overflow:auto;max-height:220px;font:12px/1.5 monospace"></pre>
 <div class="api-heading">オブジェクト・関数ガイド</div><div class="forge-help-open"><b>📘 card / self / target / players</b><p>card.name, card.type, card.power, card.cost, self.hp, target.mp, target.hand、item.type, item.power などを参照できます。</p><p>for item in target.hand: で全札を走査できます。len(target.hand) は枚数、count_cards(target.hand, "defense") は防御札枚数、sum_power(target.hand, "defense") は防御札の総威力です。</p><p>API一覧：<a href="CARD_API.md" target="_blank" rel="noopener">CARD_API.md</a></p></div><div class="api-heading">使用できる関数 <small>検索してタップすると挿入</small></div><input id="forge-api-search" class="forge-api-search" type="search" autocomplete="off" placeholder="関数を検索：Gold、HP、手札、popup…" aria-label="カード関数を検索"><div class="api-pills" id="forge-api-pills">${Object.entries(PyCards.docs||{}).map(([key,[params,description]])=>`<button data-action="insert" data-search="${e(key+' '+description+' '+params)}" data-code="${e(key+'('+params+')')}" title="${e(description)}"><b>${e(key)}</b><small>${e(description)}</small></button>`).join('')}</div>
 <details class="forge-help"><summary>関数の説明・Pythonの対応範囲</summary><p>コード冒頭の <code>card.name</code> / <code>card.description</code> / <code>card.cost</code> などですべて指定できます。使えるのは <code>def on_play():</code>、<code>on_hit()</code>、<code>on_defend()</code>、<code>on_block()</code>、<code>on_guard()</code>、<code>on_turn_start()</code>。変数、四則演算、<code>if / elif / else</code>、比較、<code>and / or / not</code>、<code>min / max / int / round</code> などが使えます。<code>damage_dealt()</code> は防御やバリア適用後の実ダメージ。<code>damage_taken()</code> は防御時に受けた実ダメージです。<code>target_defense_cards()</code>で相手が持つ防御札の枚数を取得できます。<code>boost_attack(n)</code>は攻撃の合計威力を加算し、<code>on_guard()</code>中の<code>boost_defense(n)</code>は防御値を加算します。攻撃・防御札は手札にある枚数だけ重ねられます。対象は <code>self</code> / <code>target</code> / <code>everyone</code> / <code>all_enemies</code>。カード配列用のforループに対応。import、無制限ループ、ファイル操作は非対応です。</p></details>
 </div></div><div class="forge-footer"><p>スクリプトは安全な命令としてゲーム内で実行されます。無制限のPython実行ではありません。</p><div><button class="secondary" data-action="close">キャンセル</button><button class="primary" data-action="save-card">${editingCardId||editingPublishedId?"✓ 変更を上書き保存":"✓ 新しいカードを保存"}</button></div></div>
 </section></div>`;initCode();}
function syntaxHighlight(src){return e(src).replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g,'<span class="sy-string">$1</span>').replace(/\b(def|if|elif|else|and|or|not|True|False|None)\b/g,'<span class="sy-keyword">$1</span>').replace(/\b(on_play|on_hit|on_defend|on_block|on_guard|on_turn_start|target_defense_cards|my_defense_cards|incoming_damage|boost_attack|boost_defense|damage_dealt|damage_taken|heal|damage|shield|status|summon|chance|randint|min|max|my_hp|target_hp|resource)\b/g,'<span class="sy-call">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="sy-num">$1</span>');}
function setEditorMode(mode){
 const layout=document.querySelector('.forge-layout');if(!layout)return;
 if(mode==='code'&&!codeText().trim())setCodeText(CardForge.toCode(draft));
 editorMode=mode;
 save(editorDraftKey(),{data:draft,code:codeText(),mode});
 layout.classList.toggle('forge-code-mode',mode==='code');layout.classList.toggle('forge-form-mode',mode==='form');
 document.querySelectorAll('.forge-tabs [role="tab"]').forEach(btn=>{
  const active=btn.dataset.action===(mode==='code'?'mode-code':'mode-form');
  btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));
 });
 const hint=$('forge-mode-hint');
 if(hint)hint.textContent=mode==='code'?'コード中の card.name / card.power / card.cost / card.effect などを優先して保存します。':'入力した名前・威力・コスト・効果が優先されます。コードの内容は保存に使用しません。';
 if(mode==='code'){
  window.ForgeMonaco?.mount({
   hostId:'monaco-editor',textareaId:'code-input',
   onChange:value=>{draftCode=value;getDraft();},
   onStatus:message=>{const status=$('code-editor-status');if(status)status.textContent=message;}
  }).then(()=>window.ForgeMonaco?.layout());
 }
}
function initCode(){const area=$('code-input'),pre=$('code-highlight'),lines=$('code-lines');if(!area)return;
 const sync=()=>{pre.innerHTML=syntaxHighlight(area.value)+'\n';lines.innerHTML=Array.from({length:Math.max(1,area.value.split('\n').length)},(_,i)=>`<span>${i+1}</span>`).join('');pre.scrollTop=area.scrollTop;pre.scrollLeft=area.scrollLeft;lines.scrollTop=area.scrollTop;};
 area.addEventListener('input',()=>{draftCode=area.value;getDraft();sync();});area.addEventListener('scroll',sync);
 area.addEventListener('keydown',ev=>{
  if(ev.key==='Tab'){ev.preventDefault();const a=area.selectionStart,b=area.selectionEnd;area.setRangeText('    ',a,b,'end');draftCode=area.value;getDraft();sync();}
  if(ev.key==='Enter'&&!ev.shiftKey&&!ev.isComposing){
   const line=area.value.slice(0,area.selectionStart).split('\n').pop(),indent=(line.match(/^ */)||[''])[0];
   const extra=line.trimEnd().endsWith(':')?'    ':'';
   ev.preventDefault();area.setRangeText('\n'+indent+extra,area.selectionStart,area.selectionEnd,'end');draftCode=area.value;sync();
  }
 });
 sync();if(editorMode==='code')setEditorMode('code');}
function validateCode(show=true){try{const source=codeText();const ast=PyCards.compile(source);const message=`✓ 構文OK！ ${Object.keys(ast.handlers).map(k=>'on_'+k).join(' / ')} が登録されます。設定項目：${Object.keys(ast.meta||{}).join(' / ')||'フォームから取得'}`;
 $('code-feedback').textContent=message;$('code-feedback').className='code-diagnostic valid';if(show)toast(message);return ast;
 }catch(err){$('code-feedback').textContent='⚠ '+err.message;$('code-feedback').className='code-diagnostic invalid';if(show)toast(err.message,true);return null;}}
function testCardCode(){
 getDraft();
 const out=$('code-test-output');if(!out)return;
 out.style.display='block';
 const script=draft.script.trim();
 if(!script){out.textContent='コードなし：フォームの基本効果だけを持つカードです。';return;}
 try{
  const program=PyCards.compile(script);
  const guard=()=>({name:'盾',type:'defense',power:12,cost:0});
  const create=(id,name)=>({id,name,hp:1000,mp:1000,gold:1000,shield:0,status:{poison:0,burn:0,freeze:0,curse:0,weak:0},hand:[guard(),guard(),guard(),guard()],guardian:null});
  const log=['🧪 テスト条件：自HP 1000 / MP 1000 / 相手HP 1000 / 相手の防御札 4枚','    受ける攻撃 120 / 与えた実ダメージ 55 / 受けた実ダメージ 30'];
  const events=Object.keys(program.handlers);
  for(const event of events){
   const self=create('sandbox-self','自分'),target=create('sandbox-target','相手'),r={round:10,turnIndex:0,players:[self,target],pending:{damage:120}};
   const ctx={r,self,target,card:{...draft,...program.meta},damageDealt:55,damageTaken:30,incomingDamage:120,ownDefenseCount:4};
   const notes=[],demoPopups=[];
   const change=(who,fn)=>{const arr=who==='self'?[self]:who==='target'?[target]:who==='everyone'?[self,target]:who==='all_enemies'?[target]:[target];arr.forEach(fn);};
   let attack=0,guard=0;
   const actions={
    damage:(w,n)=>{change(w,p=>{p.hp=Math.max(0,p.hp-n);});notes.push('💥 '+w+'へ '+n+'ダメージ');},
    set_hp:(w,n)=>{change(w,p=>p.hp=n);notes.push('❤️ '+w+'のHPを'+n+'に設定');},
    set_resource:(w,k,n)=>{change(w,p=>p[k]=n);notes.push('💠 '+w+'の'+k+'を'+n+'に設定');},
    set_shield:(w,n)=>{change(w,p=>p.shield=n);notes.push('🛡 '+w+'のバリアを'+n+'に設定');},
    set_status:(w,k,n)=>{change(w,p=>p.status[k]=n);notes.push('🧿 '+w+'の'+k+'を'+n+'ターンに設定');},
    remove_status:(w,k)=>{change(w,p=>p.status[k]=0);notes.push('✨ '+w+'の'+k+'を解除');},
    heal_percent:(w,n)=>{change(w,p=>p.hp+=Math.floor(p.hp*n/100));notes.push('💚 '+w+'を'+n+'%回復');},
    draw_type:(w,k,n)=>{change(w,p=>{for(let i=0;i<Math.min(n,64);i++)p.hand.push({name:'テスト',type:k,power:10,cost:0});});notes.push('🎴 '+w+'の'+k+'札を'+n+'枚追加');},
    duplicate:(w,k,n)=>{change(w,p=>{const cards=p.hand.filter(c=>k==='any'||c.type===k);for(let i=0;i<Math.min(n,64)&&cards.length;i++)p.hand.push({...cards[i%cards.length]});});notes.push('🪄 '+w+'の'+k+'札を'+n+'枚複製');},
    clear_hand:w=>{change(w,p=>p.hand=[]);notes.push('🗑 '+w+'の手札を全部破棄');},
    give:(w,k,n)=>{change(w,p=>{if(p===self)return;const amount=Math.min(self[k],n);self[k]-=amount;p[k]+=amount;});notes.push('🤝 '+w+'に'+k+'を'+n+'譲渡');},
    swap_stat:k=>{const temp=self[k];self[k]=target[k];target[k]=temp;notes.push('🔄 '+k+'を交換');},
    shuffle_hand:w=>{change(w,p=>p.hand.reverse());notes.push('🎲 '+w+'の手札をシャッフル');},
    popup:(title,message,icon,theme,duration)=>{notes.push('🎬 ポップ ['+theme+'] '+title+' / '+message);demoPopups.push([{title,detail:message,icon,theme,duration}]);},
    popup_update:(title,message,icon,theme,duration)=>{if(!demoPopups.length)throw Error('popup_updateの前にpopupが必要です');notes.push('🎞 更新 ['+theme+'] '+title+' / '+message);demoPopups[demoPopups.length-1].push({title,detail:message,icon,theme,duration});},
    popup_wait:duration=>{if(!demoPopups.length)throw Error('popup_waitの前にpopupが必要です');const frames=demoPopups[demoPopups.length-1],last=frames[frames.length-1];last.duration+=duration;notes.push('⏳ 現在のポップを '+duration+'ms延長');},
    battle_log:message=>notes.push('📜 '+message),
    heal:(w,n)=>{change(w,p=>{p.hp+=n;});notes.push('💚 '+w+'を '+n+'回復');},
    shield:(w,n)=>{change(w,p=>{p.shield+=n;});notes.push('🛡 '+w+'にバリア '+n);},
    status:(w,k,n)=>{change(w,p=>{p.status[k]=n;});notes.push('🧿 '+w+'に '+k+' '+n+'ターン');},
    resource:(w,k,n)=>{change(w,p=>{p[k]=Math.max(0,p[k]+n);});notes.push('💠 '+w+'の'+k+'に '+n);},
    draw:(w,n)=>{change(w,p=>{for(let i=0;i<Math.min(64,n);i++)p.hand.push({type:'attack'});});notes.push('🎴 '+w+'にカード '+n+'枚');},
    cleanse:w=>{change(w,p=>{p.status={poison:0,burn:0,freeze:0,curse:0,weak:0};});notes.push('✨ '+w+'を浄化');},
    summon:(w,k,n)=>{change(w,p=>{p.guardian={kind:k,turns:n};});notes.push('👼 '+w+'に'+k+'を '+n+'ターン召喚');},
    phenomenon:k=>notes.push('🌌 超常現象 '+k),
    steal:(k,n)=>{const v=Math.min(target[k],n);target[k]-=v;self[k]+=v;notes.push('🫳 相手から'+k+'を '+v+'奪う');},
    boost_attack:n=>{attack+=n;notes.push('⚔ 攻撃威力 ＋'+n);},
    boost_defense:n=>{guard+=n;notes.push('🛡 防御威力 ＋'+n);},
    multiply_attack:n=>{attack=(attack||1)*n;notes.push('⚔ 攻撃威力 ×'+n);},
    discard:(who,type,n)=>{change(who,p=>{let left=n;p.hand=p.hand.filter(c=>{if(left&&(type==='any'||c.type===type)){left--;return false;}return true;});});notes.push('🗑️ '+who+'から'+type+'を最大'+n+'枚破棄');},
    swap_hands:()=>{const h=self.hand;self.hand=target.hand;target.hand=h;notes.push('🎴 自分と相手の手札を交換');}
   };
   const result=PyCards.run(program,event,ctx,actions);
   demoPopups.slice(0,6).forEach(stages=>window.ChaosPopups?.previewSequence(stages));
   log.push('【on_'+event+'】 '+result.actions+'効果'+(notes.length?'':'（この条件では何も起こりません）'));
   log.push(...notes.map(n=>'  '+n));
   log.push('  → HP 自'+self.hp+' / 相手'+target.hp+'、威力増分 攻'+attack+' / 防'+guard);
  }
  out.textContent=log.join('\n');
  out.className='code-diagnostic valid';
  $('code-feedback').textContent='✓ Python風コードを実行できました（全'+events.length+'イベント）。結果を下に表示しています。';
  $('code-feedback').className='code-diagnostic valid';
 }catch(err){
  out.textContent='✕ 実行エラー：'+String(err.message||err);
  out.className='code-diagnostic invalid';
  $('code-feedback').textContent='⚠ 実行テストでエラーが発生しました。';
  $('code-feedback').className='code-diagnostic invalid';
 }
}
function saveCard(){
 getDraft();
 // In form mode, prior card.* code must NEVER override visible form fields.
 // In code mode, card.* headers and handlers are the authoritative source.
 const payload=CardForge.payload(draft,editorMode,codeText());
 if(editorMode==='code'&&(!payload.script.trim()||!validateCode(false))){
  toast('コードにエラーがあるため保存できません',true);return;
 }
 let normalized;
 try{normalized=GameEngine.card(payload,name||'作者');}
 catch(err){toast(err.message,true);return;}
 const fields=['name','description','type','emoji','power','cost','resource','element','weight','effect'];
 const savedCard={...payload,...Object.fromEntries(fields.map(k=>[k,normalized[k]]))};
 const wasEditing=!!editingCardId||!!editingPublishedId;
 let result;
 try{result=CardForge.upsert(custom,savedCard,editingCardId,crypto.randomUUID());}
 catch(err){toast(err.message,true);return;}
 custom=result.cards;
 save('cr3-cards',custom);
 // A lobby card is copied for the whole room. Apply edits to that same room ID,
 // but never silently alter an active match or someone else's creation.
 let sharedUpdated=false;
 if(state?.phase==='lobby'&&net.ready){
  const roomCard=state.customCards.find(c=>c.owner===state.me&&(
    c.id===editingPublishedId||(c.sourceLocalId&&c.sourceLocalId===result.localId)));
  if(roomCard){
   act('updateCard',{id:roomCard.id,card:{...savedCard,sourceLocalId:result.localId}});
   sharedUpdated=true;
  }
 }
 localStorage.removeItem(editorDraftKey());
 editingCardId=null;editingPublishedId=null;
 modal='';renderModal();render();
 toast('「'+savedCard.name+'」を'+(wasEditing?'上書き保存':'保存')+'しました！'+(sharedUpdated?' ロビーの公開カードへ更新を送信しました。':' ロビーから追加・更新できます。'));
}
function publishCard(id){const card=custom.find(c=>c.localId===id);if(!card)return;const data={...card,sourceLocalId:card.localId};delete data.localId;act('publish',{card:data});}
function updatePreview(){getDraft();if(!FX[draft.type].some(([v])=>v===draft.effect))draft.effect=FX[draft.type][0][0];const f=$('edit-effect');if(f){const current=f.value;f.innerHTML=FX[draft.type].map(([v,t])=>`<option value="${e(v)}">${e(t)}</option>`).join('');f.value=FX[draft.type].some(([v])=>v===current)?current:draft.effect;}$('forge-preview').innerHTML=editorCard();}
function editCodeInsert(str){
 if(window.ForgeMonaco){window.ForgeMonaco.insert(str);return;}
 const el=$('code-input');if(!el)return;
 el.focus();el.setRangeText(str,el.selectionStart,el.selectionEnd,'end');
 el.dispatchEvent(new Event('input',{bubbles:true}));
}
async function copyInvite(){const transport=localStorage.getItem('cr_transport_mode');const link=location.origin+location.pathname+'?room='+state.room+((window.ChaosTransport?.mode()||transport)!=='p2p'?'&transport='+encodeURIComponent(window.ChaosTransport?.mode()||transport):'');try{await navigator.clipboard.writeText(link);toast('招待リンクをコピーしました');}catch{prompt('このURLを友達に送ってください',link);}}
document.addEventListener('input',ev=>{
 if(modal!=='editor')return;
 if(ev.target?.id==='forge-api-search'){
  const query=ev.target.value.trim().toLocaleLowerCase();
  document.querySelectorAll('#forge-api-pills button').forEach(button=>{
   button.hidden=!!query&&!button.dataset.search.toLocaleLowerCase().includes(query);
  });
  return;
 }
 if(ev.target?.id?.startsWith('edit-'))updatePreview();
});
document.addEventListener('change',ev=>{if(modal==='editor'&&ev.target?.id==='edit-type'){draft.type=ev.target.value;draft.effect=FX[draft.type][0][0];const effect=$('edit-effect');effect.innerHTML=FX[draft.type].map(([v,t])=>`<option value="${e(v)}">${e(t)}</option>`).join('');updatePreview();}});
document.addEventListener('click',ev=>{const btn=ev.target.closest('[data-action]');if(!btn)return;const a=btn.dataset.action,id=btn.dataset.id;
 try{
 switch(a){case 'create':case 'join':joinGame(a);break;case 'invite':copyInvite();break;case 'leave':leave();break;
 case 'editor':openEditor();break;case 'new-card':if(modal==='editor')getDraft();openEditor();break;case 'edit-saved':if(modal==='editor')getDraft();openEditor(id);break;case 'edit-published':if(modal==='editor')getDraft();openEditor(null,id);break;case 'rules':modal='rules';renderModal();break;case 'close':if(modal==='editor')getDraft();modal='';renderModal();break;
 case 'start':act('start');break;case 'reset':act('reset');break;case 'add-bot':act('bot',{action:'add'});break;case 'remove-bot':act('bot',{action:'remove'});break;
 case 'card':selectCard(id);break;case 'target':target=id;render();break;case 'play':play();break;case 'defend':play();break;case 'take-hit':chosen.clear();act('defend',{cards:[]});break;
 case 'pass':act('pass');break;case 'pray':act('pray');break;case 'trade':act('trade',{mode:'heal'});break;
 case 'publish':publishCard(id);break;case 'remove':act('removeCard',{id});break;case 'delete':custom=custom.filter(c=>c.localId!==id);save('cr3-cards',custom);localStorage.removeItem('cr3-editor-draft-edit-'+id);render();break;
 case 'form-to-code':{
 getDraft();
 setCodeText(CardForge.toCode(draft));
 setEditorMode('code');
 toast('フォームの全設定と基本効果をコードに変換しました');break;
 }
 case 'code-only':setEditorMode('code');setCodeText(FULL_CARD_TEMPLATE);toast('コードだけで名前・説明・コストまで指定できます');break;
 case 'mode-form':getDraft();setEditorMode('form');break;
 case 'mode-code':getDraft();setEditorMode('code');break;
 case 'code-lightweight':window.ForgeMonaco?.fallback();break;case 'validate':validateCode();break;case 'test-code':testCardCode();break;case 'preview-popup':window.ChaosPopups?.preview('オリジナル演出','ダメージ 100 / 追加Gold +500','⚡','gold');break;case 'save-card':saveCard();break;
 case 'snippet':{
 getDraft();
 const current=codeText(),header=current.split(/^def on_/m)[0];
 const next=(header.includes('card.')?header.trimEnd()+'\n\n':'')+TEMPLATES[id];
 setCodeText(next);break;
 }
 case 'insert':editCodeInsert(btn.dataset.code);break;
 } }catch(err){toast(err.message,true);}});
$('brand').addEventListener('click',()=>{if(state){toast('対戦中は「退出」でトップに戻れます');return;}render();});
window.addEventListener('beforeunload',()=>{if(net.ready)net.disconnect();});
render();
