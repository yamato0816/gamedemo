/* CHAOS RELIC • In-game Python card API handbook
 * All function signatures/descriptions come from PyCards.docs so documentation
 * and the actual sandbox interpreter never silently diverge.
 */
(function(root){
'use strict';
const ENTRIES=root.PyCards?.docs||{};
const READS=new Set(root.PyCards?.reads||[]);
const EFFECTS=new Set(root.PyCards?.effects||[]);
const GROUPS=[
 {id:'cards',icon:'🃏',label:'手札の分析',description:'枚数・種類・威力・コスト・相手の手札',names:'len count_cards sum_power card_at count_element count_effect sum_cost highest_power lowest_power random_card hand_count hand_power hand_cost my_defense_cards target_defense_cards'},
 {id:'battle',icon:'👥',label:'戦況・プレイヤー',description:'HP・MP・Gold・状態異常・生存人数',names:'alive_count enemy_count total_hp total_shield status_turns guardian_turns has_guardian is_alive random_enemy player_at turn_player is_my_turn my_hp target_hp my_mp target_mp my_gold target_gold round_number has_status damage_dealt damage_taken incoming_damage'},
 {id:'math',icon:'🧮',label:'計算・条件分岐',description:'乱数・確率・比較・文字列・計算',names:'randint chance min max abs int round floor ceil sqrt clamp contains str format'},
 {id:'combat',icon:'⚔️',label:'攻撃・防御・回復',description:'ダメージ・HP・バリア・攻防倍率',names:'damage heal set_hp shield set_shield heal_percent boost_attack boost_defense multiply_attack'},
 {id:'resources',icon:'💰',label:'資源・状態異常',description:'MP・Gold・状態異常・交換・強奪',names:'resource set_resource status set_status remove_status cleanse steal give swap_stat'},
 {id:'inventory',icon:'🎴',label:'手札・召喚・現象',description:'ドロー・複製・破棄・守護神・超常現象',names:'draw draw_type duplicate discard clear_hand shuffle_hand swap_hands summon phenomenon'},
 {id:'visual',icon:'🎬',label:'演出・お知らせ',description:'更新できるポップ・虹色グラデーション・戦闘ログ',names:'popup popup_update popup_wait battle_log'}
].map(group=>({...group,names:group.names.split(' ')}));
const EXTRA={
 damage:['対象のHPをダメージで減らします。通常のバリアやダメージ軽減の影響を受けます。','def on_play():\n    damage("target", 100)'],
 set_hp:['対象のHPを指定値へ直接変更します。バリアを通過します。','def on_play():\n    set_hp("everyone", 1)\n    popup("終末の審判", "全員のHPが1になった！", "⚖️", "danger")'],
 heal:['HPを指定量だけ回復します。現在のゲームでは固定の最大HPを設けていません。','def on_play():\n    heal("self", 500)'],
 heal_percent:['現在HPに対して割合回復します。50を指定すれば現在HPの50%を追加で回復します。','def on_play():\n    heal_percent("self", 50)'],
 resource:['正の値で追加、負の値で減少します。指定先は self / target / everyone / all_enemies / random_enemy から選べます。','def on_play():\n    resource("self", "gold", 1000)\n    popup("黄金獲得", "現在 {self.gold} Gold", "💰", "gold")'],
 set_resource:['MPまたはGoldを指定値にします。資源の名前には mp / gold を指定します。','def on_play():\n    set_resource("target", "mp", 0)'],
 steal:['対象に選んだ相手から資源を奪い、自分へ加算します。資源は mp または gold です。','def on_play():\n    steal("mp", 100)'],
 give:['自分のMPまたはGoldを指定対象へ渡します。残高以上は渡せません。','def on_play():\n    give("target", "gold", 100)'],
 swap_stat:['自分と選んだ対象のhp/mp/gold/shieldのうち1つを交換します。','def on_play():\n    swap_stat("gold")'],
 draw_type:['指定した種類のカードを引きます。1回の処理で最大64枚です。','def on_play():\n    draw_type("self", "defense", 5)'],
 duplicate:['対象の手札から指定種類を探し、ランダムで複製します。最大64枚です。','def on_play():\n    duplicate("self", "attack", 2)'],
 clear_hand:['指定対象の手札をすべて破棄します。カード発動時に補充される場合があります。','def on_play():\n    clear_hand("target")'],
 hand_count:['指定対象のカード枚数を返します。種類を省略すると手札全部を数えます。','def on_play():\n    shields = hand_count("target", "defense")\n    boost_attack(shields * 100)'],
 hand_power:['指定対象の手札の威力合計を返します。カード種類による絞り込みもできます。','def on_guard():\n    bonus = hand_power("self", "defense")\n    boost_defense(bonus)'],
 count_cards:['handには self.hand や target.hand を指定できます。カードの種類は attack / defense / magic / item / guardian / omen です。','def on_play():\n    count = count_cards(target.hand, "defense")\n    damage("target", count * 100)'],
 sum_power:['対象手札の指定種類のカード威力を合計します。','def on_play():\n    bonus = sum_power(target.hand, "attack")\n    boost_attack(bonus)'],
 card_at:['指定位置のカードを返します。最初のカードはインデックス0です。','def on_play():\n    if len(target.hand) > 0:\n        first = card_at(target.hand, 0)\n        popup("先頭の札", "{first.name}", "🃏", "info")'],
 alive_count:['HPが0より大きいプレイヤーの人数を返します。','def on_play():\n    reward = alive_count() * 200\n    resource("self", "gold", reward)'],
 enemy_count:['生存中の自分以外のプレイヤー人数です。','def on_play():\n    damage("all_enemies", enemy_count() * 50)'],
 has_status:['指定対象に状態異常が付いているかを判定します。','def on_play():\n    if has_status("target", "poison"):\n        damage("target", 100)'],
 status_turns:['対象の状態異常の残りターン数を取得します。','def on_play():\n    rounds = status_turns("target", "poison")\n    boost_attack(rounds * 40)'],
 chance:['引数は0〜1の確率です。0.25なら25%でTrueになります。','def on_play():\n    if chance(0.25):\n        heal("self", 1000)'],
 randint:['両端を含む範囲からランダムな整数を返します。','def on_play():\n    roll = randint(1, 6)\n    damage("target", roll * 100)'],
 boost_attack:['現在処理中の攻撃カードの威力を増やします。通常の攻撃判定では防御が可能です。','def on_play():\n    bonus = hand_count("target", "defense") * 300\n    boost_attack(bonus)'],
 boost_defense:['防御判定時の防御値を追加します。防御カードでは on_guard が基本です。','def on_guard():\n    boost_defense(incoming_damage() // 2)'],
 damage_dealt:['防御後、実際に与えたHPダメージです。on_hitで使うと便利です。','def on_hit():\n    heal("self", damage_dealt() // 2)'],
 incoming_damage:['防御しようとしている攻撃の防御前威力です。','def on_guard():\n    boost_defense(incoming_damage())'],
 popup:['全員に同期するポップを開始します。5番目の引数は表示時間ms。演出中はカード操作・CPU・ターン時間を待機させます。テーマは magic/danger/success/gold/info/rainbow/aurora/sunset/neon。','def on_play():\n    popup("CR開幕", "図柄変動中…", "🎰", "neon", 900)\n    popup_update("激アツ！", "777を狙え！", "🔥", "sunset", 1300)\n    popup_update("🌈 大当たり！", "獲得 {self.gold}G", "🌈", "rainbow", 2500)'],
 popup_update:['現在のポップを閉じずに、タイトル・本文・絵文字・テーマをその場で切り替えます。テンプレート中の {a} などの変数・式は更新指示の時点で確定します。','def on_play():\n    a = randint(0,9)\n    popup("左停止", "？？？", "🎰", "info", 800)\n    popup_update("最終停止", "【{a}】【{a}】【{a}】", "🌈", "rainbow", 2200)'],
 popup_wait:['同じポップの現在の画面を追加で表示するミリ秒数。最後の更新のあとに使うとその演出を長めに保持できます。','def on_play():\n    popup("リーチ！", "あと1つ…", "⚡", "sunset", 1100)\n    popup_wait(700)\n    popup_update("結果発表", "777！", "🌈", "rainbow", 2200)'],
 battle_log:['全員の戦闘ログに任意の文章を追加します。変数の埋め込みにも対応しています。','def on_play():\n    battle_log("{self.name} がカードを発動！ 残りHP {self.hp}")'],
 format:['値を埋め込んだ文字列を返します。ポップ以外の文章生成に使用できます。','def on_play():\n    msg = format("敵HP: {target.hp}")\n    popup("観測完了", msg, "🔎", "info")'],
 summon:['自分または対象に指定した守護神を指定ターン数召喚します。','def on_play():\n    summon("self", "phoenix", 4)'],
 phenomenon:['隕石・祝福などの超常現象を発生させます。','def on_play():\n    phenomenon("meteor")'],
 has_guardian:['指定対象に守護神がいるか、指定種類の守護神がいるかを判定します。','def on_play():\n    if has_guardian("target", "phoenix"):\n        damage("target", 100)'],
 random_enemy:['生存している敵からランダムで1人を読み取ります。','def on_play():\n    enemy = random_enemy()\n    if enemy != None:\n        popup("選ばれた相手", "{enemy.name}", "🎯", "info")']
};
// Parameter descriptions supplement the live PyCards.docs signature examples.
const ARGUMENTS={
 damage:['対象（self / target / everyone / all_enemies / random_enemy）','与えるダメージ量'],
 heal:['回復する対象','回復するHP量'],
 set_hp:['対象','変更後のHP'],
 shield:['対象','追加するバリア値'],set_shield:['対象','変更後のバリア値'],
 heal_percent:['対象','現在HPに対する回復率（%）'],
 resource:['対象','資源の種類：mp / gold','加減する量（マイナス値も可）'],
 set_resource:['対象','資源：mp / gold','変更後の量'],
 status:['対象','状態異常名：poison / burn / freeze / curse / weak','継続ターン'],
 set_status:['対象','状態異常名','変更後の残りターン'],
 remove_status:['対象','解除したい状態異常名'],
 cleanse:['対象（すべての状態異常を解除）'],
 draw:['対象','引く枚数'],draw_type:['対象','カード種類：attack / defense / magic / item / guardian / omen','引く枚数'],
 duplicate:['対象','複製するカード種類、anyで全種類','複製枚数（最大64）'],
 discard:['対象','破棄するカード種類、anyで全種類','破棄枚数'],
 clear_hand:['対象（その手札を全部捨てる）'],shuffle_hand:['対象（カードの並びを変更）'],
 summon:['召喚する対象','守護神：phoenix / turtle / sprite / storm / muse','継続ターン'],
 phenomenon:['超常現象名（meteor / blessing / exchange / random など）'],
 steal:['資源：mp / gold','強奪量（選んだ対象から自分へ）'],
 give:['受け取る対象','資源：mp / gold','渡す量（所持分が上限）'],
 swap_stat:['交換する項目：hp / mp / gold / shield'],
 boost_attack:['追加する攻撃威力'],boost_defense:['追加する防御威力'],
 multiply_attack:['掛ける倍率'],
 hand_count:['対象：self または target','省略可能なカード種類（attack / defense など）'],
 hand_power:['対象：self または target','集計するカード種類（省略可能）'],
 hand_cost:['対象：self または target','集計するカード種類（省略可能）'],
 count_cards:['手札配列：self.hand または target.hand','絞り込む種類'],
 sum_power:['手札配列','絞り込む種類'],
 card_at:['手札配列','位置（0から始まる番号）'],
 count_element:['手札配列','属性：fire / water / forest / lightning / dark / none'],
 count_effect:['手札配列','基本効果の名前'],
 sum_cost:['手札配列','絞り込む種類'],
 status_turns:['対象：self または target','状態異常名'],
 has_status:['対象：self または target','状態異常名'],
 has_guardian:['対象：self または target','省略可能な守護神名'],
 popup:['ポップのタイトル。{式}が使えます','ポップ本文。{変数}や{self.hp}が使えます','絵文字（省略すると✨）','色：magic / danger / success / gold / info / rainbow / aurora / sunset / neon','最初の画面の表示時間（ms、350〜5000）'],
 popup_update:['更新後のタイトル（{式}対応）','更新後の本文（{式}対応）','新しい絵文字','グラデーションを含む色の種類','更新した画面の表示時間（ms）'],
 popup_wait:['直前の画面を延ばす時間（0〜3000ms）。合計24秒まで'],
 battle_log:['すべてのプレイヤーに見せるメッセージ'],
 format:['変数埋め込み用の文字列。{self.gold}などで値を展開'],
 chance:['0から1の確率。例：0.25 は25%'],
 randint:['乱数の最小値（含む）','乱数の最大値（含む）'],
 clamp:['元の値','範囲の最小値','範囲の最大値']
};
const BOOLEAN=new Set('has_status has_guardian is_alive is_my_turn chance contains'.split(' '));
const OBJECT=new Set('card_at random_card random_enemy player_at turn_player'.split(' '));
const STRING=new Set('format str'.split(' '));
function ret(name){return EFFECTS.has(name)?'ゲームへの効果（返り値は0）':BOOLEAN.has(name)?'True / False':OBJECT.has(name)?'カードまたはプレイヤー（該当なしならNone）':STRING.has(name)?'文字列':'数値';}
function example(name){
 if(EXTRA[name])return EXTRA[name][1];
 // The short signature hints use labels such as "value" or "array".
 // Replace them with real expressions so the example is actually runnable.
 const params=(ENTRIES[name]?.[0]||'')
  .replace(/\barray\b/g,'target.hand')
  .replace(/\bhand\b/g,'target.hand')
  .replace(/\bvalue\b/g,'100')
  .replace(/\ba\b/g,'5')
  .replace(/\bb\b/g,'10');
 const call=name+'('+params+')';
 if(EFFECTS.has(name))return 'def on_play():\n    '+call;
 if(OBJECT.has(name))return 'def on_play():\n    picked = '+call+
  '\n    if picked != None:\n        popup("取得結果", "{picked.name}", "📘", "info")';
 return 'def on_play():\n    result = '+call+
  '\n    popup("計算結果", "結果 {result}", "📘", "info")';
}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
let rootEl=null,search='',group='all',view='functions',firstEntry=null;
function all(){
 const known=new Set(GROUPS.flatMap(g=>g.names));
 const extras=Object.keys(ENTRIES).filter(n=>!known.has(n));
 return GROUPS.concat(extras.length?[{id:'other',icon:'🧩',label:'その他',description:'その他のAPI',names:extras}]:[]);
}
function groups(){
 const total=Object.keys(ENTRIES).length;
 return '<button class="cr-api-filter'+(group==='all'?' active':'')+'" data-api-group="all">すべて <small>'+total+'</small></button>'+
 all().map(g=>'<button class="cr-api-filter'+(group===g.id?' active':'')+'" data-api-group="'+g.id+'"><span>'+g.icon+'</span>'+escape(g.label)+' <small>'+g.names.filter(n=>ENTRIES[n]).length+'</small></button>').join('');
}
function card(name){
 const spec=ENTRIES[name];if(!spec)return '';
 const info=EXTRA[name]?.[0]||spec[1];
 const demo=example(name);
 return '<details class="cr-api-entry" data-api-entry="'+escape(name)+'"'+(name===firstEntry?' open':'')+'>'+
 '<summary><div class="cr-api-entry-title"><code>'+escape(name)+'</code><span class="cr-api-entry-type">'+(EFFECTS.has(name)?'効果':'取得')+'</span></div>'+
 '<div class="cr-api-entry-sub">'+escape(spec[1])+'</div><span class="cr-api-chevron">⌄</span></summary>'+
 '<div class="cr-api-entry-body"><p>'+escape(info)+'</p>'+
 '<div class="cr-api-entry-facts"><div><strong>呼び出し方</strong><code>'+escape(name+'('+spec[0]+')')+'</code></div>'+
 '<div><strong>返り値</strong><span>'+escape(ret(name))+'</span></div></div>'+
 (ARGUMENTS[name]?'<div class="cr-api-arguments"><strong>引数の意味</strong><ol>'+ARGUMENTS[name].map(a=>'<li>'+escape(a)+'</li>').join('')+'</ol></div>':'')+
 '<div class="cr-api-code-head"><strong>使用例</strong><button type="button" data-api-copy="'+escape(name)+'"> <span>⧉</span> コードをコピー</button></div>'+
 '<pre class="cr-api-code"><code>'+escape(demo)+'</code></pre></div></details>';
}
function matches(name){
 if(group!=='all'&&!all().find(g=>g.id===group)?.names.includes(name))return false;
 const desc=ENTRIES[name]||[];
 const category=all().find(g=>g.names.includes(name));
 return !search||[name,...desc,EXTRA[name]?.[0],category?.label,category?.description].join(' ').toLocaleLowerCase().includes(search);
}
function renderListing(){
 const names=Object.keys(ENTRIES).filter(matches);
 const list=rootEl?.querySelector('#cr-api-list');
 if(!list)return;
 list.innerHTML=names.length?names.map(card).join(''):'<div class="cr-api-empty">🔍 条件に一致する関数がありません。検索語を変えてみてください。</div>';
 const count=rootEl.querySelector('#cr-api-result-count');
 if(count)count.textContent=names.length+'件の関数';
}
const EVENTS=[
 ['on_play','カードを使用したとき','def on_play():\n    heal("self", 100)'],
 ['on_hit','攻撃が相手へ命中したとき','def on_hit():\n    heal("self", damage_dealt() // 2)'],
 ['on_guard','防御の威力を決める前','def on_guard():\n    boost_defense(incoming_damage())'],
 ['on_defend','防御カードを使用したとき','def on_defend():\n    shield("self", 50)'],
 ['on_block','攻撃を完全に防いだとき','def on_block():\n    heal("self", 30)'],
 ['on_turn_start','守護神の持ち主のターン開始時','def on_turn_start():\n    resource("self", "mp", 5)']
];
function quickstart(){
 return '<div class="cr-api-reading">'+
 '<div class="cr-api-reading-hero"><span>START HERE</span><h3>Python風コードで、自分だけのカードを。</h3><p>カオスレリックでは、自由なPythonそのものではなく、ゲーム専用の安全な構文と関数を使います。</p></div>'+
 '<h4>最初の1枚</h4><pre class="cr-api-code"><code>'+escape('card.name = "黄金の盾"\ncard.type = "defense"\ncard.emoji = "🛡️"\ncard.power = 100\ncard.cost = 5\ncard.resource = "mp"\ncard.effect = "normal"\n\ndef on_guard():\n    bonus = hand_count("self", "defense") * 50\n    boost_defense(bonus)\n    popup("守護強化！", "防御 +{bonus}", "🛡️", "success")')+'</code></pre>'+
 '<h4>変数から値を取得</h4>'+
 '<div class="cr-api-glossary"><div><strong><code>self.hp</code></strong><span>使用者自身のHP。<code>self.mp</code>・<code>self.gold</code> も使用できます。</span></div>'+
 '<div><strong><code>target.hp</code></strong><span>対象のHP。<code>target.hand</code> で対象の手札が読めます。</span></div>'+
 '<div><strong><code>players</code></strong><span>プレイヤー一覧。<code>for p in players:</code> で順番に調べられます。</span></div>'+
 '<div><strong><code>card.power</code></strong><span>カードの威力。設定はコード先頭で <code>card.power = 100</code> と記述します。</span></div></div>'+
 '<h4>対象の指定</h4><div class="cr-api-tags">'+
 ['self','target','everyone','all_enemies','random_enemy'].map(t=>'<code>'+t+'</code>').join('')+'</div>'+
 '<p>関数の対象には、上記を文字列で指定します。<code>damage("target", 100)</code> は対象にダメージを与えます。</p>'+
 '<h4>ポップに計算結果を表示</h4><pre class="cr-api-code"><code>'+escape('def on_play():\n    bonus = alive_count() * 100\n    resource("self", "gold", bonus)\n    popup("賞金ゲット！", "生存人数 × 100 = {bonus} Gold / 今は {self.gold}G", "💰", "gold")')+'</code></pre>'+
 '<p>ポップ色は <code>magic</code>（紫）、<code>danger</code>（赤）、<code>success</code>（緑）、<code>gold</code>（金）、<code>info</code>（青）、<code>rainbow</code>（虹）、<code>aurora</code>（オーロラ）、<code>sunset</code>（夕焼け）、<code>neon</code>（ネオン）。<code>{bonus}</code> や <code>{target.hp}</code> は実行時に置換されます。</p>'+
 '<h4>動的な演出・busy制御</h4><pre class="cr-api-code"><code>'+escape('def on_play():\n    a = randint(0, 9)\n    popup("図柄変動", "？？？", "🎰", "neon", 900)\n    popup_update("左停止", "【{a}】？？", "⚡", "sunset", 1000)\n    popup_wait(600)\n    popup_update("結果", "【{a}】【{a}】【{a}】", "🌈", "rainbow", 2000)')+'</code></pre>'+
 '<p>ポップが終わるまでゲーム操作と次のターンが待機します。効果の数値計算自体は発動時に一括実行されます。1演出は最大12段階、演出による待機は最大24秒です。</p>'+
 '<h4>書き方の注意</h4><p>インデントはスペース4個、イベントは <code>def on_play():</code> のように書きます。使用できるのはゲームのAPIだけで、一般Pythonの <code>import</code> や外部ファイル操作には対応していません。</p></div>';
}
function eventPage(){
 return '<div class="cr-api-reading"><div class="cr-api-reading-hero"><span>EVENTS & HANDLERS</span><h3>いつ発動するかを決める</h3><p>カード効果はイベント関数の中に書きます。カード1枚に複数のイベント関数を定義できます。</p></div>'+
 EVENTS.map(([name,description,sample])=>'<section class="cr-api-event"><div><h4><code>'+name+'()</code></h4><p>'+escape(description)+'</p></div><pre class="cr-api-code"><code>'+escape(sample)+'</code></pre><button data-api-copy-event="'+name+'" type="button">⧉ コピー</button></section>').join('')+
 '<p>イベント関数は <code>on_play</code> / <code>on_hit</code> / <code>on_guard</code> / <code>on_defend</code> / <code>on_block</code> / <code>on_turn_start</code> に対応します。</p></div>';
}
function render(){
 if(!rootEl)return;
 const main=rootEl.querySelector('#cr-api-panel');
 rootEl.querySelectorAll('[data-api-view]').forEach(el=>{el.classList.toggle('active',el.dataset.apiView===view);el.setAttribute('aria-selected',String(el.dataset.apiView===view));});
 if(view==='intro'){main.innerHTML=quickstart();return;}
 if(view==='events'){main.innerHTML=eventPage();return;}
 main.innerHTML='<div class="cr-api-toolbar"><div class="cr-api-search-wrap"><span>⌕</span><input id="cr-api-search" type="search" autocomplete="off" placeholder="例：HP、Gold、防御札、popup…" aria-label="関数名や日本語の説明で検索" value="'+escape(search)+'"></div><small id="cr-api-result-count"></small></div>'+
 '<div class="cr-api-filters" id="cr-api-filters">'+groups()+'</div>'+
 '<div class="cr-api-list" id="cr-api-list"></div>';
 renderListing();
}
function close(){rootEl?.remove();rootEl=null;document.body.classList.remove('cr-api-guide-open');}
function open(){
 if(rootEl){rootEl.querySelector('#cr-api-search')?.focus();return;}
 rootEl=document.createElement('div');rootEl.className='cr-api-overlay';rootEl.id='cr-api-guide';
 rootEl.innerHTML='<section class="cr-api-shell" role="dialog" aria-label="カード関数図鑑" aria-modal="true">'+
 '<header class="cr-api-header"><div><span>CHAOS RELIC / CARD SCRIPT REFERENCE</span><h2>📚 カード関数図鑑</h2><p>全'+Object.keys(ENTRIES).length+'関数・イベント・コード例をサイト内で検索</p></div><button class="cr-api-close" data-api-close aria-label="図鑑を閉じる" type="button">×</button></header>'+
 '<nav class="cr-api-topnav" aria-label="関数図鑑のページ"><button data-api-view="intro">✨ はじめに</button><button data-api-view="functions">ƒ 関数を探す</button><button data-api-view="events">⚡ 発動タイミング</button></nav>'+
 '<div id="cr-api-panel" class="cr-api-panel"></div>'+
 '<footer class="cr-api-footer"><span>💡 実行するコードはカード工房の「🐍 コードで作成」に貼り付けてください。</span><button data-api-close type="button">閉じる</button></footer></section>';
 rootEl.addEventListener('click',event=>{if(event.target===rootEl)close()});
 document.body.append(rootEl);document.body.classList.add('cr-api-guide-open');render();
}
document.addEventListener('click',async event=>{
 const launch=event.target.closest('[data-api-guide]');
 if(launch){event.preventDefault();open();return;}
 if(!rootEl)return;
 const target=event.target.closest('button');if(!target||!rootEl.contains(target))return;
 if(target.hasAttribute('data-api-close')){close();return;}
 if(target.dataset.apiView){view=target.dataset.apiView;render();return;}
 if(target.dataset.apiGroup){group=target.dataset.apiGroup;firstEntry=null;rootEl.querySelector('#cr-api-filters').innerHTML=groups();renderListing();return;}
 const name=target.dataset.apiCopy;
 const eventName=target.dataset.apiCopyEvent;
 if(name||eventName){
  const code=name?example(name):EVENTS.find(e=>e[0]===eventName)?.[2];
  if(!code)return;
  try{
   await navigator.clipboard.writeText(code);
   const original=target.textContent;target.textContent='✓ コピーしました';
   setTimeout(()=>{if(target.isConnected)target.textContent=original},1700);
  }catch{window.prompt('コードをコピーしてください',code);}
 }
});
document.addEventListener('input',event=>{
 if(event.target?.id!=='cr-api-search'||!rootEl)return;
 search=event.target.value.trim().toLocaleLowerCase();firstEntry=null;renderListing();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&rootEl)close()});
const nav=document.querySelector('.header-right');
if(nav){
 const button=document.createElement('button');
 button.type='button';button.className='header-link cr-api-launch';
 button.dataset.apiGuide='open';button.innerHTML='<span class="cr-header-icon">📚</span><span class="cr-header-label">関数図鑑</span>';
 button.title='カード制作の関数・変数・イベントを調べる';
 nav.insertBefore(button,nav.querySelector('.header-cta')||null);
}
root.ChaosApiGuide={open,close,groups:GROUPS,example};
})(typeof window!=='undefined'?window:globalThis);
