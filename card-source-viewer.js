/* Card workshop source reference: only show Forge-compatible Python-like code.
 * Base cards are generated as card.* settings; native engine.js is never exposed.
 */
(function(root){
 'use strict';
 const HELP={
  attack:['# 発展例：攻撃が命中したときHPを回復する','# def on_hit():','#     heal("self", 3)'],
  defense:['# 発展例：防御の威力を高める','# def on_guard():','#     boost_defense(3)'],
  magic:['# 発展例：使ったとき自分を回復','# def on_play():','#     heal("self", 3)'],
  item:['# 発展例：使ったときMPを追加','# def on_play():','#     resource("self", "mp", 3)'],
  guardian:['# 発展例：毎ターンバリアを張る','# def on_turn_start():','#     shield("self", 3)'],
  omen:['# 発展例：全敵に追加ダメージ','# def on_play():','#     damage("all_enemies", 3)']
 };
 function entries(localCards=[],sharedCards=[]){
  return [
   ...(root.GameEngine?.base||[]).map(card=>({card,origin:'base'})),
   ...localCards.map(card=>({card,origin:'local'})),
   ...sharedCards.map(card=>({card,origin:'room'}))
  ];
 }
 function summary(card,origin){
  if(card.script?.trim())return {label:'工房で書かれたPython風コード（そのまま利用可能）',code:card.script};
  const source=root.CardForge.toCode(card);
  if(origin!=='base')return {
   label:'工房に貼り付けられるフォーム再現コード',
   code:'# フォームの基本効果は card.type / card.effect / card.power で再現します。\n'+source
  };
  return {
   label:'工房互換コード（基本効果と発展例）',
   code:'# 既存の基本カードを工房のコード形式へ変換しました。\n'
     +'# card.effect により基本効果が発生します（エンジンのJavaScriptではありません）。\n'
     +source+'\n\n# 以下は学習用の追加効果例です。必要な行の # を外して使えます。\n'
     +(HELP[card.type]||HELP.item).join('\n')
  };
 }
 root.CardSourceViewer={entries,summary};
})(typeof window!=='undefined'?window:globalThis);
