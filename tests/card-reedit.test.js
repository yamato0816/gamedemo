/* Run: node tests/card-reedit.test.js
 * Persisted, legacy, and published cards remain editable in place. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let uuid=0;
const context={console,Math,crypto:{randomUUID:()=>('00000000-0000-4000-9000-'+String(++uuid).padStart(12,'0'))}};
vm.createContext(context);
for(const name of ['card-forge-model.js','pycards.js','engine.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context,{filename:name});
}
const {CardForge,GameEngine:E}=context;
const form={name:'最初のカード',type:'attack',effect:'normal',power:10,cost:3,
 emoji:'⚔️',element:'fire',resource:'mp',weight:3,description:'最初の説明',script:''};
const savedId='00000000-0000-4000-9000-000000000001';
{
 const legacy={...form,localId:savedId};
 const editable=CardForge.editable(legacy,{name:'初期値',type:'magic',effect:'heal'});
 assert.equal(editable.name,legacy.name);
 assert.equal(editable.type,legacy.type);
 assert.equal(editable.script,'');
 assert.equal(editable.localId,undefined,'do not mix storage identity into saved card properties');
 const revised={...editable,name:'再編集したカード',power:555,cost:100,description:'上書き保存'};
 const changed=CardForge.upsert([legacy],revised,savedId,'unexpected-new-id');
 assert.equal(changed.cards.length,1,'editing never creates duplicates');
 assert.equal(changed.cards[0].localId,savedId,'preserve original card ID');
 assert.equal(changed.cards[0].power,555);
 assert.equal(legacy.name,'最初のカード','existing immutable data should remain unchanged');
 assert.equal(changed.updated,true);
 const newCard=CardForge.upsert(changed.cards,{...form,name:'新規'},null,'new-card-id');
 assert.equal(newCard.cards.length,2);
 assert.equal(newCard.cards[1].localId,'new-card-id');
 assert.throws(()=>CardForge.upsert(newCard.cards,revised,'missing-card-id','n'),/見つかりません/);
}
{
 const old=CardForge.editable({...form,script:'card.name = "コード名"\ndef on_play():\n    heal("self", 10)'});
 const source=CardForge.toCode(old);
 assert.equal(E.card(CardForge.payload({...old,power:80,script:source},'form',source),'me').power,80,
   'form editing ignores old card.* script');
 assert.equal(E.card(CardForge.payload(old,'code',source),'me').name,form.name,
   'code generated from form retains the same card metadata');
}
{
 const r=E.create('TEST-ROOM','host','Alice');
 E.join(r,'other','Bob');
 const sourceLocalId=savedId;
 E.apply(r,'host',{type:'publish',card:{...form,sourceLocalId}});
 assert.equal(r.cards.length,1);
 const roomId=r.cards[0].id;
 assert.equal(r.cards[0].sourceLocalId,savedId);
 assert.equal(r.cards[0].owner,'host');
 E.apply(r,'host',{type:'publish',card:{...form,name:'再公開したカード',power:700,sourceLocalId}});
 assert.equal(r.cards.length,1,'same saved card re-publish must replace room card');
 assert.equal(r.cards[0].id,roomId,'room ID remains stable');
 assert.equal(r.cards[0].power,700);
 assert.throws(()=>E.apply(r,'other',{type:'updateCard',id:roomId,card:{...form,power:0}}),/他の人/);
 assert.equal(r.cards[0].power,700,'failed unauthorized update rolls back');
 E.apply(r,'host',{type:'updateCard',id:roomId,card:{
  ...form,script:'card.name = "コード再編集"\ncard.power = 999\ndef on_play():\n    heal("self", 22)',
  sourceLocalId
 }});
 assert.equal(r.cards.length,1);
 assert.equal(r.cards[0].id,roomId);
 assert.equal(r.cards[0].name,'コード再編集');
 assert.equal(r.cards[0].power,999);
 assert.equal(r.cards[0].owner,'host');
 assert.equal(r.cards[0].sourceLocalId,savedId);
 E.apply(r,'other',{type:'publish',card:{...form,name:'Bobのカード',power:80}});
 const bobId=r.cards[1].id;
 E.apply(r,'other',{type:'updateCard',id:bobId,card:{...form,name:'Bobの更新',power:81}});
 assert.equal(r.cards[1].id,bobId);
 assert.equal(r.cards[1].name,'Bobの更新');
 E.apply(r,'host',{type:'start'});
 assert.throws(()=>E.apply(r,'host',{type:'updateCard',id:roomId,card:form}),/対戦前/);
}
console.log('PASS: edit/re-save existing cards without duplicates, stable IDs, code/form modes, publish update and authorization');
