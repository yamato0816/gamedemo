/* Run with: node tests/guard-hunt.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
let seq=0;
const mockMath=Object.create(Math);mockMath.random=()=>0.5;
const context={console,Math:mockMath,crypto:{randomUUID:()=>('00000000-0000-4000-9000-'+String(++seq).padStart(12,'0'))}};
vm.createContext(context);
for(const filename of ['pycards.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),context,{filename});
const game=context.GameEngine;
const room=()=>{
 const r=game.create('TEST123','host','攻撃者');
 game.join(r,'guest','防御者');game.apply(r,'host',{type:'start'});return r;
};
const actor=r=>r.players[r.turnIndex];
const other=(r,a)=>r.players.find(p=>p.id!==a.id);
const zeroGuard=game.base.find(c=>c.type==='defense'&&c.cost===0);
const commonAttack=game.base.find(c=>c.type==='attack'&&c.cost===0);
const clones=(card,n,prefix,power=card.power)=>Array.from({length:n},(_,i)=>({...card,uid:prefix+i,power,cost:0}));
{
 const r=room(),from=actor(r),to=other(r,from);
 const shot=game.base.find(c=>c.effect==='guard_hunt');assert.ok(shot);
 from.hand=[{...shot,uid:'shot',cost:0}];to.hand=clones(zeroGuard,5,'def',1);
 game.apply(r,from.id,{type:'attack',cards:['shot'],target:to.id});
 assert.equal(r.pending.damage,shot.power*5);
 game.apply(r,to.id,{type:'defend',cards:to.hand.map(c=>c.uid)});
 assert.ok(r.log.some(s=>s.includes('防御 5 / 攻撃 '+shot.power*5)));
 assert.equal(to.hp,40-(shot.power*5-5));
 assert.ok(to.hand.length>=5,'手札補充は維持される');
}
{
 const r=room(),from=actor(r),to=other(r,from);
 const shot=game.card({name:'盾破壊',type:'attack',effect:'normal',power:1,cost:0,script:'def on_play():\n    n = target_defense_cards()\n    boost_attack(n * 9)'},from.name);
 from.hand=[{...shot,uid:'dynamic'}];to.hand=clones(zeroGuard,4,'guard',0);
 game.apply(r,from.id,{type:'attack',cards:['dynamic'],target:to.id});
 assert.equal(r.pending.damage,37);
}
{
 const r=room(),from=actor(r),to=other(r,from);
 const shield=game.card({name:'超絶防御',type:'defense',effect:'normal',power:0,cost:0,script:'def on_guard():\n    incoming = incoming_damage()\n    boost_defense(incoming)'},to.name);
 from.hand=[{...commonAttack,uid:'huge',power:35}];to.hand=[{...shield,uid:'defense'}];
 game.apply(r,from.id,{type:'attack',cards:['huge'],target:to.id});
 game.apply(r,to.id,{type:'defend',cards:['defense']});
 assert.equal(to.hp,40);
 assert.ok(r.log.some(s=>s.includes('防御 35 / 攻撃 35')));
}
{
 const r=room(),from=actor(r),to=other(r,from);
 from.hand=[{...commonAttack,uid:'str',power:10}];to.hand=clones(zeroGuard,18,'stack',0);
 game.apply(r,from.id,{type:'attack',cards:['str'],target:to.id});
 game.apply(r,to.id,{type:'defend',cards:to.hand.map(c=>c.uid)});
 assert.ok(r.log.some(s=>s.includes('防御 0 / 攻撃 10')));
 assert.equal(to.hp,30);
}
{
 const r=room(),from=actor(r),to=other(r,from);
 const mirror=game.base.find(c=>c.effect==='reflect_full');
 from.hand=[{...commonAttack,uid:'atk',power:6}];to.hand=clones(mirror,2,'mirror',0);
 game.apply(r,from.id,{type:'attack',cards:['atk'],target:to.id});
 game.apply(r,to.id,{type:'defend',cards:['mirror0','mirror1']});
 assert.equal(to.hp,40);
 assert.equal(from.hp,40,'反射で即死せず防御のチャンスがある');
 assert.equal(r.pending.to,from.id);
 game.apply(r,from.id,{type:'defend',cards:[]});
 assert.equal(r.pending.to,from.id);
 game.apply(r,from.id,{type:'defend',cards:[]});
 assert.equal(from.hp,28,'2回の反射を無防備に受ければダメージが入る');
}
{
 const r=room(),from=actor(r),to=other(r,from);
 const shield=game.card({name:'手持ち防御増強',type:'defense',effect:'normal',power:0,cost:0,script:'def on_guard():\n    bonus = my_defense_cards() * 5\n    boost_defense(bonus)'},to.name);
 from.hand=[{...commonAttack,uid:'strike',power:15}];
 to.hand=[{...shield,uid:'s0'},...clones(zeroGuard,2,'spare',0)];
 game.apply(r,from.id,{type:'attack',cards:['strike'],target:to.id});
 game.apply(r,to.id,{type:'defend',cards:['s0']});
 assert.equal(to.hp,40,'on_guardは防御選択前の手持ち防御札枚数を読む');
}
console.log('PASS: shield count, custom script, 18-card defense, stacking mirrors');