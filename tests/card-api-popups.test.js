/* Run with: node tests/card-api-popups.test.js */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let uid=0;
const M=Object.create(Math);M.random=()=>0.31;
const context={console,Math:M,crypto:{randomUUID:()=>('00000000-0000-4000-9000-'+String(++uid).padStart(12,'0'))}};
vm.createContext(context);
for(const file of ['pycards.js','engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
const E=context.GameEngine,P=context.PyCards;
const attack=E.base.find(c=>c.type==='attack'&&c.cost===0);
const shield=E.base.find(c=>c.type==='defense'&&c.cost===0);
function room(){
 const r=E.create('ABCDEF','host','Host');
 E.join(r,'guest','Guest');E.apply(r,'host',{type:'start'});
 const self=r.players[r.turnIndex],target=r.players.find(p=>p.id!==self.id);
 return {r,self,target};
}
function play(source,options={}){
 const {r,self,target}=room();
 const item=E.card({name:'カードAPI試験',type:'item',power:0,cost:0,effect:'mana',script:source},'test');
 self.hand=[{...item,uid:'SCRIPT'}];
 target.hand=[{...shield,uid:'S1',power:12,element:'fire',cost:4},
             {...shield,uid:'S2',power:7,element:'water',cost:9},
             {...attack,uid:'A1',power:33,cost:3}];
 Object.assign(self,options.self||{});Object.assign(target,options.target||{});
 const beforeSelf=JSON.parse(JSON.stringify(self)),beforeTarget=JSON.parse(JSON.stringify(target));
 E.apply(r,self.id,{type:'use',card:'SCRIPT',target:target.id});
 return{r,self,target,beforeSelf,beforeTarget};
}
assert.ok(P.reads.length>=50&&P.effects.length>=25);
for(const name of [...P.reads,...P.effects])assert.ok(P.docs[name]?.[1],'Missing documentation for '+name);
{
 const {r,self,target}=play([
  'def on_play():',
  '    bonus = hand_count("target", "defense") * 100',
  '    resource("self", "gold", bonus)',
  '    popup("黄金の {bonus}", "敵盾={hand_count('+"'target'"+', '+"'defense'"+')} / 獲得={bonus} / 現在={self.gold}G", "💰", "gold")',
  '    battle_log("報酬 {bonus} / HP {target.hp}")'
 ].join('\n'));
 assert.equal(self.gold,16+200);
 assert.equal(r.customPopups.length,1);
 assert.equal(r.customPopups[0].title,'黄金の 200');
 assert.equal(r.customPopups[0].detail,'敵盾=2 / 獲得=200 / 現在=216G');
 assert.equal(r.customPopups[0].theme,'gold');
 assert.equal(r.scriptFeedback.ok,true);
 assert.deepEqual(E.view(r,self.id).customPopups,E.view(r,target.id).customPopups);
 assert.equal(E.view(r,self.id).players.find(p=>p.id===target.id).hand,undefined,'other hands are private');
}
{
 const code=[
  'def on_play():',
  '    total = hand_power("target", "defense")',
  '    prices = sum_cost(target.hand, "defense")',
  '    fire = count_element(target.hand, "fire")',
  '    hand1 = card_at(target.hand, 0)',
  '    popup("値を読む", "防御威力 {total} / コスト {prices} / 火 {fire} / 札 {hand1.power}", "📚", "info")'
 ].join('\n');
 const {r}=play(code);
 assert.equal(r.customPopups[0].detail,'防御威力 19 / コスト 13 / 火 1 / 札 12');
}
{
 const {r,target}=play('def on_play():\n    set_hp("target", 1)\n    set_shield("target", 777)\n    set_resource("target", "mp", 500)\n    set_status("target", "poison", 20)\n    remove_status("target", "poison")');
 assert.equal(target.hp,1);
 assert.equal(target.shield,777);
 assert.equal(target.mp,500);
 assert.equal(target.status.poison,0);
 assert.equal(r.scriptFeedback.ok,true);
}
{
 const {self,target}=play('def on_play():\n    draw_type("self", "defense", 5)\n    duplicate("target", "defense", 3)\n    clear_hand("target")');
 assert.equal(self.hand.filter(c=>c.type==='defense').length,5);
 assert.equal(target.hand.length,0);
}
{
 const {self,target}=play('def on_play():\n    give("target", "gold", 5)\n    swap_stat("mp")\n    heal_percent("self", 50)',{self:{hp:100,mp:10,gold:20},target:{hp:70,mp:200,gold:3}});
 assert.equal(self.hp,150);
 assert.equal(self.gold,15);
 assert.equal(target.gold,8);
 assert.equal(self.mp,200);
 assert.equal(target.mp,10);
}
{
 const {r}=play([
  'def on_play():',
  '    enemies = enemy_count()',
  '    sumhp = total_hp()',
  '    this_turn = is_my_turn()',
  '    high = highest_power(target.hand)',
  '    low = lowest_power(target.hand)',
  '    guardian = has_guardian("target")',
  '    txt = format("敵 {enemies}人 / 合計HP {sumhp} / 最大 {high} / 最小 {low}")',
  '    popup("情報", "{txt} / my-turn {this_turn} / guardian {guardian}", "📘", "info")'
 ].join('\n'));
 assert.ok(r.customPopups[0].detail.includes('敵 1人'));
 assert.ok(r.customPopups[0].detail.includes('最大 33 / 最小 7'));
 assert.ok(r.customPopups[0].detail.includes('my-turn true'));
}
{
 const {r}=play('def on_play():\n    popup("テスト", "{not_defined}", "⚡", "danger")');
 assert.equal(r.scriptFeedback.ok,false,'unknown variables should show an error');
 assert.equal(r.customPopups.length,0);
}
{
 const lines=['def on_play():'];
 for(let i=0;i<10;i++)lines.push('    popup("お知らせ '+i+'", "値 {self.hp}", "🔥", "danger")');
 const {r}=play(lines.join('\n'));
 assert.equal(r.customPopups.length,6,'cap animations per card event');
}
console.log('PASS 81 documented APIs, variable templates, battle synchronization, readonly views, hand manipulation and sandbox errors');
