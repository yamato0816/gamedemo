/* node tests/popup-busy-timeline.test.js
 * Deterministic fake clock: host locks until all animation frames are complete.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let now=1_000_000,uid=0;
class Clock extends Date{static now(){return now;}}
const context={console,Math,Date:Clock,crypto:{randomUUID:()=>String(++uid).padStart(8,'0')+'-0000-4000-9000-000000000000'}};
vm.createContext(context);
for(const filename of ['pycards.js','engine.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),context,{filename});
}
const E=context.GameEngine,P=context.PyCards;
assert.ok(P.effects.includes('popup_update'));
assert.ok(P.effects.includes('popup_wait'));
const code=[
 'card.name = "確変777"',
 'card.type = "item"',
 'card.emoji = "🎰"',
 'card.cost = 0',
 'card.effect = "normal"',
 'def on_play():',
 '    a = randint(7,7)',
 '    popup("図柄回転！", "？？？", "🎰", "neon", 850)',
 '    popup_wait(500)',
 '    popup_update("第1停止", "【{a}】？？", "🎰", "sunset", 950)',
 '    popup_update("🌈 超大当たり", "【{a}】【{a}】【{a}】", "🌈", "rainbow", 2000)',
 '    resource("self","gold",1000)'
].join('\n');
assert.ok(P.compile(code).handlers.play);
function room(){
 const r=E.create('CASINO1','HOST','ホスト');
 E.join(r,'GUEST','ゲスト');
 E.apply(r,'HOST',{type:'start'});
 const actor=r.players[r.turnIndex],other=r.players.find(p=>p.id!==actor.id);
 const card=E.card({script:code},'作者');
 actor.hand=[{...card,uid:'C777'}];
 return {r,actor,other};
}
{
 const {r,actor,other}=room();
 const originalTurn=r.turnIndex,originalRound=r.round;
 E.apply(r,actor.id,{type:'use',card:'C777',target:other.id});
 const event=r.customPopups[0];
 assert.equal(r.customPopups.length,1,'popup_update must update the SAME popup');
 assert.deepEqual(event.stages.map(x=>x.theme),['neon','sunset','rainbow']);
 assert.deepEqual(event.stages.map(x=>x.duration),[1350,950,2000]);
 assert.equal(event.durationMs,4300);
 assert.equal(event.stages[1].detail,'【7】？？');
 assert.equal(event.stages[2].detail,'【7】【7】【7】');
 assert.equal(r.popupBusyUntil,now+4300);
 assert.equal(E.view(r,actor.id).popupBusyUntil,now+4300);
 assert.equal(actor.gold,1016,'effects resolve atomically before the visual gate');
 assert.equal(r.turnIndex,originalTurn,'turn does not advance while popup is running');
 assert.equal(r.round,originalRound);
 assert.equal(r.popupDeferredNext,true,'turn advancement is queued');
 assert.throws(()=>E.apply(r,other.id,{type:'defend',cards:[]}),/演出中/);
 assert.throws(()=>E.apply(r,actor.id,{type:'pass'}),/演出中/);
 r.deadline=now-1000;
 E.settle(r);
 assert.equal(r.turnIndex,originalTurn,'expired deadline cannot bypass the busy lock');
 now+=4299;E.settle(r);
 assert.equal(r.turnIndex,originalTurn);
 now+=1;E.settle(r);
 assert.notEqual(r.turnIndex,originalTurn,'deferred turn resumes automatically after final stage');
 assert.equal(r.popupBusyUntil,0,'expired gate clears');
 assert.equal(r.popupDeferredNext,false);
 assert.ok(r.deadline>=now+59000,'new turn clock gets a full time window');
}
now+=10000;
{
 const {r,actor,other}=room();
 const fatal=E.card({script:[
 'card.name = "777撃破"','card.type = "item"','card.effect = "normal"',
 'def on_play():','    popup("大当たり", "終了まで待って！", "🌈", "rainbow", 1800)',
 '    damage("all_enemies", 999999)'
 ].join('\n')},'作者');
 actor.hand=[{...fatal,uid:'FATAL'}];other.hp=30;other.shield=0;
 E.apply(r,actor.id,{type:'use',card:'FATAL',target:other.id});
 assert.equal(other.hp,0);
 assert.equal(r.phase,'game','winner screen waits while finishing animation plays');
 assert.ok(r.popupDeferredWinner);
 assert.equal(E.view(r,actor.id).phase,'game');
 const last=now+1800;
 now=last-1;E.settle(r);
 assert.equal(r.phase,'game');
 now=last;E.settle(r);
 assert.equal(r.phase,'finished');
 assert.equal(r.winner,actor.id);
 assert.equal(E.view(r,actor.id).customPopups[0].theme,'rainbow','final frame retained in finished view');
}
now+=10000;
{
 const {r,actor,other}=room();
 const code2='card.name="虹の抽選"\ncard.type = "item"\ncard.effect="normal"\ndef on_play():\n    popup("新規", "はじめ", "✨", "info", 400)\n    popup_update("更新", "最後", "🌈", "rainbow", 500)';
 actor.hand=[{...E.card({script:code2},'作者'),uid:'EDIT'}];
 E.apply(r,actor.id,{type:'use',card:'EDIT',target:other.id});
 // Host migration restores from checkpoint without a volatile JS timer.
 const backup=JSON.parse(JSON.stringify(r));
 const rehydrated=JSON.parse(JSON.stringify(backup));
 now+=1000;E.settle(rehydrated);
 assert.ok(rehydrated.turnIndex!==backup.turnIndex,'restored match releases expired gate');
}
now+=10000;
{
 const {r,actor,other}=room();
 const slow='card.name="長い演出"\ncard.type = "item"\ncard.effect="normal"\ndef on_play():\n    popup("開始","待機","🎰","info",5000)\n    popup_wait(3000)\n    popup_update("1","続き","🌈","rainbow",5000)\n    popup_wait(3000)\n    popup_update("2","続き","🌈","rainbow",5000)\n    popup_update("3","続き","🌈","rainbow",5000)';
 actor.hand=[{...E.card({script:slow},'作者'),uid:'SLOW'}];
 E.apply(r,actor.id,{type:'use',card:'SLOW',target:other.id});
 assert.ok(r.popupBusyUntil-now<=24000,'hard maximum avoids rooms being frozen indefinitely');
 now+=24001;E.settle(r);
 assert.equal(r.popupBusyUntil,0);
}
now+=10000;
{
 const {r,actor,other}=room();
 const invalid='card.name="無効な演出"\ncard.type="item"\ncard.effect="normal"\ndef on_play():\n    popup_update("oops","before first popup","💀","danger")';
 actor.hand=[{...E.card({script:invalid},'作者'),uid:'BAD'}];
 E.apply(r,actor.id,{type:'use',card:'BAD',target:other.id});
 assert.equal(r.scriptFeedback.ok,false,'invalid update records safe script failure');
 assert.equal(r.popupBusyUntil,0,'failure never leaves an animation lock');
}
console.log('PASS staged popups, dynamic variables, authoritative action lock, deadline pause, winner deferral, checkpoint resume and 24s safety limit');
