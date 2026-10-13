/* 依存なしのPython構文サブセット。Python本体やevalを使わない安全な構文木インタプリタ */
(function(root){
'use strict';
const EVENTS=['play','hit','defend','block','turn_start','guard'];
const EFFECTS=['damage','heal','status','shield','resource','draw','cleanse','summon','phenomenon','steal','boost_attack','boost_defense'];
const READS=['len','count_cards','sum_power','card_at','damage_dealt','damage_taken','my_hp','target_hp','my_mp','target_mp','my_gold','target_gold','my_defense_cards','target_defense_cards','incoming_damage','round_number','has_status','randint','chance','min','max','abs','int','round'];
const WHOS=['self','target','everyone','all_enemies','random_enemy'];
const ST=['poison','burn','freeze','curse','weak'];
const GD=['phoenix','turtle','sprite','storm','muse'];
const PH=['random','blessing','meteor','exchange','silence','fog','mana_rain','earthquake'];
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
        const args=[];if(!accept(')')){do{args.push(expr());if(args.length>8)fail('引数は8個までです',line);}while(accept(','));expect(')');}
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
  const lines=code.replace(/\r\n?/g,'\n').split('\n').map((raw,index)=>{
    if(raw.includes('\t'))fail('インデントはスペースを使用してください',index+1);
    const s=cleanLine(raw),indent=(s.match(/^ */)||[''])[0].length;
    return {text:s.trim(),indent,line:index+1};
  }).filter(x=>x.text);
  if(lines.length>600)fail('コードは600行以内です');
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
  const cardView=c=>({name:String(c.name||''),type:String(c.type||''),effect:String(c.effect||''),power:Number(c.power)||0,cost:Number(c.cost)||0,element:String(c.element||''),emoji:String(c.emoji||'')});
  const playerView=p=>p?({name:String(p.name||''),hp:Number(p.hp)||0,mp:Number(p.mp)||0,gold:Number(p.gold)||0,shield:Number(p.shield)||0,status:{...(p.status||{})},hand:Array.isArray(p.hand)?p.hand.map(cardView):[]}):null;
  vars.self=playerView(ctx.self);vars.target=playerView(ctx.target);
  vars.card=cardView(ctx.card||{});
  vars.players=(ctx.r?.players||[]).map(playerView);
  const tick=()=>{if(++steps>4000)fail('処理保護：実行ステップ数を超えました');};
  const n=v=>{const num=Number(v);if(Number.isNaN(num))return 0;return Math.max(-Number.MAX_SAFE_INTEGER,Math.min(Number.MAX_SAFE_INTEGER,num));};
  const cap=(v,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Math.max(lo,Math.min(hi,Math.round(n(v))));
  const check=(val,list,msg)=>{if(!list.includes(val))fail('無効な'+msg+': '+String(val));return val;};
  const who=v=>check(v,WHOS,'対象');
  function fun(f,args,kind){
    const arg=(i,defaultV)=>args[i]===undefined?defaultV:args[i];
    const from=(w)=>w==='target'?ctx.target:ctx.self;
    switch(f){
      case 'len':{const x=arg(0,[]);return Array.isArray(x)||typeof x==='string'?x.length:0;}
      case 'count_cards':{const a=arg(0,[]),type=arg(1,'');return Array.isArray(a)?a.filter(x=>!type||x?.type===type).length:0;}
      case 'sum_power':{const a=arg(0,[]),type=arg(1,'');return Array.isArray(a)?n(a.reduce((sum,c)=>sum+(!type||c?.type===type?(Number(c?.power)||0):0),0)):0;}
      case 'card_at':{const a=arg(0,[]),idx=cap(arg(1,0));return Array.isArray(a)?a[idx]||null:null;}
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
    if(f==='damage'||f==='heal'||f==='shield'||f==='draw')actions[f](who(arg(0,'self')),cap(arg(1,0),0,Number.MAX_SAFE_INTEGER));
    else if(f==='status')actions.status(who(arg(0,'target')),check(arg(1,'poison'),ST,'状態異常'),cap(arg(2,1),1,Number.MAX_SAFE_INTEGER));
    else if(f==='resource')actions.resource(who(arg(0,'self')),check(arg(1,'mp'),['mp','gold'],'資源'),cap(arg(2,0),-Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER));
    else if(f==='cleanse')actions.cleanse(who(arg(0,'self')));
    else if(f==='summon')actions.summon(who(arg(0,'self')),check(arg(1,'sprite'),GD,'守護神'),cap(arg(2,3),1,Number.MAX_SAFE_INTEGER));
    else if(f==='phenomenon')actions.phenomenon(check(arg(0,'random'),PH,'超常現象'));
    else if(f==='steal')actions.steal(check(arg(0,'gold'),['mp','gold'],'資源'),cap(arg(1,1),0,Number.MAX_SAFE_INTEGER));
    else if(f==='boost_attack'||f==='boost_defense')actions[f](cap(arg(0,0),0,Number.MAX_SAFE_INTEGER));
    return 0;
  }
  function evaluate(node){tick();if(!node||typeof node!=='object')fail('不正な式');
    if(node.k==='literal')return node.v;
    if(node.k==='var'){if(!Object.hasOwn(vars,node.name))fail('未定義の変数: '+node.name);return vars[node.name];}
    if(node.k==='attr'){
      const object=evaluate(node.a);
      const keys=['name','type','effect','power','cost','element','emoji','hp','mp','gold','shield','status','hand','length','poison','burn','freeze','curse','weak'];
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
root.PyCards={compile,run,events:EVENTS,reads:READS,effects:EFFECTS};
})(typeof globalThis!=='undefined'?globalThis:this);
