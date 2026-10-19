// Run with: node tests/edu-local.test.js
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
function compressedZip(filename, content) {
  const name=Buffer.from(filename,'utf8'), data=Buffer.from(content), packed=zlib.deflateRawSync(data);
  let crc=-1;for(const b of data){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  crc=(crc^-1)>>>0;
  const local=Buffer.alloc(30+name.length), central=Buffer.alloc(46+name.length), end=Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,6);local.writeUInt16LE(8,8);
  local.writeUInt32LE(crc,14);local.writeUInt32LE(packed.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);name.copy(local,30);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
  central.writeUInt16LE(8,8);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);
  central.writeUInt32LE(packed.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);name.copy(central,46);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length,12);end.writeUInt32LE(local.length+packed.length,16);
  return Buffer.concat([local,packed,central,end]);
}
const asFile=(name,data)=>({name,size:data.length,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)});

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
  const packedJson=compressedZip('submissions/card.json',Buffer.from(json));
  const packedCards=await EduDecks.readFiles([asFile('folder.zip',packedJson)]);
  assert.equal(packedCards.length,1,'Drive ZIP with compressed JSON imports correctly');
  const nestedZip=compressedZip('class/student01.zip',Buffer.from(await zip.arrayBuffer()));
  const nestedCards=await EduDecks.readFiles([asFile('school-folder.zip',nestedZip)]);
  assert.equal(nestedCards.length,1,'Drive ZIP with student ZIP inside imports correctly');

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
  GameEngine.apply(r,a,{type:'endClass'});
  assert.equal(r.classroomEnded,true);
  assert.equal(GameEngine.view(r,b).classroomEnded,true);
  assert.throws(()=>GameEngine.apply(r,a,{type:'start'}),/終了/);
  console.log('PASS: ZIP/JSON deck round-trip, solo CPUs, moderation, batch updates and emergency end');
})().catch(e=>{console.error(e);process.exitCode=1;});
