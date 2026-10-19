const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const context=vm.createContext({
 crypto,Blob,TextEncoder,TextDecoder,DecompressionStream,Response,Math,Date,console,
 URL,location:{href:'https://school.example.test/game/'},
 fetch:async()=>({ok:true,text:async()=>fs.readFileSync(__dirname+'/../engine.js','utf8')}),
 setTimeout:()=>1,clearTimeout:()=>{}
});
for(const file of ['pycards.js','engine.js','card-forge-model.js','edu-card-crypto.js','edu-decks.js','card-source-viewer.js']){
 vm.runInContext(fs.readFileSync(__dirname+'/../'+file,'utf8'),context,{filename:file});
}
(async()=>{
 const {EduCardCrypto, EduDecks,CardSourceViewer,GameEngine}=context;
 const password='school-shared-password-2026';
 const sample={name:'盾の練習',type:'defense',effect:'normal',power:9,cost:1,weight:2,emoji:'🛡️',
  script:'def on_guard():\n    boost_defense(5)'};
 const one=await EduCardCrypto.encrypt(sample,password);
 assert.equal(one.type,'application/octet-stream');
 const bytes=new Uint8Array(await one.arrayBuffer());
 assert.equal(new TextDecoder().decode(bytes.slice(0,8)),'CRCARD01');
 assert.equal(new TextDecoder().decode(bytes).includes('盾の練習'),false,'no plain source data in encrypted submission');
 const input={name:'submission.crcard',size:one.size,arrayBuffer:()=>one.arrayBuffer()};
 const restored=await EduDecks.readFiles([input],{password});
 assert.equal(restored.length,1);assert.equal(restored[0].name,sample.name);assert.equal(restored[0].script,sample.script);
 await assert.rejects(()=>EduCardCrypto.decrypt(bytes,'not-the-same-pass-123'),/復号/);
 const changed=bytes.slice();changed[changed.length-1]^=0x01;
 await assert.rejects(()=>EduCardCrypto.decrypt(changed,password),/復号/);
 await assert.rejects(()=>EduCardCrypto.encrypt(sample,'short'),/12文字/);
 const zip=await EduDecks.archive([sample,sample],password);
 assert.equal(zip.type,'application/zip');
 const zbytes=new Uint8Array(await zip.arrayBuffer());
 assert.equal(new TextDecoder().decode(zbytes).includes('盾の練習'),false,'no card names in class ZIP');
 const round=await EduDecks.readFiles([{name:'all.zip',size:zip.size,arrayBuffer:()=>zip.arrayBuffer()}],{password});
 assert.equal(round.length,2);
 const source=CardSourceViewer.summary(sample,'local');
 assert.match(source.code,/boost_defense/);
 const first=GameEngine.base.find(x=>x.type==='attack');
 const entry=CardSourceViewer.summary(first,'base');
 assert.match(entry.label,/工房互換コード/);
 assert.match(entry.code,/card\.type/);
 assert.match(entry.code,/def on_hit/);
 assert.ok(!entry.code.includes('function crAttack('),'never show internal engine JavaScript');
 const program=context.PyCards.compile(entry.code);
 assert.ok(program.meta,'generated Forge code compiles successfully');
 console.log('PASS: encrypted one-card exports, tamper rejection, encrypted teacher ZIP and source browser');
})().catch(err=>{console.error(err);process.exitCode=1;});
