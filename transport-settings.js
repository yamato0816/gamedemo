(function(){'use strict';
const header=document.querySelector('.header-right');
if(header){const b=document.createElement('button');b.className='header-link transport-btn';b.textContent='📡 通信';b.dataset.transport='open';header.prepend(b);}
function panel(){
 document.getElementById('relay-settings')?.remove();
 const current=localStorage.getItem('cr_relay_url')||'';
 const wrap=document.createElement('div');wrap.id='relay-settings';wrap.className='modal-backdrop';
 const box=document.createElement('section');box.className='paper modal';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.style.maxWidth='530px';box.style.width='94vw';
 const heading=document.createElement('h2');heading.textContent='📡 対戦の通信方式';box.append(heading);
 const desc=document.createElement('p');desc.textContent='大学のWi-FiなどでP2Pが使えないときは、Cloudflare WebSocket中継を利用できます。参加者全員が同じ方式とURLを指定してください。';box.append(desc);
 const input=document.createElement('input');input.id='cr-relay';input.type='url';input.placeholder='wss://＜あなたのWorker＞.workers.dev';input.value=current;input.style.width='100%';input.style.padding='12px';box.append(input);
 const note=document.createElement('p');note.className='hint';note.textContent='Workerは別途デプロイが必要です。中継URLが未設定ならWebRTC P2Pを使用します。';box.append(note);
 const row=document.createElement('div');row.style.display='flex';row.style.flexWrap='wrap';row.style.gap='8px';row.style.marginTop='12px';
 for(const [act,label] of [['p2p','P2Pに戻す'],['save','中継URLを保存'],['close','閉じる']]){
  const button=document.createElement('button');button.dataset.transport=act;button.className=act==='save'?'primary':'secondary';button.textContent=label;row.append(button);
 }box.append(row);wrap.append(box);document.body.append(wrap);
}
document.addEventListener('click',ev=>{
 const item=ev.target.closest('[data-transport]');if(!item)return;ev.preventDefault();ev.stopImmediatePropagation();
 const action=item.dataset.transport;
 if(action==='open')panel();
 else if(action==='close')document.getElementById('relay-settings')?.remove();
 else if(action==='p2p'){localStorage.removeItem('cr_relay_url');location.reload();}
 else if(action==='save'){
  const value=document.getElementById('cr-relay')?.value.trim().replace(/\/$/,'');
  if(!/^wss:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value||'')){alert('wss://＜ホスト名＞ の形式で指定してください');return;}
  localStorage.setItem('cr_relay_url',value);location.reload();
 }
},true);
})();