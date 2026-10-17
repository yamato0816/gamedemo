/* 依存なしのPython構文サブセット。Python本体やevalを使わない安全な構文木インタプリタ */
(function(root){
'use strict';
const EVENTS=['play','hit','defend','block','turn_start','guard'];
const EFFECTS=['damage','heal','set_hp','status','shield','resource','draw','cleanse','summon','phenomenon','steal','boost_attack','boost_defense','discard','swap_hands','multiply_attack','set_resource','set_shield','set_status','remove_status','heal_percent','draw_type','duplicate','clear_hand','give','swap_stat','shuffle_hand','popup','popup_update','popup_wait','battle_log'];
const READS=['len','count_cards','sum_power','card_at','count_element','count_effect','sum_cost','highest_power','lowest_power','random_card','hand_count','hand_power','hand_cost','alive_count','enemy_count','total_hp','total_shield','status_turns','guardian_turns','has_guardian','is_alive','random_enemy','player_at','turn_player','is_my_turn','format','str','floor','ceil','sqrt','clamp','contains','damage_dealt','damage_taken','my_hp','target_hp','my_mp','target_mp','my_gold','target_gold','my_defense_cards','target_defense_cards','incoming_damage','round_number','has_status','randint','chance','min','max','abs','int','round'];
const WHOS=['self','target','everyone','all_enemies','random_enemy'];
const ST=['poison','burn','freeze','curse','weak'];
const GD=['phoenix','turtle','sprite','storm','muse'];
const PH=['random','blessing','meteor','exchange','silence','fog','mana_rain','earthquake'];
const CARD_TYPES=['attack','defense','magic','item','guardian','omen'];
const POPUP_THEMES=['magic','danger','success','gold','info','rainbow','aurora','sunset','neon'];
// A public catalogue drives Monaco suggestions and the mobile insert palette.
const API_DOCS={
 len:['array','配列または文字列の長さ'],count_cards:['target.hand, "defense"','指定したカード種類の枚数'],
 sum_power:['target.hand, "attack"','指定種類の威力合計'],sum_cost:['target.hand, "attack"','指定種類のコスト合計'],
 card_at:['target.hand, 0','指定位置のカードを取得'],
 count_element:['target.hand, "fire"','特定属性のカード枚数'],count_effect:['target.hand, "heal"','特定効果のカード枚数'],
 highest_power:['target.hand, "attack"','指定種類の最大威力（該当なしなら0）'],lowest_power:['target.hand, "defense"','指定種類の最小威力（該当なしなら0）'],
 random_card:['target.hand','手札からランダムなカードを選ぶ'],
 hand_count:['"target", "defense"','対象の防御札の枚数、種類を省略すると全手札'],
 hand_power:['"target", "attack"','対象手札の威力合計'],hand_cost:['"target", "magic"','対象手札のコスト合計'],
 alive_count:['','生存プレイヤーの人数'],enemy_count:['','生存する敵の人数'],
 total_hp:['','生存プレイヤーのHP合計'],total_shield:['','生存プレイヤーのバリア合計'],
 status_turns:['"target", "poison"','対象の状態異常残りターン'],
 guardian_turns:['"self"','守護神の残りターン'],
 has_guardian:['"target", "phoenix"','指定守護神がいるか（省略で種類問わず）'],
 is_alive:['"target"','対象が生存しているか'],
 random_enemy:['','生存中の敵をランダムで取得'],
 player_at:['0','全プレイヤーの指定位置を取得'],
 turn_player:['','現在手番のプレイヤーを取得'],is_my_turn:['','自分のターンか'],
 format:['"残りHP {target.hp} / 倍率 {bonus}"','波括弧内の式を実際の値に置換'],
 str:['target.hp','数値や真偽値を文字列に変換'],
 floor:['value','小数点以下を切り捨て'],ceil:['value','小数点以下を切り上げ'],
 sqrt:['value','平方根'],clamp:['value, 0, 100','指定範囲に数値を収める'],
 contains:['"fire", "ir"','文字列や配列に指定値が含まれるか'],
 damage_dealt:['','与えた実ダメージ'],damage_taken:['','受けた実ダメージ'],
 my_hp:['','自分のHP'],target_hp:['','対象のHP'],
 my_mp:['','自分のMP'],target_mp:['','対象のMP'],my_gold:['','自分のGold'],target_gold:['','対象のGold'],
 my_defense_cards:['','自分の防御札枚数'],target_defense_cards:['','対象の防御札枚数'],
 incoming_damage:['','防御前の攻撃威力'],round_number:['','現在のラウンド'],
 has_status:['"target", "poison"','状態異常の有無'],
 randint:['1, 6','指定範囲のランダム整数'],chance:['0.5','指定確率でTrue'],
 min:['a, b','最小値'],max:['a, b','最大値'],abs:['value','絶対値'],
 int:['value','整数部分'],round:['value','四捨五入'],
 damage:['"target", 100','指定対象にダメージ'],heal:['"self", 100','HPを回復'],
 set_hp:['"everyone", 1','HPを指定値に設定（バリアを通さない）'],
 shield:['"self", 100','バリアを追加'],set_shield:['"self", 100','バリアを指定値に設定'],
 resource:['"self", "gold", 100','MPまたはGoldを増減'],
 set_resource:['"self", "mp", 500','MPまたはGoldを指定値に設定'],
 status:['"target", "poison", 3','状態異常を付与'],
 set_status:['"target", "poison", 1','残りターンを指定値に設定'],
 remove_status:['"target", "poison"','指定した状態異常だけ解除'],
 heal_percent:['"self", 50','現在HPの指定パーセントを回復'],
 draw:['"self", 3','カードを引く'],
 draw_type:['"self", "defense", 3','指定種類のカードを引く'],
 duplicate:['"self", "attack", 2','対象の手札にある指定種類のカードを複製'],
 discard:['"target", "defense", 2','指定種類のカードを破棄'],
 clear_hand:['"target"','対象の手札を全部破棄'],
 shuffle_hand:['"self"','手札の順番をシャッフル'],
 swap_hands:['','対象と手札を丸ごと交換'],swap_stat:['"hp"','自分と対象のHP/MP/Gold/バリアを交換'],
 give:['"target", "gold", 100','自分のGold/MPを対象へ渡す'],
 steal:['"mp", 50','相手のMP/Goldを奪う'],
 cleanse:['"self"','状態異常をすべて解除'],
 summon:['"self", "phoenix", 3','守護神を召喚'],
 phenomenon:['"meteor"','超常現象を発生'],
 boost_attack:['100','現在の攻撃威力に加算'],
 multiply_attack:['3','現在の攻撃威力を指定倍率に'],
 boost_defense:['100','現在の防御力に加算'],
 popup:['"大当たり！", "図柄 {a}{b}{c}", "🎰", "rainbow", 1800','ポップを表示。タイトル・本文・アイコン・色・表示時間（ms）'],
 popup_update:['"リーチ！", "【{a}】【{b}】？", "🔥", "sunset", 1200','同じポップの文字・変数・アイコン・色を次の段階へ切り替える'],
 popup_wait:['700','直前のポップの今の段階を指定ms長く表示する（上限あり）'],
 battle_log:['"ボーナス {bonus} を獲得！"','カスタム戦闘ログを全員へ表示']
};
const fail=(msg,line)=>{throw Error((line?`行 ${line}: `:'')+msg);};
function tokenize(src,line){
  const tokens=[];let i=0;
  while(i<src.length){
    if(/\s/.test(src[i])){i++;continue;}
    const sub=src.slice(i); let m;
    if((m=sub.match(/^(?:\d+(?:\.\d+)?|\.\d+)/))){tokens.push({t:'number',v:Number(m[0])});i+=m[0].length;continue;}
    if(src[i]==='"'||src[i]==="'"){
      const q=src[i++];let s='';let ended=false;
      while(i<src.length){const c=src[i++];if(c===q){ended=true;break;}if(c==='\\'){if(i>=src.length)fail('不完全な文字列',line);const cc=src[i++];s+=({n:'\n',t:'\t',r:'\r'}[cc]||cc);}else s+=c;}
      if(!ended||s.length>8192)fail('文字列を確認してください',line);tokens.push({t:'string',v:s});continue;
    }
    if((m=sub.match(/^[a-zA-Z_][a-zA-Z_0-9]*/))){tokens.push({t:'name',v:m[0]});i+=m[0].length;continue;}
    if((m=sub.match(/^(==|!=|>=|<=|\/\/|\*\*|\+=|-=|\*=|\/=|[()+\-*\/%!,<>:=.\[\]])/))){tokens.push({t:m[0],v:m[0]});i+=m[0].length;continue;}
    fail('使用できない記号: '+src[i],line);
  }
  tokens.push({t:'eof'});return tokens;
}
const precedence={or:1,and:2,'==':3,'!=':3,'>':3,'<':3,'>=':3,'<=':3,'+':4,'-':4,'*':5,'/':5,'//':5,'%':5,'**':7};
function parseExpression(source,line){
  const t=tokenize(source,line);let pos=0;
  const peek=()=>t[pos];const take=()=>t[pos++];
  const accept=(s)=>{if(peek().t===s||(peek().t==='name'&&peek().v===s)){take();return true;}return false;};
  const expect=(s)=>{if(!accept(s))fail('「'+s+'」が必要です',line);};
  function expr(min=0){
    let x;const a=take();
    if(a.t==='number'||a.t==='string')x={k:'literal',v:a.v};
    else if(a.t==='name'){
      if(['True','False','None'].includes(a.v))x={k:'literal',v:a.v==='True'?true:a.v==='False'?false:null};
      else if(a.v==='not')x={k:'unary',op:'not',a:expr(3)};
      else if(accept('(')){
        // Python-style multiline calls may end with a trailing comma.
        const args=[];
        if(!accept(')')){
          while(true){
            args.push(expr());
            if(args.length>8)fail('引数は8個までです',line);
            if(accept(')'))break;
            expect(',');
            if(accept(')'))break;
          }
        }
        if(![...READS,...EFFECTS].includes(a.v))fail('許可されていない関数: '+a.v,line);
        x={k:'call',f:a.v,args};
      }else x={k:'var',name:a.v};
    }else if(a.t==='('){x=expr();expect(')');}
    else if(a.t==='-'||a.t==='+')x={k:'unary',op:a.t,a:expr(6)};
    else fail('式を解釈できません',line);
    while(peek().t==='.'||peek().t==='['){
      if(accept('.')){
        const field=take();if(field.t!=='name'||field.v.startsWith('_'))fail('属性名が不正です',line);
        x={k:'attr',a:x,name:field.v};
      }else{
        take();const index=expr();expect(']');x={k:'index',a:x,index};
      }
    }
    while(true){const op=peek().t==='name'?peek().v:peek().t;const prec=precedence[op];if(prec==null||prec<min)break;
      take();x={k:'binary',op,a:x,b:expr(prec+(op==='**'?0:1))};
    }
    return x;
  }
  const ast=expr();if(peek().t!=='eof')fail('式の末尾を確認してください',line);return ast;
}
function cleanLine(s){let result='',quoted=null,escape=false;for(const c of s){
  if(escape){result+=c;escape=false;continue;}
  if(quoted&&c==='\\'){escape=true;result+=c;continue;}
  if(quoted&&c===quoted){quoted=null;result+=c;continue;}
  if(!quoted&&(c==='"'||c==="'")){quoted=c;result+=c;continue;}
  if(!quoted&&c==='#')break;
  result+=c;
}return result.trimEnd();}
function compile(code){
  if(typeof code!=='string'||code.length>30000)fail('コードは30000文字以内です');
  const physical=code.replace(/\r\n?/g,'\n').split('\n').map((raw,index)=>{
    if(raw.includes('\t'))fail('インデントはスペースを使用してください',index+1);
    const s=cleanLine(raw),indent=(s.match(/^ */)||[''])[0].length;
    return {text:s.trim(),indent,line:index+1};
  }).filter(x=>x.text);
  if(physical.length>600)fail('コードは600行以内です');
  // Join physical lines only while () or [] remain open. The block parser sees
  // the original indentation and line number of the first logical line.
  const lines=[],open=[];
  let pending=null;
  for(const cur of physical){
    if(pending){
      // Python normally aligns the final ')' with the opening function call.
      // Other continued arguments should be indented into the call.
      if(cur.indent<pending.indent||
        (cur.indent===pending.indent&&!/^[)\],]+$/.test(cur.text)))
        fail('複数行の引数は関数の開始行より深くインデントしてください',cur.line);
      if(cur.line-pending.line>40)fail('1つの式が長すぎます（最大40行）',pending.line);
      pending.text+=' '+cur.text;
    }else pending={...cur};
    let quote='',escaped=false;
    for(const ch of cur.text){
      if(quote){
        if(escaped){escaped=false;continue;}
        if(ch==='\\'){escaped=true;continue;}
        if(ch===quote)quote='';
        continue;
      }
      if(ch==='"'||ch==="'"){quote=ch;continue;}
      if(ch==='('||ch==='['){open.push({char:ch,line:cur.line});continue;}
      if(ch===')'||ch===']'){
        const last=open.pop();
        if(!last||(last.char==='('?ch!==')':ch!==']'))fail('括弧の対応が正しくありません',cur.line);
      }
    }
    if(quote)fail('文字列の引用符が閉じていません',cur.line);
    if(!open.length){lines.push(pending);pending=null;}
  }
  if(pending)fail('括弧が閉じられていません',open[open.length-1]?.line||pending.line);
  let at=0,nodes=0;
  const newNode=()=>{if(++nodes>1200)fail('構文ノードが多すぎます');};
  function block(level){
    const list=[];
    while(at<lines.length){const cur=lines[at];if(cur.indent<level)break;
      if(cur.indent!==level)fail('インデントの幅が正しくありません',cur.line);
      newNode();const s=cur.text; at++;
      const loop=s.match(/^for\s+([a-zA-Z_][\w]*)\s+in\s+(.+):$/);
      if(loop){list.push({s:'for',name:loop[1],expr:parseExpression(loop[2],cur.line),body:child(cur)});continue;}
      if(/^if\s+.+:$/.test(s)){
        const when=[{test:parseExpression(s.slice(3,-1),cur.line),body:child(cur)}];let otherwise=[];
        while(at<lines.length&&lines[at].indent===level&&/^(elif\s+.+:|else:)$/.test(lines[at].text)){
          const e=lines[at++];if(e.text==='else:'){otherwise=child(e);break;}
          when.push({test:parseExpression(e.text.slice(5,-1),e.line),body:child(e)});
        }list.push({s:'if',when,otherwise});continue;
      }
      const assignment=s.match(/^([a-zA-Z_][\w]*)\s*(=|\+=|-=|\*=|\/=)\s*(.+)$/);
      if(assignment){const key=assignment[1];if(READS.includes(key)||EFFECTS.includes(key)||['True','False','None'].includes(key))fail('予約語には代入できません',cur.line);
        list.push({s:'set',name:key,op:assignment[2],expr:parseExpression(assignment[3],cur.line)});continue;}
      const call=parseExpression(s,cur.line);
      if(call.k!=='call'||!EFFECTS.includes(call.f))fail('単独の文では効果関数のみ呼べます',cur.line);
      list.push({s:'effect',expr:call});
    }
    return list;
  }
  function child(parent){if(at>=lines.length||lines[at].indent<=parent.indent)fail('インデントされた処理が必要です',parent.line);
    if(lines[at].indent-parent.indent!==4)fail('インデントは4スペースにしてください',lines[at].line);
    return block(parent.indent+4);
  }
  const handlers={},meta={};
  const fields=['name','description','type','emoji','power','cost','effect','element','resource','weight'];
  while(at<lines.length){const cur=lines[at++];if(cur.indent!==0)fail('関数の定義は左端に書いてください',cur.line);
    const header=cur.text.match(/^card\.(\w+)\s*=\s*(.+)$/);
    if(header){
      if(!fields.includes(header[1]))fail('カード属性に指定できません: '+header[1],cur.line);
      const node=parseExpression(header[2],cur.line);
      if(node.k!=='literal'||(typeof node.v!=='string'&&typeof node.v!=='number'))fail('カード設定には文字列・数値のリテラルを指定してください',cur.line);
      meta[header[1]]=node.v;continue;
    }
    const m=cur.text.match(/^def on_(play|hit|defend|block|guard|turn_start)\(\):$/);
    if(!m)fail('def on_play(): などのイベント関数だけ定義できます',cur.line);
    if(handlers[m[1]])fail('同じイベントの関数は1つまでです',cur.line);
    handlers[m[1]]=child(cur);
  }
  if(!Object.keys(handlers).length&&!Object.keys(meta).length)fail('card.name = "..." または def on_play(): が必要です');
  return {version:2,handlers,meta};
}
function run(program,event,ctx,actions){
  if(!program||![1,2].includes(program.version)||!EVENTS.includes(event))return {actions:0};
  const stmts=program.handlers?.[event];if(!stmts)return {actions:0};
  const vars=Object.create(null);let steps=0,count=0;
  // Snapshots, never expose live mutable game objects or the Firebase view.
  const cardView=c=>({name:String(c.name||''),description:String(c.description||''),type:String(c.type||''),effect:String(c.effect||''),power:Number(c.power)||0,cost:Number(c.cost)||0,resource:String(c.resource||'mp'),weight:Number(c.weight)||0,element:String(c.element||''),emoji:String(c.emoji||'')});
  const playerView=p=>p?({id:String(p.id||''),name:String(p.name||''),hp:Number(p.hp)||0,mp:Number(p.mp)||0,gold:Number(p.gold)||0,shield:Number(p.shield)||0,status:{...(p.status||{})},guardian:p.guardian?{kind:String(p.guardian.kind||''),turns:Number(p.guardian.turns)||0}:null,hand:Array.isArray(p.hand)?p.hand.map(cardView):[]}):null;
  vars.self=playerView(ctx.self);vars.target=playerView(ctx.target);
  vars.card=cardView(ctx.card||{});
  vars.players=(ctx.r?.players||[]).map(playerView);
  const tick=()=>{if(++steps>4000)fail('処理保護：実行ステップ数を超えました');};
  const n=v=>{const num=Number(v);if(Number.isNaN(num))return 0;return Math.max(-Number.MAX_SAFE_INTEGER,Math.min(Number.MAX_SAFE_INTEGER,num));};
  const cap=(v,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Math.max(lo,Math.min(hi,Math.round(n(v))));
  const check=(val,list,msg)=>{if(!list.includes(val))fail('無効な'+msg+': '+String(val));return val;};
  const who=v=>check(v,WHOS,'対象');
  const whoPlayer=v=>v==='self'?ctx.self:v==='target'?ctx.target:null;
  const filterCards=(hand,type='any')=>{
    if(!Array.isArray(hand))return [];
    return type==='any'||type===''?hand:hand.filter(c=>c?.type===type);
  };
  function renderTemplate(template){
    const source=String(template??'');
    if(source.length>900)fail('表示する文章は900文字以内にしてください');
    let count=0;
    return source.replace(/\{\{|\}\}|\{([^{}]{1,160})\}/g, token=>{
      if(token==='{{')return '{';
      if(token==='}}')return '}';
      if(++count>24)fail('文字列の変数埋め込みは24箇所までです');
      const value=evaluate(parseExpression(token.slice(1,-1)));
      if(value==null)return '';
      if(typeof value==='object')fail('オブジェクトは直接表示できません。item.name など属性を選んでください');
      return String(value).slice(0,96);
    }).slice(0,900);
  }
  function fun(f,args,kind){
    const arg=(i,defaultV)=>args[i]===undefined?defaultV:args[i];
    const from=(w)=>w==='target'?ctx.target:ctx.self;
    switch(f){
      case 'len':{const x=arg(0,[]);return Array.isArray(x)||typeof x==='string'?x.length:0;}
      case 'count_cards':{const a=arg(0,[]),type=arg(1,'');return Array.isArray(a)?a.filter(x=>!type||x?.type===type).length:0;}
      case 'sum_power':{const a=arg(0,[]),type=arg(1,'');return Array.isArray(a)?n(a.reduce((sum,c)=>sum+(!type||c?.type===type?(Number(c?.power)||0):0),0)):0;}
      case 'card_at':{const a=arg(0,[]),idx=cap(arg(1,0));return Array.isArray(a)?a[idx]||null:null;}
      case 'count_element':{const a=arg(0,[]),element=String(arg(1,''));return Array.isArray(a)?a.filter(c=>c?.element===element).length:0;}
      case 'count_effect':{const a=arg(0,[]),effect=String(arg(1,''));return Array.isArray(a)?a.filter(c=>c?.effect===effect).length:0;}
      case 'sum_cost':return n(filterCards(arg(0,[]),arg(1,'any')).reduce((acc,c)=>acc+(Number(c?.cost)||0),0));
      case 'highest_power':{const cards=filterCards(arg(0,[]),arg(1,'any'));return cards.length?Math.max(...cards.slice(0,1024).map(c=>n(c?.power))):0;}
      case 'lowest_power':{const cards=filterCards(arg(0,[]),arg(1,'any'));return cards.length?Math.min(...cards.slice(0,1024).map(c=>n(c?.power))):0;}
      case 'random_card':{const cards=arg(0,[]);return Array.isArray(cards)&&cards.length?cards[Math.floor(Math.random()*cards.length)]:null;}
      case 'hand_count':return filterCards(whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.hand,arg(1,'any')).length;
      case 'hand_power':return n(filterCards(whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.hand,arg(1,'any')).reduce((sum,c)=>sum+(Number(c?.power)||0),0));
      case 'hand_cost':return n(filterCards(whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.hand,arg(1,'any')).reduce((sum,c)=>sum+(Number(c?.cost)||0),0));
      case 'alive_count':return (ctx.r?.players||[]).filter(p=>p.hp>0).length;
      case 'enemy_count':return (ctx.r?.players||[]).filter(p=>p.hp>0&&p.id!==ctx.self.id).length;
      case 'total_hp':return n((ctx.r?.players||[]).filter(p=>p.hp>0).reduce((sum,p)=>sum+p.hp,0));
      case 'total_shield':return n((ctx.r?.players||[]).filter(p=>p.hp>0).reduce((sum,p)=>sum+(p.shield||0),0));
      case 'status_turns':return whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.status?.[check(arg(1,'poison'),ST,'状態異常')]||0;
      case 'guardian_turns':return whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.guardian?.turns||0;
      case 'has_guardian':{const guardian=whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.guardian;const type=arg(1,'any');return !!guardian&&(type==='any'||guardian.kind===type);}
      case 'is_alive':return (whoPlayer(check(arg(0,'self'),['self','target'],'対象'))?.hp||0)>0;
      case 'random_enemy':{const players=(ctx.r?.players||[]).filter(p=>p.hp>0&&p.id!==ctx.self.id);return players.length?playerView(players[Math.floor(Math.random()*players.length)]):null;}
      case 'player_at':return playerView((ctx.r?.players||[])[cap(arg(0,0),0,1024)]||null);
      case 'turn_player':return playerView((ctx.r?.players||[])[ctx.r?.turnIndex||0]||null);
      case 'is_my_turn':return (ctx.r?.players||[])[ctx.r?.turnIndex||0]?.id===ctx.self.id;
      case 'format':return renderTemplate(arg(0,''));
      case 'str':return String(arg(0,'')??'').slice(0,900);
      case 'floor':return Math.floor(n(arg(0,0)));
      case 'ceil':return Math.ceil(n(arg(0,0)));
      case 'sqrt':return Math.sqrt(Math.max(0,n(arg(0,0))));
      case 'clamp':{const val=n(arg(0,0)),a=n(arg(1,0)),b=n(arg(2,100));return Math.max(Math.min(a,b),Math.min(Math.max(a,b),val));}
      case 'contains':{const val=arg(0,''),search=arg(1,'');return Array.isArray(val)?val.includes(search):String(val).includes(String(search));}
      case 'damage_dealt':return ctx.damageDealt||0;
      case 'damage_taken':return ctx.damageTaken||0;
      case 'my_hp':return ctx.self.hp;
      case 'target_hp':return ctx.target?.hp||0;
      case 'my_mp':return ctx.self.mp;
      case 'target_mp':return ctx.target?.mp||0;
      case 'my_gold':return ctx.self.gold;
      case 'target_gold':return ctx.target?.gold||0;
      case 'my_defense_cards':return ctx.ownDefenseCount??ctx.self.hand.filter(c=>c.type==='defense').length;
      case 'target_defense_cards':return ctx.target?.hand?.filter(c=>c.type==='defense').length||0;
      case 'incoming_damage':return ctx.incomingDamage||ctx.r.pending?.damage||0;
      case 'round_number':return ctx.r.round;
      case 'has_status':return !!(from(check(arg(0,'self'),['self','target'],'対象'))?.status?.[check(arg(1,''),ST,'状態異常')]);
      case 'randint':{let a=cap(arg(0,0),-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER),b=cap(arg(1,10),-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);if(a>b)[a,b]=[b,a];return cap(a+Math.floor(Math.random()*(b-a+1)),-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);}
      case 'chance':return Math.random()<Math.max(0,Math.min(1,n(arg(0,0))));
      case 'min':return Math.min(...args.map(n));case 'max':return Math.max(...args.map(n));
      case 'abs':return Math.abs(n(arg(0,0)));case 'int':return Math.trunc(n(arg(0,0)));case 'round':return Math.round(n(arg(0,0)));
    }
    if(kind!=='effect')fail(f+' は計算式内で使えません');
    if(++count>120)fail('処理保護：1回の発動は120効果までです');
    if(f==='damage'||f==='heal'||f==='set_hp'||f==='shield'||f==='draw')actions[f](who(arg(0,'self')),cap(arg(1,0),0,Number.MAX_SAFE_INTEGER));
    else if(f==='status')actions.status(who(arg(0,'target')),check(arg(1,'poison'),ST,'状態異常'),cap(arg(2,1),1,Number.MAX_SAFE_INTEGER));
    else if(f==='resource')actions.resource(who(arg(0,'self')),check(arg(1,'mp'),['mp','gold'],'資源'),cap(arg(2,0),-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER));
    else if(f==='cleanse')actions.cleanse(who(arg(0,'self')));
    else if(f==='summon')actions.summon(who(arg(0,'self')),check(arg(1,'sprite'),GD,'守護神'),cap(arg(2,3),1,Number.MAX_SAFE_INTEGER));
    else if(f==='phenomenon')actions.phenomenon(check(arg(0,'random'),PH,'超常現象'));
    else if(f==='steal')actions.steal(check(arg(0,'gold'),['mp','gold'],'資源'),cap(arg(1,1),0,Number.MAX_SAFE_INTEGER));
    else if(f==='boost_attack'||f==='boost_defense')actions[f](cap(arg(0,0),0,Number.MAX_SAFE_INTEGER));
    else if(f==='multiply_attack')actions.multiply_attack(cap(arg(0,1),0,Number.MAX_SAFE_INTEGER));
    else if(f==='discard')actions.discard(who(arg(0,'target')),check(arg(1,'defense'),['attack','defense','magic','item','guardian','omen','any'],'種類'),cap(arg(2,1),0,1024));
    else if(f==='swap_hands')actions.swap_hands();
    else if(f==='set_resource')actions.set_resource(who(arg(0,'self')),check(arg(1,'mp'),['mp','gold'],'資源'),cap(arg(2,0)));
    else if(f==='set_shield')actions.set_shield(who(arg(0,'self')),cap(arg(1,0)));
    else if(f==='set_status')actions.set_status(who(arg(0,'target')),check(arg(1,'poison'),ST,'状態異常'),cap(arg(2,0)));
    else if(f==='remove_status')actions.remove_status(who(arg(0,'target')),check(arg(1,'poison'),ST,'状態異常'));
    else if(f==='heal_percent')actions.heal_percent(who(arg(0,'self')),cap(arg(1,50),0,Number.MAX_SAFE_INTEGER));
    else if(f==='draw_type')actions.draw_type(who(arg(0,'self')),check(arg(1,'defense'),CARD_TYPES,'カード種類'),cap(arg(2,1),0,64));
    else if(f==='duplicate')actions.duplicate(who(arg(0,'self')),check(arg(1,'attack'),[...CARD_TYPES,'any'],'カード種類'),cap(arg(2,1),0,64));
    else if(f==='clear_hand')actions.clear_hand(who(arg(0,'target')));
    else if(f==='give')actions.give(who(arg(0,'target')),check(arg(1,'gold'),['mp','gold'],'資源'),cap(arg(2,0)));
    else if(f==='swap_stat')actions.swap_stat(check(arg(0,'hp'),['hp','mp','gold','shield'],'ステータス'));
    else if(f==='shuffle_hand')actions.shuffle_hand(who(arg(0,'self')));
    else if(f==='popup'||f==='popup_update'){
      const title=renderTemplate(arg(0,'')),detail=renderTemplate(arg(1,''));
      const icon=String(arg(2,'✨')),theme=check(arg(3,'magic'),POPUP_THEMES,'ポップ色');
      const duration=cap(arg(4,f==='popup'?1900:1300),350,5000);
      actions[f](title,detail,icon,theme,duration);
    }
    else if(f==='popup_wait')actions.popup_wait(cap(arg(0,700),0,3000));
    else if(f==='battle_log')actions.battle_log(renderTemplate(arg(0,'')));
    return 0;
  }
  function evaluate(node){tick();if(!node||typeof node!=='object')fail('不正な式');
    if(node.k==='literal')return node.v;
    if(node.k==='var'){
      if(node.name==='self')return playerView(ctx.self);
      if(node.name==='target')return playerView(ctx.target);
      if(node.name==='players')return (ctx.r?.players||[]).map(playerView);
      if(!Object.hasOwn(vars,node.name))fail('未定義の変数: '+node.name);
      return vars[node.name];
    }
    if(node.k==='attr'){
      const object=evaluate(node.a);
      const keys=['id','name','description','type','effect','power','cost','resource','weight','element','emoji','hp','mp','gold','shield','status','hand','guardian','kind','turns','length','poison','burn','freeze','curse','weak'];
      if(!keys.includes(node.name))fail('参照できない属性: '+node.name);
      if(object==null)return null;
      if(Array.isArray(object)&&node.name==='length')return object.length;
      if(typeof object!=='object'||!Object.hasOwn(object,node.name))return null;
      return object[node.name];
    }
    if(node.k==='index'){
      const object=evaluate(node.a),ix=evaluate(node.index);
      if(Array.isArray(object)){if(!Number.isInteger(ix))fail('手札の添字は整数で指定してください');return object[ix]||null;}
      return null;
    }
    if(node.k==='unary'){const a=evaluate(node.a);return node.op==='not'?!a:node.op==='-'?-n(a):n(a);}
    if(node.k==='call'){if(!READS.includes(node.f))fail('計算式に効果関数は入れられません');return fun(node.f,node.args.map(evaluate),'read');}
    if(node.k==='binary'){
      const a=evaluate(node.a);if(node.op==='and')return a&&evaluate(node.b);if(node.op==='or')return a||evaluate(node.b);
      const b=evaluate(node.b);
      if(node.op==='==')return a===b;if(node.op==='!=')return a!==b;if(node.op==='>')return a>b;if(node.op==='<')return a<b;if(node.op==='>=')return a>=b;if(node.op==='<=')return a<=b;
      if(node.op==='+')return n(a)+n(b);if(node.op==='-')return n(a)-n(b);if(node.op==='*')return n(a)*n(b);
      if(node.op==='/'||node.op==='//'||node.op==='%'){if(!n(b))fail('0で割れません');return node.op==='/'?n(a)/n(b):node.op==='//'?Math.floor(n(a)/n(b)):n(a)%n(b);}
      if(node.op==='**')return n(Math.pow(n(a),Math.max(-1000,Math.min(1000,n(b)))));
    }fail('不正な式');
  }
  function execute(body){for(const s of body){tick();
    if(s.s==='set'){
      const val=evaluate(s.expr);if(s.op==='=')vars[s.name]=val;
      else {if(!Object.hasOwn(vars,s.name))fail('未定義の変数: '+s.name);const old=n(vars[s.name]);vars[s.name]=s.op==='+='?old+n(val):s.op==='-='?old-n(val):s.op==='*='?old*n(val):old/(n(val)||1);}
    }else if(s.s==='for'){
      const items=evaluate(s.expr);if(!Array.isArray(items))fail('for ... in はカード配列で使用してください');
      if(items.length>1024)fail('一度に走査できるカードは1024枚までです');
      for(const item of items){tick();vars[s.name]=item;execute(s.body);}
    }else if(s.s==='if'){let done=false;for(const b of s.when){if(evaluate(b.test)){execute(b.body);done=true;break;}}if(!done)execute(s.otherwise);}
    else if(s.s==='effect')fun(s.expr.f,s.expr.args.map(evaluate),'effect');
    else fail('不正な文');
  }}
  execute(stmts);return {actions:count};
}
root.PyCards={compile,run,events:EVENTS,reads:READS,effects:EFFECTS,docs:API_DOCS};
})(typeof globalThis!=='undefined'?globalThis:this);
