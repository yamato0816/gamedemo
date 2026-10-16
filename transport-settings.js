/* CHAOS RELIC: choose a preconfigured network mode, never paste credentials. */
(function(root){
'use strict';
const header=document.querySelector('.header-right');
if(header){
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='header-link transport-btn';
 trigger.innerHTML='<span class="cr-header-icon">📡</span><span class="cr-header-label">通信</span>';trigger.dataset.transport='open';
 trigger.title='通信方式を変更する';header.prepend(trigger);
}
const config=()=>root.ChaosTransport;
const make=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!=null)node.textContent=text;
 return node;
};
function close(){document.getElementById('relay-settings')?.remove();}
function option({id,icon,title,description,notice}){
 const active=config()?.mode()===id,enabled=!!config()?.available(id);
 const card=make('section','cr-transport-choice'+(active?' is-current':'')+(!enabled?' is-unavailable':''));
 const heading=make('div','cr-transport-choice-head');
 const symbol=make('span','cr-transport-icon',icon);
 const titleArea=make('div','cr-transport-choice-label');
 titleArea.append(make('strong','',title),make('span','',description));
 heading.append(symbol,titleArea);
 const flag=make('span','cr-transport-choice-flag',active?'選択中':enabled?'利用可能':'未設定');
 heading.append(flag);card.append(heading);
 if(notice)card.append(make('p','cr-transport-choice-detail',notice));
 const button=make('button','cr-transport-select',active?'✓ 現在の方式':enabled?'この方式を使用':'管理者による設定待ち');
 button.type='button';button.dataset.transport=id;button.disabled=active||!enabled;
 card.append(button);return card;
}
function panel(){
 close();
 const overlay=make('div','modal-backdrop cr-transport-backdrop');
 overlay.id='relay-settings';
 const dialog=make('section','paper modal cr-transport-dialog');
 dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-label','通信方式を選択');
 const header=make('div','cr-transport-title');
 const titleArea=make('div','');
 titleArea.append(make('span','cr-transport-kicker','NETWORK SETTINGS'),make('h2','','📡 対戦の通信方式'));
 const x=make('button','icon-button','×');x.type='button';x.dataset.transport='close';x.setAttribute('aria-label','閉じる');
 header.append(titleArea,x);dialog.append(header);
 dialog.append(make('p','cr-transport-intro','サーバーの接続情報はサイト側で共通管理しています。URL・Firebaseキーの入力は不要です。友達も同じ通信方式で参加してください。'));
 const relay=config()?.relayUrl()||'';
 const source=config()?.relaySource()||'none';
 let description='Cloudflare Workers / Durable Objectsを利用するWebSocket中継';
 const detail=source==='shared'?'✓ サイト共通URLを設定済み：'+new URL(relay.replace(/^wss:/,'https:')).host
  :source==='legacy'?'このブラウザに保存されていた中継URLを使用中。サイト共通URLは未設定です。'
  :'Cloudflareにデプロイ後、運営者がrelay-config.jsへ中継URLを登録すると全員が利用できます。';
 dialog.append(option({id:'relay',icon:'☁️',title:'Cloudflare WebSocket',description,notice:detail}));
 dialog.append(option({id:'firebase',icon:'🔥',title:'Firebase Realtime Database',
  description:'サイトに登録済みのFirebase設定で接続',notice:config()?.firebaseAvailable()?'✓ 共通Firebase設定が利用できます。':'サイト共通のFirebase設定が見つかりません。'}));
 dialog.append(option({id:'p2p',icon:'🔗',title:'WebRTC P2P',
  description:'直接通信。大学Wi-Fiでは接続できない場合があります。',
  notice:'自宅Wi-Fi・モバイル回線向け。WebRTCを制限する回線では利用できません。'}));
 const foot=make('div','cr-transport-foot');
 foot.append(make('span','','※ 切り替えるとページが再読み込みされます。'));
 const closeButton=make('button','secondary','閉じる');
 closeButton.type='button';closeButton.dataset.transport='close';foot.append(closeButton);
 dialog.append(foot);overlay.append(dialog);document.body.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
}
document.addEventListener('click',event=>{
 const element=event.target.closest('[data-transport]');if(!element)return;
 event.preventDefault();event.stopImmediatePropagation();
 const selected=element.dataset.transport;
 if(selected==='open'){panel();return}
 if(selected==='close'){close();return}
 if(!['p2p','relay','firebase'].includes(selected))return;
 try{
  config().choose(selected);
  // An invite must not force an outdated mode after a manual change.
  const url=new URL(location.href);
  url.searchParams.delete('transport');history.replaceState(null,'',url.toString());
  location.reload();
 }catch(error){alert(error.message||String(error))}
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
})(typeof window!=='undefined'?window:globalThis);
