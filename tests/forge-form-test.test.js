const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ctx=vm.createContext({crypto,console,Math,Date,setTimeout,clearTimeout});
for(const name of ['pycards.js','engine.js','card-forge-model.js','forge-form-test.js','card-source-viewer.js']){
 vm.runInContext(fs.readFileSync(__dirname+'/../'+name,'utf8'),ctx,{filename:name});
}
const base={name:'まほうのカード',description:'フォームの動作テスト',emoji:'✨',type:'magic',effect:'heal',
 power:20,cost:0,weight:2,resource:'mp',element:'none',
 script:'card.name = "悪いコード"\ncard.type = "attack"\ncard.power = 9999\ndef on_play():\n    damage("target",99999)'};
for(const item of [
 {...base,type:'magic',effect:'heal'},
 {...base,type:'item',effect:'gold'},
 {...base,type:'attack',effect:'poison'},
 {...base,type:'defense',effect:'reflect'},
 {...base,type:'guardian',effect:'sprite'},
 {...base,type:'omen',effect:'meteor'}
]){
 const res=ctx.ForgeFormTest.run(item);
 assert.equal(res.card.name,'まほうのカード','hidden code header cannot change form name');
 assert.equal(res.card.script,'','no hidden script may be executed');
 assert.equal(res.card.type,item.type,'form type remains authoritative');
 assert.ok(res.lines.some(x=>x.includes('--- ゲーム内ログ ---')));
 assert.ok(res.lines.some(x=>x.includes(item.name)));
 const line=res.lines.join(' ');
 assert.ok(!line.includes('99999'),'hidden code must have no effects');
 if(item.type==='magic')assert.equal(res.card.effect,'heal');
}
const heal=ctx.ForgeFormTest.run(base);
assert.match(heal.lines.join(' '),/回復|HP/);
const sample=ctx.CardSourceViewer.summary(ctx.GameEngine.base[0],'base');
assert.match(sample.label,/工房互換/);
assert.match(sample.code,/card\.type/);
assert.match(sample.code,/def on_hit/);
assert.ok(!sample.code.includes('function crAttack'));
assert.doesNotThrow(()=>ctx.PyCards.compile(sample.code),'Forge samples are valid scripts');
console.log('PASS form-only GameEngine testing and editable card workshop examples');