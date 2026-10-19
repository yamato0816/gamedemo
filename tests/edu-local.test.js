// Run with: node tests/edu-local.test.js
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const context = vm.createContext({
  crypto, Blob, TextEncoder, TextDecoder, DecompressionStream, Response,
  Math, Date, console, setInterval, clearInterval
});
for (const file of ['pycards.js', 'engine.js', 'local-online.js', 'edu-decks.js']) {
  vm.runInContext(fs.readFileSync(__dirname + '/../' + file, 'utf8'), context, { filename: file });
}
(async () => {
  const { GameEngine, LocalOnline, EduDecks } = context;
  const card = { name:'学習用の炎', type:'attack', effect:'normal', power:8, cost:1,
    resource:'mp', element:'fire', emoji:'🔥', weight:2, description:'条件分岐の練習',
    script:'def on_play():\n    if my_hp() < 20:\n        damage("target", 3)' };
  const zip = EduDecks.archive([card]);
  assert.equal(zip.type,'application/zip');
  const imported = await EduDecks.readFiles([{name:'class.zip',size:zip.size,arrayBuffer:()=>zip.arrayBuffer()}]);
  assert.equal(imported.length,1);
  assert.equal(imported[0].name,card.name);
  assert.equal(imported[0].script,card.script);
  assert.ok(imported[0].localId);
  const json = JSON.stringify({ format:'chaos-relic-edu-deck',version:1,cards:[card] });
  const importedJson = await EduDecks.readFiles([{name:'deck.json',size:json.length,text:async()=>json}]);
  assert.equal(importedJson.length,1);
  let snapshots = [],messages = [];
  const solo = new LocalOnline({onState:s=>snapshots.push(s),onInfo:m=>messages.push(m),onError:()=>{},onClosed:()=>{}});
  await solo.create('生徒');
  assert.equal(solo.room.players.length,4);
  assert.equal(solo.room.players.filter(p=>p.bot).length,3);
  solo.act({type:'bulkPublish',cards:[{...card,sourceLocalId:'student1'}]});
  assert.equal(solo.room.cards.length,1);
  solo.act({type:'start'});
  assert.equal(solo.room.phase,'game');
  assert.ok(snapshots.length>0);
  solo.disconnect();
  assert.equal(solo.ready,false);
  const a='student-teacher',b='student-guest';
  const r=GameEngine.create('CLASS11',a,'先生');
  GameEngine.apply(r,a,{type:'classroom',enabled:true});
  GameEngine.join(r,b,'実名を含む入力');
  assert.match(r.players[1].name,/^生徒\d+$/);
  assert.throws(()=>GameEngine.apply(r,b,{type:'publish',card}),/先生/);
  GameEngine.apply(r,a,{type:'bulkPublish',cards:[{...card,sourceLocalId:'student-001'}]});
  assert.equal(r.cards.length,1);
  GameEngine.apply(r,a,{type:'bulkPublish',cards:[{...card,sourceLocalId:'student-001',power:9}]});
  assert.equal(r.cards.length,1);
  assert.equal(r.cards[0].power,9);
  console.log('PASS: ZIP/JSON deck round-trip, solo CPUs, moderation and batch updates');
})().catch(e=>{console.error(e);process.exitCode=1;});
