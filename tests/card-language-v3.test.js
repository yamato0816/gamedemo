/* node tests/card-language-v3.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let seq=0;
const context={console,Math:Object.create(Math),crypto:{randomUUID:()=>('00000000-0000-4000-9000-'+String(++seq).padStart(12,'0'))}};
context.Math.random=()=>0.6;vm.createContext(context);
for(const file of ['pycards.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
const E=context.GameEngine,P=context.PyCards;
const room=()=>{const r=E.create('TEST123','a','A');E.join(r,'b','B');E.apply(r,'a',{type:'start'});return r};
const users=r=>[r.players[r.turnIndex],r.players.find(p=>p.id!==r.players[r.turnIndex].id)];
const attack=E.base.find(c=>c.type==='attack'&&c.cost===0),defense=E.base.find(c=>c.type==='defense'&&c.cost===0);
const long='あ'.repeat(4000);
{
 const source='card.name = "コードだけのカード"\ncard.description = '+JSON.stringify(long)+'\ncard.type = "attack"\ncard.power = 100\ncard.cost = 0\n'+
 'def on_play():\n    bonus = sum_power(target.hand, "defense")\n    for item in target.hand:\n        if item.type == "defense":\n            bonus += item.power\n    boost_attack(bonus)';
 const c=E.card({script:source},'creator');
 assert.equal(c.name,'コードだけのカード');assert.equal(c.description.length,4000);assert.equal(c.cost,0);
 const r=room(),[a,b]=users(r);a.hand=[{...c,uid:'code'}];b.hand=[{...defense,uid:'def',power:13}];
 E.apply(r,a.id,{type:'attack',cards:['code'],target:b.id});
 assert.equal(r.pending.damage,126);
 assert.equal(r.scriptFeedback.ok,true);
 assert.equal(E.view(r,a.id).players.find(p=>p.id===b.id).hand,undefined,'enemy hand is not sent via player view');
}
{
 const r=room(),[a,b]=users(r),mirror=E.base.find(c=>c.effect==='reflect_full');
 a.hand=[{...attack,uid:'atk',power:8},{...defense,uid:'guard',power:10}];
 b.hand=[{...mirror,uid:'mirror',cost:0}];
 E.apply(r,a.id,{type:'attack',cards:['atk'],target:b.id});
 E.apply(r,b.id,{type:'defend',cards:['mirror']});
 assert.equal(a.hp,40,'reflection opens a defense window');
 assert.equal(r.pending.to,a.id);assert.equal(r.pending.kind,'reaction');
 E.apply(r,a.id,{type:'defend',cards:['guard']});
 assert.equal(a.hp,40);assert.equal(r.pending,null);
}
{
 const retaliator=E.card({name:'作った反撃',type:'defense',power:10,cost:0,script:'def on_block():\n    damage("target", 7)'},'tester');
 const r=room(),[a,b]=users(r);
 a.hand=[{...attack,uid:'atk',power:4},{...defense,uid:'guard',power:8}];
 b.hand=[{...retaliator,uid:'retaliator'}];
 E.apply(r,a.id,{type:'attack',cards:['atk'],target:b.id});
 E.apply(r,b.id,{type:'defend',cards:['retaliator']});
 assert.equal(r.pending.to,a.id);assert.equal(r.pending.damage,7);
 E.apply(r,a.id,{type:'defend',cards:['guard']});assert.equal(a.hp,40);
}
{
 const source='def on_play():\n    n = count_cards(target.hand, "defense")\n    discard("target","defense",n)\n    multiply_attack(3)';
 const c=E.card({name:'盾破棄',type:'attack',power:10,cost:0,script:source},'tester');
 const r=room(),[a,b]=users(r);a.hand=[{...c,uid:'s'}];
 b.hand=[{...defense,uid:'d0'},{...defense,uid:'d1'},{...attack,uid:'a0'}];
 E.apply(r,a.id,{type:'attack',cards:['s'],target:b.id});
 assert.equal(r.pending.damage,30);assert.equal(b.hand.filter(x=>x.type==='defense').length,0);
}
{
 assert.throws(()=>P.compile('def on_play():\n    damage(target.__proto__,10)'),/使用できない記号|属性|式|許可/);
 assert.throws(()=>P.compile('def on_play():\n    import os'),/式|許可|イベント/);
}
console.log('PASS code-only JSON, target.hand, loops, bounded counter-defense, private views, custom effects');
