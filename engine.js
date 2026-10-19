/* カオスレリック P2P - ホスト権威型ゲームエンジン（GAS版から移植） */
(function(global){
'use strict';
const CR_BASE = [
  ['木の短剣','attack',3,'normal','none',0,5,'🗡️'],
  ['風切りブレード','attack',5,'normal','none',0,5,'⚔️'],
  ['一撃ハンマー','attack',8,'normal','none',0,3,'🔨'],
  ['星降る槍','attack',11,'normal','none',3,2,'🌠'],
  ['火の小太刀','attack',6,'normal','fire',0,4,'🔥'],
  ['氷結の矢','attack',6,'freeze','water',0,3,'❄️'],
  ['森の牙','attack',6,'normal','forest',0,4,'🌿'],
  ['雷の鞭','attack',7,'normal','lightning',1,3,'⚡'],
  ['黒曜の剣','attack',9,'normal','dark',2,2,'🖤'],
  ['すり抜け針','attack',5,'pierce','none',0,3,'📍'],
  ['猛毒の牙','attack',4,'poison','forest',0,3,'🐍'],
  ['血吸い鎌','attack',7,'drain','dark',2,2,'🦇'],
  ['流星シャワー','attack',6,'splash','fire',2,2,'☄️'],
  ['当たれば奇跡','attack',12,'wild','lightning',0,2,'🎲'],
  ['炎獄の刃','attack',5,'burn','fire',1,3,'🔥'],
  ['重たい鉄壁','defense',7,'normal','none',0,5,'🛡️'],
  ['小さな盾','defense',4,'normal','none',0,5,'🥘'],
  ['ミラーシールド','defense',6,'reflect','none',2,3,'🪞'],
  ['針のよろい','defense',5,'counter','none',0,3,'🦔'],
  ['炎のマント','defense',7,'normal','fire',1,3,'🧣'],
  ['水鏡の盾','defense',7,'normal','water',1,3,'💧'],
  ['木霊の守り','defense',7,'normal','forest',1,3,'🍃'],
  ['避雷の鐘','defense',7,'normal','lightning',1,3,'🔔'],
  ['魔力のガード','defense',4,'mana','none',0,3,'🔮'],
  ['星の光弾','magic',8,'blast','lightning',3,3,'🌟'],
  ['焦がす呪文','magic',7,'blast','fire',2,3,'🔆'],
  ['影の契約','magic',8,'drain','dark',4,2,'🌘'],
  ['治癒の歌','magic',9,'heal','none',4,3,'🎵'],
  ['森の生命','magic',6,'heal','forest',2,3,'🌱'],
  ['闇の呪い','magic',0,'poison','dark',4,2,'👁️'],
  ['波乱の魔法','magic',9,'hex','none',3,2,'🌀'],
  ['ルーンの泉','magic',6,'mana','water',0,2,'💠'],
  ['お金の雨','magic',6,'gold','none',3,2,'🪙'],
  ['氷結魔法','magic',0,'freeze','water',3,2,'🧊'],
  ['邪眼の呪縛','magic',0,'curse','dark',3,2,'🧿'],
  ['絆創膏','item',6,'heal','none',0,5,'🩹'],
  ['特製エリクサー','item',12,'heal','none',0,2,'🧪'],
  ['魔法のラムネ','item',5,'mana','none',0,4,'🫧'],
  ['宝くじ','item',9,'lottery','none',0,3,'🎟️'],
  ['金色の袋','item',7,'gold','none',0,4,'💰'],
  ['カードの箱','item',2,'draw','none',0,3,'📦'],
  ['浄化の花','item',0,'cleanse','forest',0,2,'🌼'],
  ['不死鳥の守護','guardian',0,'phoenix','fire',5,2,'🦅'],
  ['玄武の加護','guardian',0,'turtle','water',4,2,'🐢'],
  ['妖精の祝福','guardian',0,'sprite','forest',3,2,'🧚'],
  ['雷神の怒り','guardian',0,'storm','lightning',4,2,'⚡'],
  ['月の女神','guardian',0,'muse','dark',3,2,'🌙'],
  ['天変地異の書','omen',0,'random','none',3,3,'📜'],
  ['祝祭の鐘','omen',0,'blessing','none',2,2,'🔔'],
  ['隕石の予兆','omen',0,'meteor','fire',3,2,'☄️'],
  ['時空の歪み','omen',0,'exchange','dark',4,2,'🌀'],
  ['等倍反射鏡','defense',0,'reflect_full','lightning',3,3,'🪞'],['超倍返しの盾','defense',0,'reflect_double','dark',7,2,'🪬'],
  ['身代わり転送','defense',0,'redirect','water',4,3,'🎯'],['混沌の分散盾','defense',0,'scatter','none',4,3,'🎲'],
  ['絶対無効結界','defense',0,'nullify','lightning',6,2,'🫧'],['魔力吸収炉','defense',0,'absorb','water',2,4,'🔋'],
  ['雷鳴の連鎖','attack',9,'chain','lightning',3,3,'⛓️'],['二段撃ち','attack',8,'double_hit','none',2,3,'🏹'],
  ['命の略奪','attack',6,'siphon','dark',3,2,'🩸'],['全員攻撃の槍','attack',8,'splash','fire',3,2,'🪓'],
  ['逆転の天秤','magic',0,'swap_hp','dark',6,3,'⚖️'],['全体呪詛','magic',0,'mass_poison','dark',5,3,'☣️'],
  ['強奪の契約','magic',9,'steal_mp','dark',4,3,'🫳'],['運命のシャッフル','magic',0,'scramble','none',4,2,'🎴'],
  ['MP発電機','item',15,'mana','water',0,4,'🔌'],['魔法の大盾','defense',16,'normal','none',2,2,'🛡️'],
  ['盾狩りの矢','attack',6,'guard_hunt','none',2,4,'🎯'],
  ['防具喰らいの竜','attack',12,'guard_hunt','fire',5,2,'🐲'],
  ['守護への課税','attack',9,'guard_hunt','dark',4,2,'🧾'],
  ['重ねがけの盾','defense',11,'normal','water',2,4,'🛡️'],
  ['千枚の砦','defense',23,'normal','forest',6,2,'🏰']
].map(function(x,i){return {id:'base-'+i,name:x[0],type:x[1],power:x[2],effect:x[3],element:x[4],cost:x[5],resource:'mp',weight:x[6],emoji:x[7],author:'公式',rules:[]};});
const CR_TYPES=['attack','defense','magic','item','guardian','omen'];
const CR_ELEMS=['none','fire','water','forest','lightning','dark'];
const CR_EFFECTS={attack:['normal','pierce','poison','drain','splash','wild','burn','freeze','chain','double_hit','siphon','guard_hunt'],defense:['normal','reflect','reflect_full','reflect_double','redirect','scatter','nullify','absorb','counter','mana'],magic:['blast','heal','mana','gold','poison','drain','hex','freeze','curse','burn','cleanse','swap_hp','mass_poison','steal_mp','scramble'],item:['heal','mana','gold','draw','cleanse','lottery'],guardian:['phoenix','turtle','sprite','storm','muse'],omen:['random','blessing','meteor','exchange']};
const CR_STATUSES=['poison','burn','freeze','curse','weak'];
const CR_EVENTS=['play','hit','defend','block','turn_start'];
const CR_OPS=['damage','heal','status','resource','draw','cleanse','shield','summon','phenomenon','steal','swap_hp'];
const CR_GUARDIANS=['phoenix','turtle','sprite','storm','muse'];
const CR_PHENOMENA=['random','blessing','meteor','exchange','silence','fog','mana_rain','earthquake'];
const CR_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const crUid=()=>crypto.randomUUID().replace(/-/g,'').slice(0,20);
const crRand=n=>Math.floor(Math.random()*n);
const CR_MAX=Number.MAX_SAFE_INTEGER; // Numeric precision safety, NOT a gameplay balance ceiling.
const crClamp=(v,a=0,b=CR_MAX)=>{const n=Number(v);return Math.max(a,Math.min(b,Number.isFinite(n)?n:0));};
const crInt=(v,a=0,b=CR_MAX)=>Math.round(crClamp(v,a,b));
const crAdd=(v,change)=>crInt(Number(v)+Number(change),0,CR_MAX);
const crText=(v,n=24)=>String(v||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,n);
const crDescription=v=>String(v??'').replace(/[<>\u0000-\u0009\u000b-\u001f]/g,'').trim().slice(0,8000);
const crLive=p=>p&&p.hp>0;
const crHuge=v=>{const n=Number(v??0);if(!Number.isSafeInteger(n)||n<0)throw Error('数値は0〜9007199254740991の安全な整数で入力してください');return n;};
const crSafeDamage=v=>crInt(v,0,CR_MAX);

function crLog(r,msg){r.log.unshift(msg);r.log.length=Math.min(r.log.length,24);}
function crVisual(r,kind,title,detail,icon='✨',variant=''){
 r.visualSeq=(r.visualSeq||0)+1;
 r.visualEvent={seq:r.visualSeq,kind,title:crText(title,50),detail:crText(detail,160),icon,variant};
}
function crEliminate(r,p,reason='戦闘で敗北'){
  r.eliminationSeq=(r.eliminationSeq||0)+1;
  r.lastElimination={seq:r.eliminationSeq,id:p.id,name:p.name,cause:crText(reason,70)};
  crLog(r,'💀 '+p.name+' は脱落！ '+reason);
  crVisual(r,'elimination','脱落！',p.name+'｜'+reason,'💀');
}
function crLiving(r){return r.players.filter(crLive);}
function crPick(r){
  const pool=CR_BASE.concat(r.cards);const sum=pool.reduce((n,c)=>n+c.weight,0);let hit=Math.random()*sum;
  for(const card of pool){hit-=card.weight;if(hit<0)return Object.assign({},card,{uid:crUid()});}
  return Object.assign({},pool[0],{uid:crUid()});
}
function crDraw(r,p,n){
  // Uncapped total hand size; limit the number of allocations in a single action.
  const count=Math.min(crSafeDamage(n),64);
  for(let i=0;i<count;i++)p.hand.push(crPick(r));
}
function crHeal(r,p,n,why){
  const v=Math.max(0,Math.min(CR_MAX-p.hp,crSafeDamage(n)));
  p.hp=crAdd(p.hp,v);
  if(v)crLog(r,`💚 ${p.name} ${why||'回復'} +${v}HP`);
  return v;
}
function crHit(r,p,n,why){
  if(!crLive(p))return 0;
  let d=crSafeDamage(Number(n));
  if(p.guardian&&p.guardian.kind==='turtle'){d=Math.max(0,d-3);}
  if(p.shield){const block=Math.min(d,p.shield);p.shield-=block;d-=block;}
  const dealt=Math.min(p.hp,d);p.hp-=dealt;
  if(dealt)crLog(r,`💔 ${p.name} ${why||'ダメージ'} −${dealt}HP`);
  if(!crLive(p)&&p.guardian&&p.guardian.kind==='phoenix'){
    p.guardian=null;p.hp=8;crLog(r,`🦅 ${p.name} は不死鳥によって復活！ HP8`);
  }else if(!crLive(p))crEliminate(r,p,why||'ダメージ');
  return dealt;
}
function crStatus(r,p,key,n){
  if(!CR_STATUSES.includes(key))return;
  p.status[key]=Math.max(p.status[key]||0,crInt(n,1));
  crLog(r,`🧿 ${p.name} に${{poison:'毒',burn:'炎上',freeze:'凍結',curse:'呪い',weak:'弱体化'}[key]}！`);
}
function crValidRules(raw){
  if(raw==null)return [];
  if(!Array.isArray(raw)||raw.length>256)throw Error('処理保護：効果ルールは1枚128個までです');
  let total=0;
  return raw.map(function(x){
    if(!x||!CR_EVENTS.includes(x.event))throw Error('無効なイベント');
    if(!Array.isArray(x.actions)||x.actions.length<1||x.actions.length>128)throw Error('処理保護：イベントの効果は128個までです');
    total+=x.actions.length;
    if(total>1024)throw Error('処理保護：1枚の処理は256個までです');
    const rule={event:x.event,chance:crClamp(x.chance===undefined?1:x.chance,0,1),if_hp_below:x.if_hp_below==null?null:crInt(x.if_hp_below,1),if_target_status:x.if_target_status==null?null:String(x.if_target_status)};
    if(rule.if_target_status!==null&&!CR_STATUSES.includes(rule.if_target_status))throw Error('条件の状態異常が不正です');
    rule.actions=x.actions.map(function(a){
      if(!a||!CR_OPS.includes(a.op))throw Error('未知の効果 '+(a&&a.op));
      const op=a.op;
      const who=['self','target','all_enemies','everyone','random_enemy'].includes(a.who)?a.who:'self';
      const obj={op,who,n:crInt(a.n,0)};
      if(op==='status'){if(!CR_STATUSES.includes(a.key))throw Error('不明な状態異常');obj.key=a.key;}
      if(op==='resource'||op==='steal'){if(!['mp','gold'].includes(a.key))throw Error('不明な資源');obj.key=a.key;}
      if(op==='summon'){if(!CR_GUARDIANS.includes(a.key))throw Error('不明な守護神');obj.key=a.key;obj.n=crInt(a.n||3,1);}
      if(op==='phenomenon'){if(!CR_PHENOMENA.includes(a.key))throw Error('不明な超常現象');obj.key=a.key;}
      if(op==='swap_hp')obj.who='target';
      return obj;
    });
    return rule;
  });
}
function crValidCard(raw,author){
  if(!raw)throw Error('カードがありません');
  const compiled=typeof raw.script==='string'&&raw.script.trim()?PyCards.compile(raw.script):null;
  raw={...raw,...(compiled?.meta||{})};
  if(!CR_TYPES.includes(raw.type))throw Error('カードの種類が不正です');
  const name=crText(raw.name,64);if(!name)throw Error('カード名は必須です');
  const type=raw.type;
  const created={id:'custom-'+crUid(),name,type,power:crHuge(raw.power),effect:CR_EFFECTS[type].includes(raw.effect)?raw.effect:CR_EFFECTS[type][0],
    element:CR_ELEMS.includes(raw.element)?raw.element:'none',cost:crHuge(raw.cost),resource:raw.resource==='gold'?'gold':'mp',
    weight:Math.max(1,crHuge(raw.weight||3)),emoji:crText(raw.emoji||'✨',16),author:crText(author,32),description:crDescription(raw.description),sourceLocalId:typeof raw.sourceLocalId==='string'&&/^[a-zA-Z0-9_-]{8,90}$/.test(raw.sourceLocalId)?raw.sourceLocalId:'',rules:[],script:typeof raw.script==='string'?raw.script.slice(0,30000):'',program:compiled};
  return created;
}
function crCanPay(p,cards){return cards.reduce((n,c)=>n+c.cost*(c.resource==='mp'?1:0),0)<=p.mp&&cards.reduce((n,c)=>n+c.cost*(c.resource==='gold'?1:0),0)<=p.gold;}
function crSpend(p,cards){cards.forEach(c=>p[c.resource]-=c.cost);}
function crTake(r,p,cards){const ids=new Set(cards.map(c=>c.uid));p.hand=p.hand.filter(c=>!ids.has(c.uid));crDraw(r,p,cards.length);}
function crSelect(p,ids,type,min=1,max=3){
  if(!Array.isArray(ids)||ids.length<min||ids.length>max||new Set(ids).size!==ids.length)throw Error('カードの選択枚数が不正です');
  const found=ids.map(id=>p.hand.find(c=>c.uid===id));
  if(found.some(c=>!c||c.type!==type))throw Error('カードを確認してください');return found;
}
function crRecipients(r,who,ctx){
  if(who==='self')return crLive(ctx.self)?[ctx.self]:[];
  if(who==='target')return crLive(ctx.target)?[ctx.target]:[];
  if(who==='everyone')return crLiving(r);
  const enemies=crLiving(r).filter(p=>p.id!==ctx.self.id);
  if(who==='all_enemies')return enemies;
  return enemies.length?[enemies[crRand(enemies.length)]]:[];
}
function crPhenomenon(r,key){
  if(key==='random')key=CR_PHENOMENA[1+crRand(CR_PHENOMENA.length-1)];
  crLog(r,`🌌 超常現象「${{blessing:'天の祝福',meteor:'流星雨',exchange:'資源の逆転',silence:'静寂',fog:'深い霧',mana_rain:'魔力の雨',earthquake:'地鳴り'}[key]}」発生！`);
  if(key==='blessing')crLiving(r).forEach(p=>crHeal(r,p,5,'天の祝福で'));
  if(key==='meteor')crLiving(r).forEach(p=>crHit(r,p,4,'流星雨で'));
  if(key==='exchange')crLiving(r).forEach(p=>{const m=p.mp;p.mp=crInt(p.gold);p.gold=crInt(m);});
  if(key==='silence')crLiving(r).forEach(p=>{p.mp=Math.max(0,p.mp-3);});
  if(key==='fog')crLiving(r).forEach(p=>crStatus(r,p,'weak',2));
  if(key==='mana_rain')crLiving(r).forEach(p=>{p.mp=crAdd(p.mp,5);});
  if(key==='earthquake')crLiving(r).forEach(p=>crHit(r,p,3,'地鳴りで'));
  r.phenomenon={kind:key,round:r.round};
  const label={blessing:'天の祝福',meteor:'流星雨',exchange:'資源の逆転',silence:'静寂',fog:'深い霧',mana_rain:'魔力の雨',earthquake:'地鳴り'}[key]||'未知の現象';
  const specialIcon={blessing:'✨',meteor:'☄️',exchange:'🌀',silence:'🤫',fog:'🌫️',mana_rain:'💧',earthquake:'🌋'}[key]||'🌌';
  crVisual(r,'omen','超常現象！','「'+label+'」が発生！ 全員に影響します',specialIcon,key);
}
// Authoritative, bounded animation gate. Card effects resolve atomically, but
// the next player action, turn change, timeout and bot processing wait for the
// full scheduled popup timeline. The deadline is wall-clock based so a missing
// client acknowledgement can never permanently freeze an online room.
const CR_POPUP_MAX_BUSY=24000;
const crPopupRemaining=r=>Math.max(0,(Number(r.popupBusyUntil)||0)-Date.now());
const crPopupBusy=r=>r.phase==='game'&&crPopupRemaining(r)>0;
function crPopupHold(r,requested){
  const now=Date.now(),base=Math.max(now,Number(r.popupBusyUntil)||now);
  const allowed=Math.max(0,CR_POPUP_MAX_BUSY-(base-now));
  const duration=Math.min(allowed,Math.max(0,Math.floor(Number(requested)||0)));
  if(!duration)return 0;
  r.popupBusyUntil=base+duration;
  if(r.deadline>now)r.deadline+=duration;
  return duration;
}
const crPopupDeadline=(r,ms)=>Math.max(Date.now(),Number(r.popupBusyUntil)||0)+ms;
function crRules(r,card,event,ctx){
  if(!card.script)return;
  let popupBudget=0,lastPopup=null;
  const applyHp=(p,value)=>{
    if(!crLive(p))return;
    const next=crSafeDamage(value),old=p.hp;
    p.hp=next;
    if(old!==next)crLog(r,'❤️ '+p.name+' のHP '+old+' → '+next);
    if(!crLive(p))crEliminate(r,p,card.name+'でHPが0になった');
  };
  const changeHand=(who,callback)=>crRecipients(r,who,ctx).forEach(callback);
  try{
  const result=PyCards.run(card.program || PyCards.compile(card.script),event,{r,card,self:ctx.self,target:ctx.target,damageDealt:ctx.damageDealt||0,damageTaken:ctx.damageTaken||0,incomingDamage:ctx.incomingDamage||0,ownDefenseCount:ctx.ownDefenseCount}, {
    damage:(who,n)=>crRecipients(r,who,ctx).forEach(p=>{
      const reaction=['defend','block','guard'].includes(event)&&ctx.self!==p&&r.pending;
      if(reaction)crQueueReaction(r,ctx.self,p,n,card.name+'の反撃',card.emoji||'🐍',(r.pending.reactionDepth||0)+1);
      else crHit(r,p,n,'自作カードで');
    }),
    heal:(who,n)=>crRecipients(r,who,ctx).forEach(p=>crHeal(r,p,n,'自作カードで')),
    set_hp:(who,n)=>changeHand(who,p=>applyHp(p,n)),
    set_resource:(who,key,n)=>changeHand(who,p=>{p[key]=crSafeDamage(n);crLog(r,'💠 '+p.name+' '+key+' → '+p[key])}),
    set_shield:(who,n)=>changeHand(who,p=>{p.shield=crSafeDamage(n);crLog(r,'🛡 '+p.name+' のバリア → '+p.shield)}),
    set_status:(who,key,n)=>changeHand(who,p=>{p.status[key]=crSafeDamage(n);crLog(r,'🧿 '+p.name+' '+key+' → '+p.status[key]+'ターン')}),
    remove_status:(who,key)=>changeHand(who,p=>{p.status[key]=0;crLog(r,'✨ '+p.name+' の'+key+'を解除')}),
    heal_percent:(who,percent)=>changeHand(who,p=>crHeal(r,p,crSafeDamage(Math.floor(p.hp*percent/100)),'割合回復で')),
    draw_type:(who,type,n)=>changeHand(who,p=>{
      const pool=CR_BASE.concat(r.cards).filter(c=>c.type===type);
      if(!pool.length)return;
      const count=Math.min(n,64);
      for(let i=0;i<count;i++){
        const total=pool.reduce((sum,c)=>sum+(Number(c.weight)||1),0);
        let draw=Math.random()*total,chosen=pool[pool.length-1];
        for(const candidate of pool){draw-=(Number(candidate.weight)||1);if(draw<0){chosen=candidate;break;}}
        p.hand.push({...chosen,uid:crUid()});
      }
      if(count)crLog(r,'🎴 '+p.name+' は'+type+'を'+count+'枚引いた');
    }),
    duplicate:(who,type,n)=>changeHand(who,p=>{
      const candidates=p.hand.filter(c=>type==='any'||c.type===type);
      if(!candidates.length)return;
      const count=Math.min(n,64);
      for(let i=0;i<count;i++)p.hand.push({...candidates[crRand(candidates.length)],uid:crUid()});
      if(count)crLog(r,'🪄 '+p.name+' は手札を'+count+'枚複製した');
    }),
    clear_hand:who=>changeHand(who,p=>{const count=p.hand.length;p.hand=[];crLog(r,'🗑 '+p.name+' の手札'+count+'枚を消した')}),
    give:(who,key,n)=>changeHand(who,p=>{
      if(p.id===ctx.self.id)return;
      const amount=Math.min(ctx.self[key],n);
      ctx.self[key]-=amount;p[key]=crAdd(p[key],amount);
      if(amount)crLog(r,'🤝 '+ctx.self.name+' → '+p.name+' '+key+'を'+amount+'渡した');
    }),
    swap_stat:key=>{
      if(!ctx.target||ctx.target.id===ctx.self.id||!crLive(ctx.target))return;
      const old=ctx.self[key];ctx.self[key]=ctx.target[key];ctx.target[key]=old;
      crLog(r,'🔄 '+ctx.self.name+' と '+ctx.target.name+' の'+key+'を交換');
    },
    shuffle_hand:who=>changeHand(who,p=>{
      for(let i=p.hand.length-1;i>0;i--){const j=crRand(i+1);[p.hand[i],p.hand[j]]=[p.hand[j],p.hand[i]];}
      crLog(r,'🎲 '+p.name+' の手札をシャッフルした');
    }),
    popup:(title,detail,icon,theme,duration)=>{
      if(++popupBudget>6)return;
      const length=crPopupHold(r,duration);
      if(!length)return;
      r.customPopupSeq=(r.customPopupSeq||0)+1;
      r.customPopups=r.customPopups||[];
      const frame={title:crText(title,70),detail:crDescription(detail).slice(0,420),
        icon:crText(icon||'✨',12),theme,duration:length};
      const evt={seq:r.customPopupSeq,...frame,card:crText(card.name,64),
        at:Date.now(),durationMs:length,stages:[frame]};
      r.customPopups.push(evt);
      if(r.customPopups.length>12)r.customPopups.splice(0,r.customPopups.length-12);
      lastPopup=evt;
      crLog(r,'📣 '+evt.card+'：'+evt.title);
    },
    popup_update:(title,detail,icon,theme,duration)=>{
      if(!lastPopup)throw Error('popup_update() の前に popup() を呼んでください');
      if(lastPopup.stages.length>=12)return;
      const length=crPopupHold(r,duration);
      if(!length)return;
      const previous=lastPopup.stages[lastPopup.stages.length-1];
      lastPopup.stages.push({title:title===null?previous.title:crText(title,70),
        detail:detail===null?previous.detail:crDescription(detail).slice(0,420),
        icon:icon===null?previous.icon:crText(icon||'✨',12),
        theme:theme===null?previous.theme:theme,duration:length});
      lastPopup.durationMs+=length;
    },
    popup_wait:ms=>{
      if(!lastPopup)throw Error('popup_wait() の前に popup() を呼んでください');
      const length=crPopupHold(r,ms);
      if(!length)return;
      lastPopup.stages[lastPopup.stages.length-1].duration+=length;
      lastPopup.durationMs+=length;
    },
    battle_log:message=>crLog(r,'📜 '+crText(message,240)),
    status:(who,k,n)=>crRecipients(r,who,ctx).forEach(p=>crStatus(r,p,k,n)),
    shield:(who,n)=>crRecipients(r,who,ctx).forEach(p=>{p.shield=crAdd(p.shield,n)}),
    resource:(who,k,n)=>crRecipients(r,who,ctx).forEach(p=>{p[k]=crAdd(p[k],n)}),
    draw:(who,n)=>crRecipients(r,who,ctx).forEach(p=>crDraw(r,p,n)),
    cleanse:(who)=>crRecipients(r,who,ctx).forEach(p=>{p.status={poison:0,burn:0,freeze:0,curse:0,weak:0}}),
    summon:(who,k,n)=>crRecipients(r,who,ctx).forEach(p=>{p.guardian={kind:k,turns:n,script:card.script,program:card.program}}),
    phenomenon:(k)=>crPhenomenon(r,k),
    steal:(k,n)=>{if(!ctx.target||ctx.target===ctx.self)return;const v=Math.min(ctx.target[k],n);ctx.target[k]-=v;ctx.self[k]=crAdd(ctx.self[k],v)},
    boost_attack:(n)=>{if(r.pending&&r.pending.from===ctx.self.id)r.pending.damage=crSafeDamage(r.pending.damage+n);},
    boost_defense:(n)=>{if(ctx.guardBonus)ctx.guardBonus.value=crSafeDamage(ctx.guardBonus.value+n);},
    multiply_attack:(factor)=>{if(r.pending&&r.pending.from===ctx.self.id)r.pending.damage=crSafeDamage(r.pending.damage*factor);},
    discard:(who,type,n)=>crRecipients(r,who,ctx).forEach(p=>{
      let left=n;const before=p.hand.length;
      p.hand=p.hand.filter(c=>{if(left>0&&(type==='any'||c.type===type)){left--;return false;}return true;});
      if(before!==p.hand.length)crLog(r,'🗑️ '+p.name+' の'+(type==='any'?'手札':type)+'を'+(before-p.hand.length)+'枚破棄！');
    }),
    swap_hands:()=>{if(ctx.target&&ctx.target!==ctx.self&&crLive(ctx.target)){
      const hand=ctx.self.hand;ctx.self.hand=ctx.target.hand;ctx.target.hand=hand;
      crLog(r,'🎴 '+ctx.self.name+' と '+ctx.target.name+' の手札を交換！');
    }},
  });
  if(result.actions>0){
    crLog(r,`🐍 ${card.name}｜on_${event}：${result.actions}効果が発動！`);
    r.scriptSeq=(r.scriptSeq||0)+1;
    r.scriptFeedback={seq:r.scriptSeq,card:card.name,event,actions:result.actions,ok:true,at:Date.now()};
  }
  }catch(err){
    const message=String(err.message||err).slice(0,160);
    crLog(r,`⚠ ${card.name}｜on_${event}：${message}`);
    r.scriptSeq=(r.scriptSeq||0)+1;
    r.scriptFeedback={seq:r.scriptSeq,card:card.name,event,ok:false,message,at:Date.now()};
  }
}
function crWinner(r){
  if(r.phase!=='game')return true;
  const living=crLiving(r);if(living.length>1)return false;
  if(crPopupBusy(r)){r.popupDeferredWinner=true;return true;}
  r.phase='finished';r.pending=null;r.deadline=0;r.winner=living.length?living[0].id:null;
  crVisual(r,'victory',living.length?'優勝！':'全滅！',living.length?living[0].name+' が最後まで生き残った！':'生存者はいません','🏆');
  crLog(r,living.length?`🏆 ${living[0].name} の優勝！`:'🤝 全滅、引き分け！');return true;
}
function crStartTurn(r){
  if(crWinner(r))return;
  const p=r.players[r.turnIndex];if(!crLive(p)){crNext(r);return;}
  if(p.guardian){
    const g=p.guardian;
    if(g.kind==='sprite')crHeal(r,p,3,'妖精の力で');
    if(g.script)crRules(r,{script:g.script,program:g.program,name:'守護神'},'turn_start',{self:p,target:crLiving(r).find(x=>x.id!==p.id)||p});
    if(g.kind==='muse'){p.mp=crAdd(p.mp,3);crLog(r,`🌙 ${p.name} MP +3`);}
    g.turns--;if(g.turns<=0){p.guardian=null;crLog(r,`👼 ${p.name} の守護神が去った`);}
  }
  if(p.status.poison){p.status.poison--;crHit(r,p,2,'毒で');}
  if(p.status.burn){p.status.burn--;crHit(r,p,3,'炎上で');}
  if(p.status.curse){p.status.curse--;p.mp=Math.max(0,p.mp-2);crLog(r,`🧿 ${p.name} MP−2（呪い）`);}
  if(crWinner(r))return;
  if(!crLive(p)){crNext(r);return;}
  if(p.status.freeze){p.status.freeze--;crLog(r,`🧊 ${p.name} は凍結で行動不能！`);crNext(r);return;}
  p.shopUsed=false;p.mp=crAdd(p.mp,3);crLog(r,'💠 '+p.name+' MPが3回復！');
  crDraw(r,p,Math.max(0,9-p.hand.length));crLog(r,`🎯 ${p.name} のターン`);
  r.deadline=crPopupDeadline(r,60000);
}
function crNext(r){
  if(crWinner(r))return;
  if(crPopupBusy(r)){r.popupDeferredNext=true;return;}
  r.pending=null;
  for(let i=0;i<r.players.length;i++){
    r.turnIndex=(r.turnIndex+1)%r.players.length;
    if(r.turnIndex===0){
      r.round++;
      if(r.round%3===0&&Math.random()<0.7)crPhenomenon(r,'random');
      if(r.round>=8){crLog(r,'🌪️ 終末の嵐！');crLiving(r).forEach(p=>crHit(r,p,r.round-6,'終末の嵐で'));}
      if(crWinner(r))return;
    }
    if(crLive(r.players[r.turnIndex])){crStartTurn(r);return;}
  }
}
function crAttack(r,from,to,cards){
  const enemyDefenses=to.hand.filter(c=>c.type==='defense').length;
  let dmg=crSafeDamage(cards.reduce((n,c)=>n+c.power*(c.effect==='guard_hunt'?enemyDefenses:1),0));
  const effects=cards.map(c=>c.effect);
  if(effects.includes('wild')){if(Math.random()<.42){dmg=0;crLog(r,'🎲 ギャンブル攻撃は空振り！');}else dmg+=6;}
  if(Math.random()<.12){dmg+=4;crLog(r,'✨ クリティカル +4');}
  if(from.status.weak){dmg=Math.max(0,dmg-3);from.status.weak--;}
  dmg=crSafeDamage(dmg);
  const els=[...new Set(cards.map(c=>c.element).filter(x=>x!=='none'))];
  r.pending={from:from.id,to:to.id,damage:dmg,element:els.length===1?els[0]:'none',
    pierce:effects.filter(x=>x==='pierce').length*3,effects,kind:cards.some(c=>c.type==='magic')?'magic':'attack',
    cards:cards.map(c=>({name:c.name,emoji:c.emoji||'✨',type:c.type||'attack',effect:c.effect||'normal',power:c.power||0,script:c.script||'',program:c.program||null}))};
  cards.forEach(c=>crRules(r,c,'play',{self:from,target:to}));
  if(r.pending){
    const finalDamage=r.pending.damage;
    crLog(r,`⚔️ ${from.name} → ${to.name}: ${cards.map(c=>c.name).join(' + ')}（威力${finalDamage}${effects.includes('guard_hunt')?'｜相手の防御札'+enemyDefenses+'枚':''}）`);
    crVisual(r,'attack','攻撃！',from.name+' → '+to.name+'｜'+cards.map(c=>c.name).join('＋')+'｜威力'+finalDamage+(effects.includes('guard_hunt')?' / 防御札'+enemyDefenses+'枚':''),cards[0]?.emoji||'⚔️');
  }
  if(crWinner(r))r.pending=null;
  else if(!crLive(to)){r.pending=null;crNext(r);}
  else r.deadline=crPopupDeadline(r,30000);
}
// Retaliation is a fresh attack window. The victim may defend again.
const CR_REACTION_DEPTH=6,CR_REACTION_QUEUE=48;
function crQueueReaction(r,from,to,damage,name,emoji,depth){
  if(!to||!crLive(to)||depth>CR_REACTION_DEPTH)return;
  r.reactionQueue=r.reactionQueue||[];
  if(r.reactionQueue.length>=CR_REACTION_QUEUE){crLog(r,'⚠ 反撃の連鎖が多すぎるため、それ以上の反撃を停止');return;}
  r.reactionQueue.push({from:from.id,to:to.id,damage:crSafeDamage(damage),name,emoji,depth});
}
function crContinueReaction(r){
  const queue=r.reactionQueue||[];
  while(queue.length){
    const x=queue.shift(),to=r.players.find(p=>p.id===x.to),from=r.players.find(p=>p.id===x.from);
    if(!to||!crLive(to)||!from)continue;
    r.pending={from:from.id,to:to.id,damage:x.damage,element:'none',pierce:0,effects:[],kind:'reaction',reactionDepth:x.depth,
      cards:[{name:x.name,emoji:x.emoji,type:'attack',power:x.damage,effect:'normal'}]};
    r.deadline=crPopupDeadline(r,30000);
    crLog(r,'🔁 '+from.name+' → '+to.name+'｜'+x.name+' 威力'+x.damage+'！ 再び防御可能');
    crVisual(r,'attack','反撃が来た！',from.name+' → '+to.name+' / '+x.name+' / 威力'+x.damage,x.emoji||'⚡');
    return true;
  }
  return false;
}
function crDefend(r,p,ids){
  const pending=r.pending;if(!pending||pending.to!==p.id)throw Error('今は防御できません');
  const depth=pending.reactionDepth||0;
  const cards=ids.length?crSelect(p,ids,'defense',1,p.hand.length):[];
  if(!crCanPay(p,cards))throw Error('MPまたはコイン不足');
  const from=r.players.find(x=>x.id===pending.from);
  const defenseHandCount=p.hand.filter(c=>c.type==='defense').length;
  crSpend(p,cards);crTake(r,p,cards);
  const guardBonus={value:0};
  cards.forEach(c=>crRules(r,c,'guard',{self:p,target:from,guardBonus,incomingDamage:pending.damage,ownDefenseCount:defenseHandCount}));
  const power=crSafeDamage(cards.reduce((n,c)=>n+c.power+(c.element===pending.element&&pending.element!=='none'?2:0),0)+guardBonus.value);
  const block=Math.max(0,power-pending.pierce);
  const special=cards.find(c=>['reflect','reflect_full','reflect_double','redirect','scatter','nullify','absorb'].includes(c.effect));
  const allReflectors=cards.filter(c=>['reflect','reflect_full','reflect_double'].includes(c.effect));
  const incoming=crSafeDamage(pending.damage);
  let dealt=0,redirected=[],trick='';
  if(special){
    if(['reflect','reflect_full','reflect_double'].includes(special.effect)){
      redirected=[from];trick='跳ね返した！';
      if(depth<CR_REACTION_DEPTH){
        for(const mirror of allReflectors)crQueueReaction(r,p,from,crSafeDamage(incoming*(mirror.effect==='reflect_double'?2:1)),mirror.name,mirror.emoji||'🪞',depth+1);
      }else crLog(r,'🔒 反射連鎖が上限に達したため、今回の反射ダメージは発生しません');
    }else if(special.effect==='redirect'){
      const pool=crLiving(r).filter(x=>x.id!==p.id);
      if(pool.length){const victim=pool[crRand(pool.length)];redirected=[victim];trick='転送成功！';crQueueReaction(r,p,victim,incoming,special.name+'の転送',special.emoji||'🎯',depth+1);}
    }else if(special.effect==='scatter'){
      const pool=crLiving(r).filter(x=>x.id!==p.id);
      const victims=pool.sort(()=>Math.random()-.5).slice(0,Math.min(pool.length,3));
      victims.forEach(x=>crQueueReaction(r,p,x,Math.ceil(incoming/Math.max(1,victims.length)),special.name+'の分散',special.emoji||'🎲',depth+1));
      redirected=victims;trick='攻撃を分散！';
    }else if(special.effect==='absorb'){
      const gained=Math.ceil(incoming/2);p.mp=crAdd(p.mp,gained);trick='魔力を吸収！';
    }else trick='完全無効！';
    crLog(r,'🌟 '+p.name+'｜'+special.name+'：'+trick+(redirected.length?' → '+redirected.map(x=>x.name).join('・'):''));
  }else dealt=crHit(r,p,Math.max(0,incoming-block),'攻撃されて');
  crLog(r,`🛡️ ${p.name}: 防御 ${power} / 攻撃 ${pending.damage} / 貫通 ${pending.pierce}`);
  for(const c of cards){
    crRules(r,c,'defend',{self:p,target:from,damageTaken:dealt});
    if(c.effect==='mana')p.mp=crAdd(p.mp,3);
    if(pending.damage<=block&&!special){
      if(c.effect==='reflect'&&depth<CR_REACTION_DEPTH){crLog(r,`↩️ ${p.name} は跳ね返した！`);crQueueReaction(r,p,from,incoming,c.name,c.emoji||'↩️',depth+1);}
      if(c.effect==='counter'&&depth<CR_REACTION_DEPTH){crLog(r,`⚔️ ${p.name} は反撃した！`);crQueueReaction(r,p,from,2,c.name,c.emoji||'🦔',depth+1);}
      crRules(r,c,'block',{self:p,target:from,damageTaken:0});
    }
  }
  if(dealt===0)crLog(r,`🟢 ${p.name} は無事！`);
  if(dealt>0){
    for(const e of pending.effects){
      if(['poison','burn','freeze'].includes(e)&&crLive(p))crStatus(r,p,e,e==='freeze'?1:3);
      if(e==='drain')crHeal(r,from,Math.max(1,Math.floor(dealt/2)),'吸収で');
      if(e==='splash')crLiving(r).filter(x=>x.id!==p.id&&x.id!==from.id).forEach(x=>crHit(r,x,Math.max(2,Math.ceil(dealt/3)),'巻き添えで'));
      if(e==='chain')crLiving(r).filter(x=>x.id!==p.id&&x.id!==from.id).forEach(x=>crHit(r,x,Math.max(1,Math.floor(dealt/2)),'連鎖で'));
      if(e==='double_hit')crHit(r,p,Math.max(1,Math.floor(dealt*.7)),'追撃で');
      if(e==='siphon'){const stolen=Math.min(p.mp,Math.max(1,Math.floor(dealt/2)));p.mp-=stolen;from.mp=crAdd(from.mp,stolen);}
    }
    pending.cards.forEach(c=>crRules(r,c,'hit',{self:from,target:p,damageDealt:dealt}));
    if(p.guardian&&p.guardian.kind==='storm'&&depth<CR_REACTION_DEPTH)crQueueReaction(r,p,from,2,'雷神の反撃','⚡',depth+1);
  }
  const reflected=!!special&&['reflect','reflect_full','reflect_double'].includes(special.effect);
  const counter=pending.damage<=block&&cards.some(c=>c.effect==='counter');
  const title=trick||(reflected?'跳ね返した！':counter?'反撃！':dealt===0?'無事！':dealt+'ダメージ！');
  const afflicted=dealt>0?pending.effects.filter(x=>['poison','burn','freeze'].includes(x)).map(x=>({poison:'毒',burn:'炎上',freeze:'凍結'}[x])).join('・'):'';
  const detail='攻:'+pending.cards.map(c=>c.name).join('＋')+' / 防:'+(cards.length?cards.map(c=>c.name).join('＋'):'なし')+'｜攻'+pending.damage+' / 守'+block+(afflicted?'｜'+afflicted:'');
  crVisual(r,special?'reflect':reflected?'reflect':dealt===0?'safe':'damage',title,detail+(redirected.length?' → '+redirected.map(x=>x.name).join('・'):''),special?.emoji||(reflected?'↩️':dealt===0?'🛡️':'💥'),special?.effect||'');
  r.pending=null;
  if(!crWinner(r)&&!crContinueReaction(r))crNext(r);
}
function crUse(r,p,card,targetId){
  if(!crCanPay(p,[card]))throw Error('MPまたはコイン不足');
  const other=r.players.find(x=>x.id===targetId&&crLive(x)&&x.id!==p.id);
  const hostile=card.type==='magic'&&['blast','drain','poison','hex','freeze','burn','curse','swap_hp','steal_mp'].includes(card.effect);
  if(hostile&&!other)throw Error('攻撃相手を選択してください');
  crSpend(p,[card]);crTake(r,p,[card]);crLog(r,`✨ ${p.name} は「${card.name}」を使った`);
  const e=card.effect;
  if(card.type==='magic'&&['blast','drain'].includes(e)){crAttack(r,p,other,[card]);return;}
  if(['poison','burn','freeze','curse'].includes(e))crStatus(r,other,e,e==='freeze'?1:3);
  if(e==='swap_hp'&&other){const h=p.hp;p.hp=other.hp;other.hp=h;crLog(r,'⚖️ '+p.name+' と '+other.name+' のHP交換！');}
  if(e==='mass_poison')crLiving(r).filter(x=>x.id!==p.id).forEach(x=>crStatus(r,x,'poison',4));
  if(e==='steal_mp'&&other){const n=Math.min(other.mp,Math.max(1,card.power));other.mp-=n;p.mp=crAdd(p.mp,n);crLog(r,'🫳 '+p.name+' はMP'+n+'奪った！');}
  if(e==='scramble'){for(const x of crLiving(r)){x.hand=[];crDraw(r,x,9);}crLog(r,'🎴 全員の手札が入れ替わった！');}
  if(e==='hex'){if(Math.random()<.5)crHit(r,other,card.power+4,'呪いで');else crHeal(r,other,5,'まさかの回復で');}
  if(e==='heal')crHeal(r,p,card.power,'カードで');
  if(e==='mana'||e==='gold'){p[e]=crAdd(p[e],card.power);crLog(r,`💫 ${p.name} ${e} +${card.power}`);}
  if(e==='draw'){crDraw(r,p,card.power);crLog(r,`🃏 ${p.name} が${card.power}枚引いた`);}
  if(e==='cleanse'){p.status={poison:0,burn:0,freeze:0,curse:0,weak:0};crLog(r,`🌱 ${p.name} の状態異常解除`);}
  if(e==='lottery'){const n=Math.random()<.55?card.power:-Math.ceil(card.power/2);p.gold=crAdd(p.gold,n);crLog(r,`🎰 ${p.name} コイン ${n>0?'+':''}${n}`);}
  if(card.type==='guardian'){p.guardian={kind:e,turns:4,script:card.script||'',program:card.program||null};crLog(r,`👼 ${p.name} に「${card.name}」が降臨（4ターン）`);}
  if(card.type==='omen')crPhenomenon(r,e);
  else crVisual(r,card.type==='guardian'?'guardian':e==='heal'?'heal':'status',card.type==='guardian'?'守護神、降臨！':e==='heal'?'回復！':'カード発動！',p.name+'｜'+card.name+(card.power?'｜威力'+card.power:''),card.emoji||'✨',e);
  crRules(r,card,'play',{self:p,target:other||p});
  if(!crWinner(r))crNext(r);
}
function crPlayer(id,name,bot){return {id,name,bot:!!bot,hp:40,mp:16,gold:16,shield:0,shopUsed:false,
  status:{poison:0,burn:0,freeze:0,curse:0,weak:0},guardian:null,hand:[]};}
function crView(r,p){return {room:r.code,phase:r.phase,host:r.host,round:r.round,deadline:r.deadline||null,
  turn:r.phase==='game'?r.players[r.turnIndex].id:null,pending:r.pending?{from:r.pending.from,to:r.pending.to,damage:r.pending.damage,element:r.pending.element,kind:r.pending.kind,pierce:r.pending.pierce||0,cards:(r.pending.cards||[]).map(c=>({name:c.name,emoji:c.emoji,type:c.type,power:c.power}))}:null,
  winner:r.winner,phenomenon:r.phenomenon||null,visualEvent:r.visualEvent||null,lastElimination:r.lastElimination||null,scriptFeedback:r.scriptFeedback||null,customPopups:r.customPopups||[],popupBusyUntil:crPopupBusy(r)?r.popupBusyUntil:0,
  classroom:!!r.classroom,players:r.players.map(x=>({id:x.id,name:x.name,bot:!!x.bot,hp:x.hp,mp:x.mp,gold:x.gold,shield:x.shield,guardian:x.guardian,shopUsed:!!x.shopUsed,
    poison:x.status.poison,burn:x.status.burn,weak:x.status.weak,freeze:x.status.freeze,curse:x.status.curse,handCount:x.hand.length,online:!!x.bot||Date.now()-(x.lastSeen||0)<30000})),
  me:p.id,hand:p.hand,cards:r.cards,customCards:r.cards,log:r.log.slice(0,14),baseCardCount:CR_BASE.length};}
function crBot(r){
  if(r.phase!=='game')return false;
  const b=r.pending?r.players.find(x=>x.id===r.pending.to):r.players[r.turnIndex];if(!b||!b.bot)return false;
  if(r.pending){
    const cards=b.hand.filter(c=>c.type==='defense'&&crCanPay(b,[c])).sort((a,z)=>z.power-a.power);
    const chosen=[];let guard=0,mp=0,gold=0;
    for(const c of cards){
      if((c.resource==='gold'?gold+c.cost<=b.gold:mp+c.cost<=b.mp) ){
        chosen.push(c.uid);guard+=c.power;if(c.resource==='gold')gold+=c.cost;else mp+=c.cost;
        if(['reflect','reflect_full','reflect_double','redirect','scatter','nullify','absorb'].includes(c.effect)||guard>=r.pending.damage)break;
      }
    }
    crDefend(r,b,chosen);return true;
  }
  const options=crLiving(r).filter(p=>p.id!==b.id);if(!options.length){crWinner(r);return true;}
  const target=options[crRand(options.length)];
  const available=b.hand.filter(c=>crCanPay(b,[c]));
  let chosen=available.find(c=>b.hp<25&&['magic','item'].includes(c.type)&&c.effect==='heal');
  if(!chosen)chosen=available.find(c=>c.type==='attack');
  if(!chosen)chosen=available.find(c=>c.type==='magic'||c.type==='item'||c.type==='guardian'||c.type==='omen');
  if(!chosen){crLog(r,`⏭️ ${b.name} パス`);crNext(r);return true;}
  if(chosen.type==='attack'){crSpend(b,[chosen]);crTake(r,b,[chosen]);crAttack(r,b,target,[chosen]);}
  else crUse(r,b,chosen,target.id);
  return true;
}
function crSettle(r){
  if(r.phase!=='game')return;
  if(crPopupBusy(r))return;
  // Release the wall-clock gate even if a participant closed the tab mid-animation.
  if(r.popupBusyUntil){
    r.popupBusyUntil=0;
    if(r.popupDeferredWinner){
      r.popupDeferredWinner=false;
      if(crWinner(r))return;
    }
    if(r.popupDeferredNext){
      r.popupDeferredNext=false;
      crNext(r);
      if(r.phase!=='game'||crPopupBusy(r))return;
    }
  }
  for(let i=0;i<20&&r.phase==='game';i++){
    if(crPopupBusy(r))break;
    if(r.pending&&r.deadline<=Date.now()){
      const defender=r.players.find(x=>x.id===r.pending.to);crLog(r,'⏰ 防御時間切れ');crDefend(r,defender,[]);continue;
    }
    if(!r.pending&&r.deadline<=Date.now()){
      crLog(r,'⏰ ターン時間切れ');crNext(r);continue;
    }
    if(crBot(r))continue;
    break;
  }
}

const CR_SHOP={
  mana:{cost:5,name:'魔力の瓶',icon:'💠'},
  heal:{cost:7,name:'命の薬',icon:'💚'},
  shield:{cost:9,name:'守護障壁',icon:'🛡️'},
  draw:{cost:9,name:'追加ドロー',icon:'🎴'},
  cleanse:{cost:6,name:'状態浄化',icon:'✨'},
  sabotage:{cost:12,name:'魔力泥棒',icon:'🕵️'}
};
function crShop(r,p,item,targetId){
  const offer=Object.prototype.hasOwnProperty.call(CR_SHOP,item)?CR_SHOP[item]:null;
  if(!offer)throw Error('その商品は購入できません');
  if(p.shopUsed)throw Error('購入は自分の手番ごとに1回です');
  if(p.gold<offer.cost)throw Error('お金が足りません：必要 ¥'+offer.cost);
    if(item==='cleanse'&&!Object.values(p.status).some(v=>v>0))throw Error('治す状態異常がありません');
  const other=item==='sabotage'?r.players.find(x=>x.id===targetId&&crLive(x)&&x.id!==p.id):null;
  if(item==='sabotage'&&!other)throw Error('魔力を盗む相手を選択してください');
  p.gold-=offer.cost;p.shopUsed=true;
  if(item==='mana')p.mp=crAdd(p.mp,10);
  else if(item==='heal')crHeal(r,p,8,'買った薬で');
  else if(item==='shield')p.shield=crAdd(p.shield,12);
  else if(item==='draw')crDraw(r,p,3);
  else if(item==='cleanse')p.status={poison:0,burn:0,freeze:0,curse:0,weak:0};
  else if(item==='sabotage'){const n=Math.min(8,other.mp);other.mp-=n;p.mp=crAdd(p.mp,n);crLog(r,'🕵️ '+p.name+' は '+other.name+' からMP'+n+'奪った');}
  crLog(r,'🪙 '+p.name+' は ¥'+offer.cost+' で「'+offer.name+'」を購入');
  crVisual(r,'shop','購入！',p.name+'｜'+offer.name+' ¥'+offer.cost,offer.icon,item);
}
function crNewRoom(code,token,name){return {code,phase:'lobby',classroom:false,players:[crPlayer(token,name,false)],host:token,visualSeq:0,visualEvent:null,eliminationSeq:0,lastElimination:null,round:1,
  turnIndex:0,pending:null,deadline:0,winner:null,phenomenon:null,cards:[],log:[],customPopups:[],customPopupSeq:0,popupBusyUntil:0,popupDeferredNext:false,popupDeferredWinner:false,created:Date.now(),updated:Date.now()};}
function crApply(r,msg,p){
  if(crPopupBusy(r)&&msg.type!=='leave')throw Error('演出中です。ポップが終わるまで操作をお待ちください');
  if(msg.type==='classroom'){
    if(p.id!==r.host||r.phase!=='lobby')throw Error('クラス管理の設定はロビーの先生だけが変更できます');
    r.classroom=!!msg.enabled;
    crLog(r,r.classroom?'🏫 先生の承認制ルームを有効にしました':'🏫 通常ルームに戻しました');
  }else if(msg.type==='bulkPublish'){
    if(p.id!==r.host||r.phase!=='lobby')throw Error('一括公開はロビーの部屋主だけが利用できます');
    if(!Array.isArray(msg.cards)||!msg.cards.length||msg.cards.length>100)throw Error('公開カード数は1～100枚です');
    if(JSON.stringify(msg.cards).length>220000)throw Error('デッキが大きすぎます。小分けにしてください');
    for(const raw of msg.cards){
      if(JSON.stringify(raw||{}).length>131072)throw Error('カードJSONは128KiB以内にしてください');
      const card=crValidCard(raw,p.name);card.owner=p.id;
      const prior=card.sourceLocalId?r.cards.findIndex(c=>c.owner===p.id&&c.sourceLocalId===card.sourceLocalId):-1;
      if(prior>=0){card.id=r.cards[prior].id;r.cards[prior]=card;}
      else r.cards.push(card);
    }
    if(r.cards.length>150)throw Error('ルームには150枚まで登録できます');
    crLog(r,'📦 '+msg.cards.length+'枚のカードを一括公開');
  }else if(msg.type==='publish'){
    if(r.classroom&&p.id!==r.host)throw Error('このルームでは先生が確認したカードだけ公開できます');
    if(JSON.stringify(msg.card||{}).length>131072)throw Error('カードJSONは128KiB以内にしてください');
    if(r.phase!=='lobby')throw Error('対戦前に追加・更新してください');
    const card=crValidCard(msg.card,p.name);card.owner=p.id;
    // Stable local IDs let re-publishing a modified card replace its previous
    // room copy. Only the original owner may update it.
    const prior=card.sourceLocalId?r.cards.findIndex(c=>c.owner===p.id&&c.sourceLocalId===card.sourceLocalId):-1;
    if(prior>=0){
      card.id=r.cards[prior].id;
      r.cards[prior]=card;
      crLog(r,`🎨 ${p.name} が「${card.name}」を更新`);
    }else{
      r.cards.push(card);
      crLog(r,`🎨 ${p.name} が「${card.name}」を追加`);
    }
  }else if(msg.type==='updateCard'){
    if(r.phase!=='lobby')throw Error('公開済みカードの更新は対戦前のみ可能です');
    if(r.classroom&&p.id!==r.host)throw Error('このルームでは先生だけがカードを更新できます');
    if(typeof msg.id!=='string')throw Error('更新するカードのIDが不正です');
    const index=r.cards.findIndex(c=>c.id===msg.id);
    if(index<0)throw Error('更新するカードが見つかりません');
    if(r.cards[index].owner!==p.id)throw Error('他の人のカードは編集できません');
    if(JSON.stringify(msg.card||{}).length>131072)throw Error('カードJSONは128KiB以内にしてください');
    const card=crValidCard(msg.card,p.name);
    card.id=r.cards[index].id;
    card.owner=p.id;
    if(!card.sourceLocalId)card.sourceLocalId=r.cards[index].sourceLocalId||'';
    r.cards[index]=card;
    crLog(r,`🎨 ${p.name} が「${card.name}」を再編集して更新`);
  }else if(msg.type==='removeCard'){
    if(r.phase!=='lobby')throw Error('対戦前のみ編集できます');
    const idx=r.cards.findIndex(c=>c.id===msg.id&&(c.owner===p.id||r.host===p.id));
    if(idx<0)throw Error('カードを削除できません');r.cards.splice(idx,1);
  }else if(msg.type==='bot'){
    if(p.id!==r.host||r.phase!=='lobby')throw Error('ホストのみ操作できます');
    if(msg.action==='add'){
      if(r.players.length>=8||r.players.filter(x=>x.bot).length>=4)throw Error('CPUを増やせません');
      r.players.push(crPlayer('bot-'+crUid(),`CPU ${r.players.filter(x=>x.bot).length+1}`,true));
    }else if(msg.action==='remove'){
      const idx=r.players.map(x=>x.bot).lastIndexOf(true);if(idx>=0)r.players.splice(idx,1);
    }
  }else if(msg.type==='start'){
    if(p.id!==r.host||!['lobby','finished'].includes(r.phase)||r.players.length<2)throw Error('開始できません（2人以上必要）');
    r.phase='game';r.pending=null;r.reactionQueue=[];r.customPopups=[];r.customPopupSeq=0;r.popupBusyUntil=0;r.popupDeferredNext=false;r.popupDeferredWinner=false;r.winner=null;r.round=1;r.phenomenon=null;r.visualSeq=0;r.visualEvent=null;r.eliminationSeq=0;r.lastElimination=null;r.scriptSeq=0;r.scriptFeedback=null;r.log=[];
    for(let i=r.players.length-1;i>0;i--){const j=crRand(i+1);[r.players[i],r.players[j]]=[r.players[j],r.players[i]];}
    r.turnIndex=0;
    r.players.forEach(x=>{Object.assign(x,crPlayer(x.id,x.name,x.bot));crDraw(r,x,9);});
    crLog(r,'🎉 対戦開始！');crStartTurn(r);
  }else if(msg.type==='reset'){
    if(p.id!==r.host||r.phase!=='finished')throw Error('リセットできません');r.phase='lobby';r.winner=null;r.pending=null;
  }else if(msg.type==='leave'){
    if(r.phase==='game'&&crLive(p)){
      p.guardian=null;p.hp=0;crEliminate(r,p,'降参');
      if(r.pending&&r.pending.to===p.id){r.pending=null;crNext(r);}
      else if(!r.pending&&r.players[r.turnIndex].id===p.id)crNext(r);
      crWinner(r);
    }else{r.players=r.players.filter(x=>x.id!==p.id);if(r.host===p.id)r.host=r.players[0]?r.players[0].id:null;}
    return {left:true};
  }else{
    if(r.phase!=='game'||!crLive(p))throw Error('ゲーム中の生存プレイヤーのみ操作できます');
    if(msg.type==='defend')crDefend(r,p,Array.isArray(msg.cards)?msg.cards:[]);
    else{
      if(r.pending||r.players[r.turnIndex].id!==p.id)throw Error('今はあなたのターンではありません');
      if(msg.type==='shop'){crShop(r,p,msg.item,msg.target);
      }else if(msg.type==='attack'){
        const cards=crSelect(p,msg.cards,'attack',1,p.hand.length);
        if(!crCanPay(p,cards))throw Error('MPかコインが足りません');
        const target=r.players.find(x=>x.id===msg.target&&crLive(x)&&x.id!==p.id);if(!target)throw Error('攻撃相手を選択してください');
        crSpend(p,cards);crTake(r,p,cards);crAttack(r,p,target,cards);
      }else if(msg.type==='use'){
        const card=p.hand.find(c=>c.uid===msg.card&&['magic','item','guardian','omen'].includes(c.type));
        if(!card)throw Error('使用カードを選んでください');crUse(r,p,card,msg.target);
      }else if(msg.type==='pray'){
        p.mp=crAdd(p.mp,5);crDraw(r,p,1);crLog(r,'🙏 '+p.name+' が祈ってMP +5、札を1枚引いた');
        crVisual(r,'heal','祈り！',p.name+'｜MPが5回復、札を1枚引いた','🙏');crNext(r);
      }else if(msg.type==='trade'){
        const kinds={mp:['gold','mp'],gold:['mp','gold'],heal:['gold','hp']};const pair=kinds[msg.mode];
        if(!pair||p[pair[0]]<4)throw Error('交換できません');p[pair[0]]-=4;
        if(pair[1]==='hp')crHeal(r,p,3,'取引で');else p[pair[1]]=crAdd(p[pair[1]],3);
        crLog(r,`💱 ${p.name} が交換した`);crNext(r);
      }else if(msg.type==='pass'){crLog(r,`⏭️ ${p.name} はパス`);crNext(r);}
      else throw Error('不明な操作です');
    }
  }
  return {};
}


const API={
  create(code,id,name){const r=crNewRoom(code,id,crText(name,14)||'旅人');r.players[0].lastSeen=Date.now();return r;},
  join(r,id,name){
    if(r.players.some(p=>p.id===id))return;
    if(r.phase!=='lobby')throw Error('対戦中です。次の試合から参加してください');
    if(r.players.length>=8)throw Error('満員です（最大8人）');
    const visibleName=r.classroom?`生徒${String(r.players.filter(x=>!x.bot).length).padStart(2,'0')}`:(crText(name,14)||'旅人');
    r.players.push(crPlayer(id,visibleName,false)); crLog(r,`👋 ${visibleName} が参加`);
  },
  leave(r,id){const p=r.players.find(x=>x.id===id);if(!p)return;crApply(r,{type:'leave'},p);},
  apply(r,id,msg){
    const p=r.players.find(x=>x.id===id);if(!p)throw Error('部屋に参加していません');
    crSettle(r);const snapshot=JSON.stringify(r);
    try{const result=crApply(r,msg,p);crSettle(r);return result;}
    catch(error){Object.assign(r,JSON.parse(snapshot));throw error;}
  },
  view(r,id){crSettle(r);const p=r.players.find(x=>x.id===id);if(!p)return null;return crView(r,p);},
  settle(r){if(r.phase==='game')crSettle(r)},
  card(raw,author){return crValidCard(raw,author)},
  base:CR_BASE,
};
global.GameEngine=API;
})(typeof globalThis!=='undefined'?globalThis:this);
