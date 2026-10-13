from pathlib import Path
src=Path('/mnt/data/chaos-relic-online/Code.gs').read_text()
a=src[src.index('const CR_BASE ='):src.index('function doGet(e)')]
b=src[src.index('function crLog(r,msg)'):src.index('/** Single exposed API.')]
# replace rules executor, not custom old
start=b.index('function crRules(r,card,event,ctx){'); end=b.index('function crWinner(r){',start)
b=b[:start]+'''function crRules(r,card,event,ctx){
  if(!card.script)return;
  const result=PyCards.run(card.program || PyCards.compile(card.script),event,{r,self:ctx.self,target:ctx.target,damageDealt:ctx.damageDealt||0,damageTaken:ctx.damageTaken||0}, {
    damage:(who,n)=>crRecipients(r,who,ctx).forEach(p=>crHit(r,p,n,'自作カードで')),
    heal:(who,n)=>crRecipients(r,who,ctx).forEach(p=>crHeal(r,p,n,'自作カードで')),
    status:(who,k,n)=>crRecipients(r,who,ctx).forEach(p=>crStatus(r,p,k,n)),
    shield:(who,n)=>crRecipients(r,who,ctx).forEach(p=>{p.shield=crInt(p.shield+n,0,35)}),
    resource:(who,k,n)=>crRecipients(r,who,ctx).forEach(p=>{p[k]=crInt(p[k]+n,0,99)}),
    draw:(who,n)=>crRecipients(r,who,ctx).forEach(p=>crDraw(r,p,n)),
    cleanse:(who)=>crRecipients(r,who,ctx).forEach(p=>{p.status={poison:0,burn:0,freeze:0,curse:0,weak:0}}),
    summon:(who,k,n)=>crRecipients(r,who,ctx).forEach(p=>{p.guardian={kind:k,turns:n,script:card.script,program:card.program}}),
    phenomenon:(k)=>crPhenomenon(r,k),
    steal:(k,n)=>{if(!ctx.target||ctx.target===ctx.self)return;const v=Math.min(ctx.target[k],n);ctx.target[k]-=v;ctx.self[k]=crInt(ctx.self[k]+v,0,99)},
  });
  if(result.actions>0)crLog(r,`🐍 ${card.name} の特殊能力が発動！`);
}
''' + b[end:]
# patch health process and correct trigger on hit
b=b.replace("pending.cards.forEach(c=>crRules(r,c,'hit',{self:from,target:p}));", "pending.cards.forEach(c=>crRules(r,c,'hit',{self:from,target:p,damageDealt:dealt}));")
b=b.replace("if(p.guardian&&p.guardian.kind==='storm')crHit(r,from,2,'雷神の反撃で');", "if(p.guardian&&p.guardian.kind==='storm')crHit(r,from,2,'雷神の反撃で');")
b=b.replace("crRules(r,c,'defend',{self:p,target:from});", "crRules(r,c,'defend',{self:p,target:from,damageTaken:dealt});")
b=b.replace("crRules(r,c,'block',{self:p,target:from});", "crRules(r,c,'block',{self:p,target:from,damageTaken:0});")
b=b.replace("if(g.rules&&g.rules.length)crRules(r,{rules:g.rules},'turn_start',{self:p,target:crLiving(r).find(x=>x.id!==p.id)||p});", "if(g.script)crRules(r,{script:g.script,program:g.program,name:'守護神'},'turn_start',{self:p,target:crLiving(r).find(x=>x.id!==p.id)||p});")
b=b.replace("p.guardian={kind:e,turns:4,rules:card.rules||[]};", "p.guardian={kind:e,turns:4,script:card.script||'',program:card.program||null};")
# prevent repeat side effects card programs from duplicated beyond a limit. card validation add script + program
needle='description:crText(raw.description,100),rules:crValidRules(raw.rules)};'
rep="description:crText(raw.description,100),rules:[],script:typeof raw.script==='string'?raw.script.slice(0,3500):'',program:null};"
b=b.replace(needle,rep)
find="function crValidCard(raw,author){"
pos=b.index('function crCanPay')
segment=b[b.index(find):pos]
segment=segment.replace('  return {id:', '  const created={id:')
segment=segment.replace('program:null};\n}', "program:null};\n  if(created.script)created.program=PyCards.compile(created.script);\n  return created;\n}")
b=b[:b.index(find)]+segment+b[pos:]
# no script property initial base: fine
# ensure game state not flood losing state when host is tab private
# drop wall-clock timing from 45 and 25 for more casual
b=b.replace('Date.now()+45000','Date.now()+60000').replace('Date.now()+25000','Date.now()+30000')
# crSettle event bots handled host loop
# Guard first attack should not use same custom card with uninitialized rules
head="""/* カオスレリック P2P - ホスト権威型ゲームエンジン（GAS版から移植） */
(function(global){
'use strict';
"""
a=a.replace("Utilities.getUuid().replace(/-/g,'').slice(0,20)","crypto.randomUUID().replace(/-/g,'').slice(0,20)")
end="""
const API={
  create(code,id,name){return crNewRoom(code,id,crText(name,14)||'旅人');},
  join(r,id,name){
    if(r.players.some(p=>p.id===id))return;
    if(r.phase!=='lobby')throw Error('対戦中です。次の試合から参加してください');
    if(r.players.length>=8)throw Error('満員です（最大8人）');
    r.players.push(crPlayer(id,crText(name,14)||'旅人',false)); crLog(r,`👋 ${name} が参加`);
  },
  leave(r,id){const p=r.players.find(x=>x.id===id);if(!p)return;crApply(r,{type:'leave'},p);},
  apply(r,id,msg){
    const p=r.players.find(x=>x.id===id);if(!p)throw Error('部屋に参加していません');
    crSettle(r);const result=crApply(r,msg,p);crSettle(r);return result;
  },
  view(r,id){crSettle(r);const p=r.players.find(x=>x.id===id);if(!p)return null;return crView(r,p);},
  settle(r){if(r.phase==='game')crSettle(r)},
  card(raw,author){return crValidCard(raw,author)},
  base:CR_BASE,
};
global.GameEngine=API;
})(typeof globalThis!=='undefined'?globalThis:this);
"""
Path('/mnt/data/chaos-relic-p2p/engine.js').write_text(head+a+'\n'+b+'\n'+end)
print('engine lines:',len((head+a+b+end).splitlines()))
