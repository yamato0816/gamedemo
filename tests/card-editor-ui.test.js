/* Run: node tests/card-editor-ui.test.js
 * Simulates localStorage and forge modal without a browser to catch UI regressions. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let uid=0;
const uuid=()=>String(++uid).padStart(8,'0')+'-0000-4000-9000-000000000000';
const previous={
 name:'昔の盾',description:'古い説明',emoji:'🛡️',type:'defense',effect:'normal',
 power:15,cost:7,resource:'gold',element:'water',weight:2,script:'',localId:'local-old-card-1'
};
const scriptPrevious={
 ...previous,name:'コードの剣',type:'attack',effect:'normal',power:27,
 script:'card.name = "コードの剣"\ncard.power = 27\ndef on_play():\n    boost_attack(4)',
 localId:'local-old-card-2'
};
const entries=new Map([['cr3-cards',JSON.stringify([previous,scriptPrevious])]]);
const storage={getItem:key=>entries.get(key)||null,setItem:(key,value)=>entries.set(key,String(value)),
 removeItem:key=>entries.delete(key)};
const nodes={
 app:{innerHTML:''},'modal-root':{innerHTML:''},brand:{addEventListener(){}},
 toast:{textContent:'',className:''},'code-feedback':{textContent:'',className:''},
 'connection-dot':{classList:{add(){},remove(){},toggle(){}}},
 'connection-status':{textContent:''}
};
const actions=[];
function Online(){this.ready=false;this.act=action=>actions.push(action);}
const context={
 console,Math,crypto:{randomUUID:uuid},
 document:{getElementById:key=>nodes[key]||null,addEventListener(){}},
 window:{addEventListener(){},ForgeMonaco:{dispose(){},isMounted(){return false}}},
 localStorage:storage,Online,URLSearchParams,
 location:{search:'',pathname:'/',origin:'https://example.com'},history:{replaceState(){}},
 setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1,clearTimeout:()=>{}
};
// Mirror browser window/globalThis so root.CardForge is visible as a global.
Object.assign(context,context.window);
context.window=context;
vm.createContext(context);
for(const file of ['card-forge-model.js','pycards.js','engine.js','app.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
const run=expression=>vm.runInContext(expression,context);
run('openEditor("local-old-card-1")');
assert.equal(run('draft.name'),'昔の盾');
assert.equal(run('draft.cost'),7);
assert.equal(run('editorMode'),'form');
assert.ok(nodes['modal-root'].innerHTML.includes('保存済みのカード'));
assert.ok(nodes['modal-root'].innerHTML.includes('forge-page-root'),'studio must occupy its own fullscreen surface');
assert.ok(nodes['modal-root'].innerHTML.includes('forge-explorer'),'studio must have a persistent card explorer');
assert.ok(nodes['modal-root'].innerHTML.includes('forge-terminal'),'studio must have a test output panel');
assert.ok(nodes['modal-root'].innerHTML.includes('forge-form-panel'),'studio must retain card properties');
assert.ok(nodes['modal-root'].innerHTML.includes('forge-code-panel'),'studio must retain code editor');
assert.ok(nodes['modal-root'].innerHTML.includes('data-action="save-card"'),'save must be accessible from top toolbar');
assert.ok(nodes['modal-root'].innerHTML.includes('data-action="forge-inspector-toggle"'),'mobile settings must be accessible');
assert.ok(nodes['modal-root'].innerHTML.includes('data-action="forge-explorer-toggle"'),'mobile explorer must be accessible');
assert.ok(!nodes['modal-root'].innerHTML.includes('class="modal-backdrop"'),'editor is a standalone page, not an overlay dialog');
run('draft.name = "新しい盾"; draft.power = 10000; saveCard()');
let list=JSON.parse(entries.get('cr3-cards'));
assert.equal(list.length,2,'re-saving should not create a duplicate');
assert.equal(list[0].localId,previous.localId,'local ID must not change');
assert.equal(list[0].power,10000);
run('openEditor("local-old-card-2")');
assert.equal(run('editorMode'),'code','reopen custom code in code tab');
assert.ok(nodes['modal-root'].innerHTML.includes('forge-code-mode'),'code mode should occupy central editor');
run('draftCode = '+JSON.stringify('card.name = "コード再編集"\ncard.type = "attack"\ncard.power = 456\ncard.cost = 0\ncard.effect = "normal"'));
run('saveCard()');
list=JSON.parse(entries.get('cr3-cards'));
assert.equal(list.length,2);
assert.equal(list[1].name,'コード再編集');
assert.equal(list[1].power,456);
assert.equal(list[1].localId,scriptPrevious.localId);
run('openEditor()');
assert.equal(run('editingCardId'),null,'new card must not be treated as an edit');
assert.equal(run('editorMode'),'form','new cards default to the form tab');
assert.ok(nodes['modal-root'].innerHTML.includes('data-action="save-card"'));
// A published legacy card (without a local source ID) can also be edited.
run('globalThis.roomForTest = GameEngine.create("ROOMABC", "host", "Alice"); GameEngine.join(globalThis.roomForTest,"guest","Bob");');
run('GameEngine.apply(globalThis.roomForTest,"host",{type:"publish",card:{name:"公開済み旧カード",type:"item",effect:"gold",power:12,cost:0,emoji:"🪙"}});');
run('state=GameEngine.view(globalThis.roomForTest,"host");net.ready=true;');
const publishedId=run('state.customCards[0].id');
run('openEditor(null, state.customCards[0].id)');
assert.equal(run('draft.name'),'公開済み旧カード');
run('draft.name = "公開カードを再編集"; draft.power = 222;saveCard()');
assert.equal(actions.at(-1).type,'updateCard');
assert.equal(actions.at(-1).id,publishedId,'same room card must be replaced');
assert.equal(actions.at(-1).card.power,222);
const afterRemote=JSON.parse(entries.get('cr3-cards'));
assert.equal(afterRemote.length,3,'legacy room card with no saved copy is adopted locally once');
assert.equal(afterRemote[2].name,'公開カードを再編集');
assert.ok(actions.at(-1).card.sourceLocalId);
console.log('PASS forge gallery, old form/code edits, draft separation and published-card updates');
