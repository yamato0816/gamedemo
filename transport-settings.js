/* Transport chooser: P2P, WebSocket relay, or Firebase RTDB. */
(function(){
'use strict';
const header=document.querySelector('.header-right');
if(header){
 const button=document.createElement('button');
 button.className='header-link transport-btn';button.textContent='📡 通信';button.dataset.transport='open';
 header.prepend(button);
}
const getMode=()=>localStorage.getItem('cr_transport_mode')||(localStorage.getItem('cr_relay_url')?'relay':'p2p');
function add(tag,className,text){
 const n=document.createElement(tag);if(className)n.className=className;if(text)n.textContent=text;return n;
}
function section(title,description){
 const box=add('section','cr-transport-section');
 box.append(add('h3','',title),add('p','hint',description));
 return box;
}
function input(id,value,placeholder,type='text'){
 const n=document.createElement(type==='textarea'?'textarea':'input');n.id=id;n.placeholder=placeholder;n.value=value;
 n.style.width='100%';n.style.padding='10px';n.style.borderRadius='7px';n.style.border='1px solid #cad0c9';
 if(type!=='textarea')n.type='text';
 else{n.rows=7;n.spellcheck=false;n.style.font='11px/1.5 monospace';n.style.resize='vertical';}
 return n;
}
function button(label,action,primary=false){
 const b=add('button',primary?'primary':'secondary',label);b.dataset.transport=action;return b;
}
function panel(){
 document.getElementById('relay-settings')?.remove();
 const mode=getMode();
 const overlay=add('div','modal-backdrop');overlay.id='relay-settings';
 const box=add('section','paper modal');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
 box.style.cssText='width:min(96vw,670px);max-height:94dvh;overflow-y:auto;padding:18px';
 box.append(add('h2','','📡 対戦の通信方式'));
 box.append(add('p','hint','選択した通信方式はこの端末のブラウザに保存されます。同じ部屋に参加する全員は同じ通信方式を利用してください。'));
 const status=add('p','','現在の方式：'+({p2p:'WebRTC P2P',relay:'WebSocket中継',firebase:'Firebase'}[mode]||mode));
 status.style.fontWeight='800';box.append(status);
 const p2p=section('1. P2P','外部中継なし。学内Wi-FiなどではWebRTCが遮断されることがあります。');
 p2p.append(button('WebRTC P2Pを使う','p2p',mode==='p2p'));box.append(p2p);
 const relay=section('2. WebSocket中継','すでにCloudflareなどに中継サーバーを公開している場合に利用できます。');
 relay.append(input('cr-relay',localStorage.getItem('cr_relay_url')||'','wss://your-worker.workers.dev'));
 relay.append(button('中継URLを保存して選択','relay',mode==='relay'));box.append(relay);
 const firebase=section('3. Firebase Realtime Database（無料枠）','FirebaseのWebアプリ構成を貼り付けます。Anonymous認証とRealtime DatabaseのRules設定が必要です。');
 const saved=localStorage.getItem('cr_firebase_config');
 firebase.append(input('cr-firebase',saved?JSON.stringify(JSON.parse(saved),null,2):'','Firebase コンソールの firebaseConfig を貼り付け（共通設定済みなら空欄可）','textarea'));
 if(window.CHAOS_FIREBASE_CONFIG)firebase.append(add('p','hint','✓ サイト共通Firebase設定が検出されました。空欄でも使えます。'));
 const check=add('label','','');check.style.cssText='display:flex;gap:9px;align-items:flex-start;margin:10px 0;font-size:12px';
 const cb=document.createElement('input');cb.type='checkbox';cb.id='cr-longpoll';cb.checked=localStorage.getItem('cr_firebase_longpoll')==='1';
 const words=add('span','','大学Wi-Fi向け: FirebaseのLong Pollingを優先する（WebSocketを使用しません）');
 check.append(cb,words);firebase.append(check);
 firebase.append(button('Firebase設定を保存して選択','firebase',mode==='firebase'));
 const help=add('p','hint','貼り付けるのは apiKey、authDomain、databaseURL、projectId、appId を含むブラウザ用firebaseConfigです。サービスアカウント秘密鍵は絶対に貼り付けないでください。');
 firebase.append(help);
 const link=add('a','','Firebaseの設定手順');link.href='https://github.com/yamato0816/gamedemo/blob/main/FIREBASE_SETUP.md';link.target='_blank';link.rel='noopener';firebase.append(link);
 box.append(firebase);
 const footer=add('div','');footer.style.cssText='display:flex;justify-content:flex-end;margin-top:12px';
 footer.append(button('閉じる','close'));box.append(footer);
 for(const sec of box.querySelectorAll('.cr-transport-section'))sec.style.cssText='padding:12px 0;border-bottom:1px solid #d5d9d1';
 overlay.append(box);document.body.append(overlay);
}
function parseFirebase(raw){
 if(raw.length>10000||/private_key|service_account|client_email/i.test(raw))throw Error('秘密鍵の貼り付けは禁止です');
 let value=raw.trim();
 if(!value.startsWith('{')){const a=value.indexOf('{'),z=value.lastIndexOf('}');if(a<0||z<a)throw Error('firebaseConfig のオブジェクトを貼り付けてください');value=value.slice(a,z+1);}
 // Accept either strict JSON or Firebase Console's JavaScript object literal.
 let config;
 try{config=JSON.parse(value)}catch{
  const fixed=value.replace(/([,{]\s*)([a-zA-Z_$][\w$]*)\s*:/g,'$1"$2":').replace(/,\s*}/g,'}').replace(/'([^']*)'/g,(_,v)=>JSON.stringify(v));
  config=JSON.parse(fixed);
 }
 if(!config||typeof config!=='object')throw Error('構成情報が不正です');
 const keys=['apiKey','authDomain','databaseURL','projectId','appId','messagingSenderId','storageBucket','measurementId'];
 const clean={};for(const key of keys){if(typeof config[key]==='string')clean[key]=config[key].trim();}
 if(!clean.apiKey||!clean.projectId||!clean.appId||!clean.databaseURL)throw Error('apiKey / projectId / appId / databaseURL が必要です');
 if(!/^https:\/\/[a-z0-9.-]+\.(?:firebaseio\.com|firebasedatabase\.app)\/?$/i.test(clean.databaseURL))throw Error('Realtime DatabaseのdatabaseURLが不正です');
 return clean;
}
document.addEventListener('click',ev=>{
 const item=ev.target.closest('[data-transport]');if(!item)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const mode=item.dataset.transport;
 try{
  if(mode==='open')return panel();
  if(mode==='close')return document.getElementById('relay-settings')?.remove();
  if(mode==='p2p'){localStorage.setItem('cr_transport_mode','p2p');const u=new URL(location.href);u.searchParams.delete('transport');history.replaceState(null,'',u.toString());location.reload();return}
  if(mode==='relay'){
   const v=document.getElementById('cr-relay')?.value.trim().replace(/\/$/,'');
   if(!/^wss:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(v||''))throw Error('中継URLは wss://ホスト名 の形式で指定してください');
   localStorage.setItem('cr_relay_url',v);
   localStorage.setItem('cr_transport_mode','relay');const u=new URL(location.href);u.searchParams.delete('transport');history.replaceState(null,'',u.toString());location.reload();return;
  }
  if(mode==='firebase'){
   const raw=document.getElementById('cr-firebase')?.value||'';
   const config=raw.trim()?parseFirebase(raw):window.CHAOS_FIREBASE_CONFIG;
   if(!config||!config.apiKey||!config.databaseURL)throw Error('Firebase構成情報を入力するか、サイト共通設定を登録してください');
   if(raw.trim())localStorage.setItem('cr_firebase_config',JSON.stringify(config));
   else localStorage.removeItem('cr_firebase_config');
   localStorage.setItem('cr_firebase_longpoll',document.getElementById('cr-longpoll')?.checked?'1':'0');
   localStorage.setItem('cr_transport_mode','firebase');location.reload();
  }
 }catch(error){alert(error.message||String(error));}
},true);
})();