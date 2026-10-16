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
// Convert a stored card (including older cards with no editing metadata) back
// into the user-editable fields. Do not copy host-only IDs or compiled programs.
function editable(card,defaults={}){
 const result={...defaults};
 for(const key of FIELDS)if(card&&card[key]!==undefined)result[key]=card[key];
 result.script=typeof card?.script==='string'?card.script:'';
 return result;
}
// Preserve the same localId on edits instead of accumulating duplicate cards.
function upsert(cards,card,id,newId){
 if(!Array.isArray(cards))throw Error('保存済みカードが壊れています');
 const list=cards.slice(),idx=id==null?-1:list.findIndex(c=>c.localId===id);
 if(id!=null&&idx<0)throw Error('編集中のカードが見つかりません。保存し直してください');
 const localId=id||newId;
 if(typeof localId!=='string'||!localId)throw Error('カードIDが不正です');
 const item={...card,localId};
 if(idx<0)list.push(item);else list[idx]=item;
 return {cards:list,localId,updated:idx>=0};
}
root.CardForge={FIELDS,toCode,payload,editable,upsert};
})(typeof window!=='undefined'?window:globalThis);
