/* node tests/economy.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
let counter=0;
const ctx={
 crypto:{randomUUID:()=>String(++counter).padStart(36,'0')},
 PyCards:{compile:()=>({handlers:{}}),run:()=>({actions:0})},
 console
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../engine.js'),'utf8'),ctx);
const g=ctx.GameEngine;
function game(){
 const room=g.create('ABCDEFG','host','ホスト');
 g.join(room,'guest','参加者');
 g.apply(room,'host',{type:'start'});
 return room;
}
{
 const room=game(),p=room.players[room.turnIndex];
 const oldGold=p.gold,oldMp=p.mp;
 g.apply(room,p.id,{type:'shop',item:'mana'});
 assert.equal(p.gold,oldGold-5,'購入した分だけお金が減る');
 assert.equal(p.mp,Math.min(99,oldMp+10),'購入後のMP');
 assert.equal(p.shopUsed,true,'同じターンは再購入できない');
 assert.throws(()=>g.apply(room,p.id,{type:'shop',item:'heal'}),/1回/);
 assert.equal(g.view(room,p.id).players.find(x=>x.id===p.id).shopUsed,true);
}
{
 const room=game(),p=room.players[room.turnIndex];
 g.apply(room,p.id,{type:'shop',item:'shield'});
 assert.equal(p.shield,12);
 assert.equal(p.gold,7);
}
{
 const room=game(),p=room.players[room.turnIndex];
 p.gold=20;p.hp=21;
 g.apply(room,p.id,{type:'shop',item:'heal'});
 assert.equal(p.hp,29);
}
{
 const room=game(),p=room.players[room.turnIndex],enemy=room.players.find(x=>x.id!==p.id);
 p.gold=20;
 g.apply(room,p.id,{type:'shop',item:'sabotage',target:enemy.id});
 assert.equal(enemy.mp,8,'強奪された相手のMP');
}
{
 const room=game(),attacker=room.players[room.turnIndex],defender=room.players.find(x=>x.id!==attacker.id);
 defender.hp=1;
 const card={...g.base.find(x=>x.type==='attack'),uid:'test-dagger',power:50};
 attacker.hand=[card];
 g.apply(room,attacker.id,{type:'attack',cards:[card.uid],target:defender.id});
 g.apply(room,defender.id,{type:'defend',cards:[]});
 assert.equal(room.phase,'finished');
 assert.equal(room.lastElimination.id,defender.id);
 assert.equal(room.winner,attacker.id);
 assert.equal(g.view(room,attacker.id).lastElimination.name,defender.name);
}
console.log('Gold economy + player knockout tests passed.');