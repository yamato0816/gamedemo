/* Run: node tests/card-forge-modes.test.js
 * Form is authoritative in form mode; code headers are authoritative only in code mode.
 * Converting a form to code must preserve built-in card effects exactly. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let seq=0;
const context={console,Math,crypto:{randomUUID:()=>String(++seq)}};
vm.createContext(context);
for(const filename of ['card-forge-model.js','pycards.js','engine.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),context,{filename});
const {CardForge,GameEngine}=context;
const fields=CardForge.FIELDS;
function checkRoundTrip(input){
 const card=GameEngine.card(CardForge.payload(input,'code',CardForge.toCode(input)),'test');
 for(const key of fields)assert.equal(card[key],input[key],'card.'+key+' was not preserved');
}
const form={name:'フォーム上の名前',description:'長い説明\n改行と"引用"を保持',type:'magic',
 emoji:'✨',power:500,cost:23,resource:'gold',effect:'heal',element:'water',weight:3,
 script:'card.name = "古いコード名"\ncard.power = 99999\ncard.cost = 0\ncard.type = "attack"\ncard.effect = "guard_hunt"'};
{
 const saved=GameEngine.card(CardForge.payload(form,'form',form.script),'test');
 assert.equal(saved.name,form.name);assert.equal(saved.type,form.type);
 assert.equal(saved.effect,form.effect);assert.equal(saved.power,500);
 assert.equal(saved.cost,23);assert.equal(saved.resource,'gold');
 assert.equal(saved.script,'','hidden code must never override the form');
}
checkRoundTrip(form);
for(const [type,effect,element] of [
 ['attack','guard_hunt','fire'],['defense','reflect_full','water'],
 ['magic','drain','dark'],['item','draw','forest'],
 ['guardian','phoenix','none'],['omen','meteor','lightning']]){
 checkRoundTrip({...form,type,effect,element});
}
{
 const source='card.name = "コードの名前"\ncard.type = "magic"\ncard.effect = "heal"\ncard.power = 123\ncard.cost = 0';
 const card=GameEngine.card(CardForge.payload(form,'code',source),'test');
 assert.equal(card.name,'コードの名前');assert.equal(card.cost,0);
 assert.equal(card.power,123);
}
{
 const text=CardForge.toCode({...form,description:'0'.repeat(1000)+'\n最後'});
 const card=GameEngine.card(CardForge.payload(form,'code',text),'test');
 assert.ok(card.description.endsWith('\n最後'));
}
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const monaco=fs.readFileSync(path.join(__dirname,'../forge-monaco.js'),'utf8');
assert.ok(app.includes('CardForge.payload(draft,editorMode,codeText())'));
assert.ok(app.includes('setCodeText(CardForge.toCode(draft))'));
assert.ok(app.includes('data-action="mode-form"')&&app.includes('data-action="mode-code"'));
assert.ok(app.includes('data-action="code-lightweight"'),'fallback required on unsupported mobiles');
assert.ok(monaco.includes("registerCompletionItemProvider('python'"));
assert.ok(monaco.includes('getWorkerUrl'));
new Function(app);new Function(monaco);
console.log('PASS: six card kinds, multiline descriptions, Monaco source integration, form/code authority');
