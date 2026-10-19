/* Exercise form cards with the actual GameEngine, not a hidden Python draft.
 * Temporary rooms remain in memory and never connect to online transport.
 */
(function(root){
 'use strict';
 function run(form){
  const card=root.GameEngine.card(root.CardForge.payload(form,'form',''),'工房テスト');
  const host='form-tester',enemy='form-opponent';
  const room=root.GameEngine.create('FORMTEST',host,'プレイヤー');
  root.GameEngine.join(room,enemy,'テスト相手');
  root.GameEngine.apply(room,host,{type:'publish',card});
  root.GameEngine.apply(room,host,{type:'start'});
  const player=room.players.find(p=>p.id===host);
  const opponent=room.players.find(p=>p.id===enemy);
  if(!player||!opponent||!room.cards.length)throw Error('フォームのテストルームを作成できません');
  player.hp=100;player.mp=100;player.gold=100;player.status={poison:0,burn:0,freeze:0,curse:0,weak:0};
  opponent.hp=100;opponent.mp=100;opponent.gold=100;opponent.status={poison:0,burn:0,freeze:0,curse:0,weak:0};
  const testCard={...room.cards[0],uid:'form-test-card'};
  player.hand=[testCard];
  opponent.hand=[{uid:'test-shield',name:'木の盾',type:'defense',effect:'normal',element:'none',power:5,cost:0,resource:'mp'}];
  room.turnIndex=room.players.findIndex(p=>p.id===host);
  room.log=[];
  if(card.type==='defense'){
   room.pending={from:enemy,to:host,damage:25,element:'none',pierce:0,effects:[],kind:'attack',cards:[{name:'テスト攻撃',power:25,type:'attack',effect:'normal'}]};
   root.GameEngine.apply(room,host,{type:'defend',cards:[testCard.uid]});
  }else if(card.type==='attack'){
   root.GameEngine.apply(room,host,{type:'attack',cards:[testCard.uid],target:enemy});
   if(room.pending){
    // Resolve the opposing player's normal reaction to observe actual damage.
    room.popupBusyUntil=0;
    root.GameEngine.apply(room,enemy,{type:'defend',cards:[]});
   }
  }else{
   root.GameEngine.apply(room,host,{type:'use',card:testCard.uid,target:enemy});
  }
  return {
   card,lines:[
    '🧩 フォームの設定を実際のゲームエンジンで実行（コードは使用していません）',
    'カード：'+card.name+' / '+card.type+' / '+card.effect+' / 威力 '+card.power,
    '自分：HP '+player.hp+' / MP '+player.mp+' / Gold '+player.gold,
    '相手：HP '+opponent.hp+' / MP '+opponent.mp+' / Gold '+opponent.gold,
    '--- ゲーム内ログ ---',...room.log.slice().reverse()
   ],
   visual:room.visualEvent||null
  };
 }
 root.ForgeFormTest={run};
})(typeof window!=='undefined'?window:globalThis);
