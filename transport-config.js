/* Shared transport resolution for all devices.
 * The deployed Cloudflare URL in relay-config.js takes precedence over stale
 * per-device settings. Browser-local legacy URLs remain as a compatibility path
 * until the site has a common endpoint.
 */
(function(root){
'use strict';
const validRelay=url=>/^wss:\/\/[a-z0-9.-]+(?::\d+)?\/?$/i.test(String(url||'').trim());
function relayUrl(){
 const shared=String(root.CHAOS_RELAY_URL||'').trim().replace(/\/$/,'');
 if(validRelay(shared))return shared;
 const old=String(root.localStorage?.getItem('cr_relay_url')||'').trim().replace(/\/$/,'');
 return validRelay(old)?old:'';
}
function relaySource(){
 const shared=String(root.CHAOS_RELAY_URL||'').trim();
 if(validRelay(shared))return 'shared';
 return relayUrl()?'legacy':'none';
}
function firebaseAvailable(){
 const config=root.CHAOS_FIREBASE_CONFIG;
 return !!(config&&config.apiKey&&config.databaseURL&&config.projectId&&config.appId);
}
function defaultMode(){
 // Everyone automatically uses Cloudflare once a valid site-wide URL is set.
 return relaySource()==='shared'?'relay':firebaseAvailable()?'firebase':relayUrl()?'relay':'p2p';
}
function available(mode){
 return mode==='relay'?!!relayUrl():mode==='firebase'?firebaseAvailable():mode==='p2p';
}
function mode(){
 const chosen=root.localStorage?.getItem('cr_transport_mode');
 // Explicit user mode selection persists; an unconfigured choice falls back.
 return chosen&&available(chosen)?chosen:defaultMode();
}
function choose(next){
 if(!['relay','firebase','p2p'].includes(next))throw Error('通信方式が正しくありません');
 if(!available(next)){
  if(next==='relay')throw Error('Cloudflareの共通中継URLがまだ設定されていません。運営者がrelay-config.jsにデプロイ後のURLを登録する必要があります');
  if(next==='firebase')throw Error('Firebaseの共通設定がまだ登録されていません');
 }
 root.localStorage?.setItem('cr_transport_mode',next);
}
root.ChaosTransport={validRelay,relayUrl,relaySource,firebaseAvailable,defaultMode,available,mode,choose};
})(typeof window!=='undefined'?window:globalThis);
