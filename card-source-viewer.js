/* Read-only code explorer for built-in engine cards and authored cards. */
(function(root){
  'use strict';
  const SOURCE_FUNCTIONS={
    attack:'crAttack', defense:'crDefend', magic:'crUse',
    item:'crUse', guardian:'crUse', omen:'crUse'
  };
  let engineTextPromise=null;
  function entries(localCards=[],sharedCards=[]){
    const base=(root.GameEngine?.base||[]).map(card=>({card,origin:'base'}));
    const local=localCards.map(card=>({card,origin:'local'}));
    const shared=sharedCards.map(card=>({card,origin:'room'}));
    return [...base,...local,...shared];
  }
  function summary(card,origin){
    if(card.script?.trim())return {
      label:'実際のPython風カードスクリプト',
      code:card.script
    };
    return {
      label: origin==='base'?'参考コード（この基本カードの設定値をPython風に表現）':'参考コード（フォームの入力値から生成）',
      code:'# このコードは表示用の参考例です。実際の基本効果は engine.js が実装しています。\n'
        +root.CardForge.toCode(card)
    };
  }
  function extractFunction(source,name){
    const pattern='function '+name+'(';
    const at=source.indexOf(pattern);
    if(at<0)throw Error(name+' のソースコードを見つけられません');
    const rest=source.slice(at), next=/\n(?:function|const|global\.)\s/.exec(rest.slice(pattern.length));
    return rest.slice(0,next?next.index+pattern.length:rest.length).trim();
  }
  async function actualImplementation(card){
    if(!card?.id?.startsWith('base-'))return null;
    const fn=SOURCE_FUNCTIONS[card.type];
    if(!fn)return null;
    if(!engineTextPromise){
      engineTextPromise=fetch(new URL('engine.js',location.href),{cache:'force-cache'})
        .then(r=>{if(!r.ok)throw Error('実装ソースを取得できません');return r.text();})
        .catch(error=>{engineTextPromise=null;throw error;});
    }
    return {functionName:fn,code:extractFunction(await engineTextPromise,fn)};
  }
  root.CardSourceViewer={entries,summary,extractFunction,actualImplementation};
})(typeof window!=='undefined'?window:globalThis);
