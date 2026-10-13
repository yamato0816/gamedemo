const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const context=vm.createContext({crypto,console,Math,Date,setInterval,clearInterval});
for(const src of ['pycards.js','engine.js'])vm.runInContext(fs.readFileSync(__dirname+'/../'+src,'utf8'),context,{filename:src});
const {PyCards,GameEngine}=context;
const tests=[
 [`damage-based heal`, `def on_hit():\n    dealt = damage_dealt()\n    healed = min(8, dealt // 2)\n    if healed > 0:\n        heal("self", healed)`,7],
 [`condition + arithmetic`, `def on_play():\n    bonus = 3\n    if my_hp() < 20:\n        damage("target", bonus * 2)\n    else:\n        heal("self", 4)`,4],
 [`random branch`, `def on_play():\n    luck = randint(4, 4)\n    if luck >= 3 and my_mp() < 18:\n        resource("self", "mp", 5)`,5],
];
for(const [label,source,expected] of tests){
 const ast=PyCards.compile(source),self={hp:25,mp:10,gold:5,status:{}},target={hp:35,mp:8,gold:5,status:{}};const actions=[];
 let got=[];PyCards.run(ast,label==='damage-based heal'?'hit':'play',{r:{round:1},self,target,damageDealt:14,damageTaken:6},{damage:(who,n)=>got.push(['damage',n]),heal:(who,n)=>got.push(['heal',n]),resource:(who,key,n)=>got.push(['resource',n])});
 assert.equal(got[0]?.[1],expected,label);console.log('✓',label,got);
}
for(const bad of ['import os','def x():\n    damage("target", 5)','def on_play():\n    while True:\n        damage("target", 10)','def on_hit():\n    damage("target", 5); damage("target", 5)']){
 assert.throws(()=>PyCards.compile(bad));console.log('✓ rejects unsafe python');
}
const A='11111111-1111-4111-a111-111111111111',B='22222222-2222-4222-a222-222222222222';
const r=GameEngine.create('ABCD234',A,'A');GameEngine.join(r,B,'B');
assert.equal(r.players.length,2);GameEngine.apply(r,A,{type:'start'});assert.equal(r.phase,'game');
assert.equal(r.players[0].hand.length,9);assert.equal(r.players[1].hand.length,9);
const custom=GameEngine.card({name:'血の結晶',type:'attack',power:6,effect:'normal',emoji:'🩸',weight:1,resource:'mp',script:tests[0][1]},'Test');
assert.equal(custom.program.handlers.hit.length,3);
const hostView=GameEngine.view(r,A);const peerView=GameEngine.view(r,B);
assert.notEqual(hostView.me,peerView.me);assert.equal(hostView.hand.length,9);assert.equal(peerView.hand.length,9);
assert.equal(peerView.players[0].hand,undefined);assert.equal(peerView.players[1].hand,undefined);
console.log('✓ game started, private hands, card compile');
// force deterministic combat card into active player's hand and defense into target player's hand
const attacker=r.players[r.turnIndex],defender=r.players.find(p=>p!==attacker);
const activeCard={...custom,uid:'unique-attack'};attacker.hand.push(activeCard);
defender.hand.push({name:'盾',type:'defense',power:1,effect:'normal',cost:0,resource:'mp',element:'none',uid:'shield'});
const attackerHP=attacker.hp;
GameEngine.apply(r,attacker.id,{type:'attack',cards:[activeCard.uid],target:defender.id});
assert.equal(r.pending.to,defender.id);
GameEngine.apply(r,defender.id,{type:'defend',cards:['shield']});
assert.equal(r.pending,null);assert.ok(attacker.hp>=attackerHP);console.log('✓ attack defend + on_hit');
console.log('PASSED');
