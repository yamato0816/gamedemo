/* Card-authoring contract shared by both tabs.
 * The form and the source editor represent DIFFERENT authoritative inputs.
 * Converting the form to code preserves the built-in effect through card.effect.
 */
(function(root){
'use strict';
const FIELDS=['name','description','type','emoji','power','cost','resource','effect','element','weight'];
const numeric=new Set(['power','cost','weight']);
function toCode(form){
 const source=FIELDS.map(key=>{
  const value=numeric.has(key)?Number(form[key]??(key==='weight'?1:0)):String(form[key]??'');
  return 'card.'+key+' = '+JSON.stringify(value);
 });
 source.push('','# 基本効果は card.type / card.effect / card.power に設定済みです。');
 source.push('# 追加効果が必要な場合だけ def on_play(): などを追記してください。');
 return source.join('\n');
}
function payload(form,mode,code){
 const raw={...form};
 delete raw.localId;
 if(mode==='form'){
  // A previous script (and its card.* headers) must never override the form.
  raw.script='';
 }else if(mode==='code'){
  raw.script=String(code??'');
 }else throw Error('カードの作成方法が不明です');
 return raw;
}
root.CardForge={FIELDS,toCode,payload};
})(typeof window!=='undefined'?window:globalThis);
