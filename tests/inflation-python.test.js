/* node tests/inflation-python.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
let n=0;
const deterministicMath=Object.create(Math);
deterministicMath.random=()=>0.5;
const ctx={
 console,Math:deterministicMath,
 crypto:{randomUUID:()=> '00000000-0000-4000-9000-'+String(++n).padStart(12,'0')}
};
vm.createContext(ctx);
for(const name of ['pycards.js','engine.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx,{filename:name});
}
const game=ctx.GameEngine,py=ctx.PyCards;
function room(){
 const r=game.create('TEST123','a','攻撃者');
 game.join(r,'b','防御者');
 game.apply(r,'a',{type:'start'});
 return {r,a:r.players[r.turnIndex],b:r.players.find(p=>p.id!==r.players[r.turnIndex].id)};
}
const normal=game.base.find(c=>c.type==='attack'&&c.cost===0);
const guard=game.base.find(c=>c.type==='defense'&&c.cost===0);
{
 const {r,a,b}=room();
 const card=game.card({name:'無制限回復',type:'item',effect:'heal',power:10000,cost:0,
  script:'def on_play():\n    heal("self", 99000)\n    resource("self", "mp", 100000)\n    resource("self", "gold", 100000)\n    shield("self", 88000)\n    status("self", "poison", 10000)'},'me');
 a.hand=[{...card,uid:'c1'}];
 game.apply(r,a.id,{type:'use',card:'c1',target:b.id});
 assert.equal(a.hp,109040,'HP is no longer capped to 40');
 assert.ok(a.mp>100000,'MP is no longer capped to 99');
 assert.ok(a.gold>100000,'gold is no longer capped to 99');
 assert.equal(a.shield,88000,'shield no longer capped to 35');
 assert.equal(a.status.poison,10000,'status duration no longer capped');
 assert.equal(r.scriptFeedback?.ok,true,'script should announce success');
 assert.equal(r.scriptFeedback?.actions,5,'the five script actions should run');
}
{
 const {r,a,b}=room();
 a.hp=1000;b.hp=1000;b.hand=[];
 const c=game.card({name:'拡張吸血',type:'attack',effect:'normal',power:12,cost:0,
 script:'def on_hit():\n    heal("self", damage_dealt() * 100)'},'me');
 a.hand=[{...c,uid:'atk'}];
 game.apply(r,a.id,{type:'attack',cards:['atk'],target:b.id});
 game.apply(r,b.id,{type:'defend',cards:[]});
 assert.equal(a.hp,2200,'on_hit must receive real dealt damage and heal beyond 40');
 assert.equal(r.scriptFeedback.event,'hit');
}
{
 const {r,a,b}=room();
 const c=game.card({name:'拡張防御',type:'defense',effect:'normal',power:0,cost:0,
 script:'def on_guard():\n    boost_defense(incoming_damage())'},'me');
 a.hand=[{...normal,uid:'atk',power:150}];b.hand=[{...c,uid:'block'}];
 game.apply(r,a.id,{type:'attack',cards:['atk'],target:b.id});
 game.apply(r,b.id,{type:'defend',cards:['block']});
 assert.equal(b.hp,40,'on_guard should block entire incoming attack');
}
{
 const {r,a,b}=room();
 const c=game.card({name:'小さな拳',type:'attack',effect:'normal',power:1,cost:0},'me');
 a.hand=Array.from({length:6},(_,i)=>({...c,uid:'a'+i}));
 b.hand=[{...guard,uid:'d'}];
 game.apply(r,a.id,{type:'attack',cards:a.hand.map(c=>c.uid),target:b.id});
 assert.equal(r.pending.cards.length,6,'attack card count is not limited to 3');
}
{
 const {r,a,b}=room();
 const c=game.card({name:'無制限ドロー',type:'item',effect:'draw',power:10000,cost:0},'me');
 a.hand=[{...c,uid:'draw'}];
 game.apply(r,a.id,{type:'use',card:'draw',target:b.id});
 assert.ok(a.hand.length>18,'total hand no longer capped at 18');
 assert.ok(a.hand.length<1000,'per-action memory-usage safety limit remains');
}
{
 const code=py.compile('def on_play():\n    x = 2 ** 8\n    y = 2 ** -3\n    resource("self","mp",x)\n    resource("self","gold",round(y * 1000))');
 const self={hp:40,mp:1,gold:1,hand:[],status:{}},found=[];
 const response=py.run(code,'play',{r:{round:1},self,target:self}, {resource:(w,k,value)=>found.push([k,value])});
 assert.equal(response.actions,2);
 assert.equal(found[0][1],256);
 assert.equal(found[1][1],125);
}
assert.equal(game.card({name:'巨大',type:'attack',effect:'normal',power:Number.MAX_SAFE_INTEGER,cost:0},'x').power,Number.MAX_SAFE_INTEGER);
console.log('PASS: uncapped HP/MP/gold/shield/status/hand/stack + Python abilities + safe integer precision');
