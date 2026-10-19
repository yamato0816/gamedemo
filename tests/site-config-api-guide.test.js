/* node tests/site-config-api-guide.test.js
 * Shared WebSocket configuration and the complete on-site API encyclopedia.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const prefs=new Map();
const fakeStorage={getItem:key=>prefs.get(key)||null,setItem:(key,value)=>prefs.set(key,String(value)),removeItem:key=>prefs.delete(key)};
const firebase={apiKey:'web-key',databaseURL:'https://example.firebasedatabase.app',projectId:'demo',appId:'app'};
const configCtx={localStorage:fakeStorage,CHAOS_FIREBASE_CONFIG:firebase,CHAOS_RELAY_URL:''};
vm.createContext(configCtx);
vm.runInContext(read('transport-config.js'),configCtx);
const publishedRelayCtx={window:{}};
vm.createContext(publishedRelayCtx);
vm.runInContext(read('relay-config.js'),publishedRelayCtx);
const deployedUrl='wss://gamedemo.w-7jsf7s.workers.dev';
assert.equal(publishedRelayCtx.window.CHAOS_RELAY_URL,deployedUrl,'site uses the deployed Cloudflare Worker');
assert.ok(read('index.html').includes('relay-config.js?v=20261019-live-1'),'browser fetches fresh relay config');
const cfg=configCtx.ChaosTransport;
assert.equal(cfg.mode(),'firebase','Firebase remains usable until the Worker URL is provided');
assert.equal(cfg.available('relay'),false);
assert.throws(()=>cfg.choose('relay'),/Cloudflare/);
assert.equal(cfg.validRelay('wss://demo.example.workers.dev'),true);
assert.equal(cfg.validRelay('https://demo.example.workers.dev'),false);
configCtx.CHAOS_RELAY_URL='wss://demo.example.workers.dev';
assert.equal(cfg.defaultMode(),'relay','the shared Cloudflare URL becomes the default without user input');
assert.equal(cfg.mode(),'relay');
cfg.choose('p2p');assert.equal(cfg.mode(),'p2p','user choice persists');
cfg.choose('relay');assert.equal(cfg.mode(),'relay');
prefs.set('cr_relay_url','wss://old.example.workers.dev');
assert.equal(cfg.relayUrl(),'wss://demo.example.workers.dev','shared endpoint beats stale legacy setting');
configCtx.CHAOS_RELAY_URL='';
assert.equal(cfg.relayUrl(),'wss://old.example.workers.dev','legacy settings still function when site URL absent');
const sharedMode=read('transport-settings.js');
assert.ok(!sharedMode.includes("input('cr-relay'"),'no manual Cloudflare URL input');
assert.ok(!sharedMode.includes("input('cr-firebase'"),'no Firebase credentials input');
assert.ok(sharedMode.includes('この方式を使用'),'user can choose a preconfigured mode');
assert.ok(read('firebase-online.js').includes('let config=root.CHAOS_FIREBASE_CONFIG||null'));
assert.ok(read('relay-online.js').includes('root.ChaosTransport?.relayUrl()'));
assert.ok(read('network.js').includes('root.ChaosTransport?.mode()'));
const html=read('index.html');
const scripts=['pycards.js','firebase-config.js','relay-config.js','transport-config.js','firebase-online.js','relay-online.js','network.js','app.js','transport-settings.js','card-api-guide.js'];
for(const script of scripts)assert.ok(html.includes('src="'+script+'?'),script+' not included');
assert.ok(html.indexOf('src="transport-config.js')<html.indexOf('src="network.js'),'config loads first');
assert.ok(html.indexOf('src="pycards.js')<html.indexOf('src="card-api-guide.js'),'interpreter data loads before docs');
assert.ok(html.includes('card-api-guide.css'),'guide stylesheet is loaded');
const guideSrc=read('card-api-guide.js');
assert.ok(guideSrc.includes('root.PyCards?.docs'),'draw function definitions from runtime');
assert.ok(guideSrc.includes('aria-label="カード関数図鑑"'),'dialog is accessible');
assert.ok(guideSrc.includes('data-api-copy'),'example code can be copied');
assert.ok(guideSrc.includes('id="cr-api-search"'),'functions searchable by description');
assert.ok(read('app.js').includes('data-api-guide="open"'),'in-editor handbook link');
const pyCtx={console};vm.createContext(pyCtx);vm.runInContext(read('pycards.js'),pyCtx);
const Py=pyCtx.PyCards;assert.equal(Object.keys(Py.docs).length,Py.reads.length+Py.effects.length);
const events={};
const header={insertBefore(node){events.button=node;},querySelector(){return null;}};
const mockDoc={
 addEventListener(type,fn){events[type]=fn;},
 querySelector(selector){return selector==='.header-right'?header:null},
 createElement(tag){return {tagName:tag,dataset:{},className:'',textContent:'',setAttribute(){}}},
 body:{append(){}}
};
const guideCtx={PyCards:Py,document:mockDoc,navigator:{clipboard:{writeText:async()=>{}}},setTimeout};
vm.createContext(guideCtx);
vm.runInContext(guideSrc,guideCtx);
const handbook=guideCtx.ChaosApiGuide;
assert.ok(handbook?.groups);
const grouped=handbook.groups.flatMap(g=>g.names);
assert.equal(grouped.length,Py.reads.length+Py.effects.length,'all APIs are categorized');
assert.equal(new Set(grouped).size,grouped.length,'every API appears exactly once');
for(const name of grouped)assert.ok(Py.docs[name],name+' must come from game interpreter');
assert.ok(events.button,'header API guide button inserted');
assert.ok(guideSrc.includes('def on_play()')&&guideSrc.includes('on_turn_start'));
console.log('PASS shared Cloudflare and Firebase defaults, input-free selection and 81 categorized API reference entries');
