/* CHAOS RELIC Monaco editor integration.
 * Monaco provides Python highlighting, completion and navigation.
 * The actual card interpreter is PyCards: this file never evaluates Python.
 * The textarea is kept as an accessible offline/CDN/mobile fallback. */
(function(root){
'use strict';
const VERSION='0.52.2';
const CDN='https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/'+VERSION+'/min';
const BASE=CDN+'/vs';
let loaderPromise=null,monaco=null,editor=null,changeSubscription=null;
let host=null,textarea=null,onChange=null,onStatus=null,generation=0,loading=false,forceFallback=false,diagnosticTimer=null,registered=false;
const docs={
  len:['array','手札やプレイヤー配列の要素数'],
  count_cards:['hand, "defense"','指定した種類のカード枚数を数える'],
  sum_power:['hand, "attack"','手札にある特定種類のカードの威力の合計'],
  card_at:['hand, 0','指定位置にあるカードを取得'],
  damage_dealt:['','攻撃が命中した際の実ダメージ'],
  damage_taken:['','防御後に受けた実ダメージ'],
  my_hp:['','自分の現在HP'],target_hp:['','対象プレイヤーのHP'],
  my_mp:['','自分のMP'],target_mp:['','対象のMP'],
  my_gold:['','自分のお金'],target_gold:['','対象のお金'],
  my_defense_cards:['','自分の防御カード枚数'],
  target_defense_cards:['','相手の防御カード枚数'],
  incoming_damage:['','防御しようとしている攻撃の威力'],
  round_number:['','現在のラウンド'],
  has_status:['"target", "poison"','状態異常の有無'],
  randint:['1, 6','指定範囲内の整数乱数'],chance:['0.5','確率でTrue'],
  min:['a, b','最小値'],max:['a, b','最大値'],
  abs:['value','絶対値'],int:['value','整数化'],round:['value','四捨五入'],
  damage:['"target", 10','指定対象へダメージ'],
  heal:['"self", 10','対象のHPを回復'],
  set_hp:['"target", 1','対象のHPを指定値にする'],
  status:['"target", "poison", 3','状態異常を付与'],
  shield:['"self", 10','バリアを追加'],
  resource:['"self", "gold", 100','MPまたはGoldを増減'],
  draw:['"self", 3','カードを引く'],
  cleanse:['"self"','状態異常を解除'],
  summon:['"self", "phoenix", 3','守護神を召喚'],
  phenomenon:['"meteor"','超常現象を発生'],
  steal:['"mp", 10','相手のMP/Goldを奪う'],
  boost_attack:['10','攻撃の威力を加算'],
  boost_defense:['10','防御力を加算'],
  discard:['"target", "defense", 2','指定カードを捨てさせる'],
  swap_hands:['','対象と手札を交換'],
  multiply_attack:['3','攻撃の威力を倍化']
};
// Keep suggestions aligned with the actual restricted Python interpreter.
Object.assign(docs,root.PyCards?.docs||{});
const cardFields={
 name:['"カードの名前"','表示名'],
 description:['"カードの能力説明"','カードの説明文'],
 type:['"attack"','種類: attack / defense / magic / item / guardian / omen'],
 emoji:['"⚔️"','カードのアイコン'],
 power:['10','威力または効果量'],cost:['0','使用コスト'],
 resource:['"mp"','コスト: mp / gold'],
 effect:['"normal"','基本効果（カードの種類で選択肢が変わります）'],
 element:['"none"','属性: none / fire / water / forest / lightning / dark'],
 weight:['3','山札への出現頻度']
};
const playerFields={
 id:'プレイヤーID',name:'プレイヤー名',hp:'HP',mp:'MP',gold:'所持金',
 shield:'バリア',status:'状態異常',hand:'カードオブジェクトの配列'
};
const handFields={
 name:'カード名',description:'説明',type:'カード種類',emoji:'アイコン',
 power:'威力',cost:'消費コスト',resource:'MPかGold',effect:'基本効果',
 element:'属性',weight:'山札の出現頻度'
};
const events={
 play:['boost_attack(0)','カードを使用した直後に発動'],
 hit:['heal("self", damage_dealt())','攻撃が命中した後に発動'],
 guard:['boost_defense(incoming_damage())','防御値を計算する前に発動'],
 defend:['shield("self", 3)','防御カードを使用したときに発動'],
 block:['heal("self", 3)','攻撃を完全に防いだときに発動'],
 turn_start:['resource("self", "mp", 3)','守護神の手番開始時に発動']
};
const notify=message=>{if(onStatus)onStatus(message);};
function injectLoader(){
 return new Promise((resolve,reject)=>{
  if(root.require && typeof root.require.config==='function')return resolve(root.require);
  const script=root.document.createElement('script');
  script.src=BASE+'/loader.min.js';script.async=true;script.crossOrigin='anonymous';
  script.onload=()=>root.require?resolve(root.require):reject(Error('Monacoのローダーが見つかりません'));
  script.onerror=()=>reject(Error('Monaco CDNにアクセスできません'));
  root.document.head.appendChild(script);
 });
}
function load(){
 if(monaco)return Promise.resolve(monaco);
 if(loaderPromise)return loaderPromise;
 loaderPromise=injectLoader().then(amd=>{
  root.MonacoEnvironment={
   getWorkerUrl:function(){
    const contents="self.MonacoEnvironment={baseUrl:"+JSON.stringify(CDN+'/')+"};"+
      "importScripts("+JSON.stringify(BASE+'/base/worker/workerMain.js')+");";
    return 'data:text/javascript;charset=utf-8,'+encodeURIComponent(contents);
   }
  };
  amd.config({paths:{vs:BASE}});
  return new Promise((resolve,reject)=>{
   try{amd(['vs/editor/editor.main'],()=>{
    if(!root.monaco)reject(Error('Monaco本体が読み込めません'));
    else{monaco=root.monaco;installCompletions(monaco);resolve(monaco);}
   },reject);}catch(err){reject(err);}
  });
 }).catch(err=>{loaderPromise=null;throw err;});
 return loaderPromise;
}
function installCompletions(m){
 if(registered)return;
 registered=true;
 m.languages.registerCompletionItemProvider('python',{
  triggerCharacters:['.','('],
  provideCompletionItems:function(model,position){
   // Python is highlighted by Monaco, but only the game's API is executable.
   if(!model.uri.toString().includes('chaos-relic-card'))return {suggestions:[]};
   const prefix=model.getLineContent(position.lineNumber).slice(0,position.column-1);
   const word=model.getWordUntilPosition(position);
   const range={startLineNumber:position.lineNumber,endLineNumber:position.lineNumber,startColumn:word.startColumn,endColumn:word.endColumn};
   const match=prefix.match(/\b(card|self|target|item)\.([a-zA-Z_]*)$/);
   const nested=prefix.match(/\b((?:self|target)\.hand\[\d+\]|players\[\d+\])\.([a-zA-Z_]*)$/);
   const loopVariable=prefix.match(/\b([a-zA-Z_][a-zA-Z_0-9]*)\.([a-zA-Z_]*)$/);
   const items=[];
   const add=(label,kind,insert,documentation,detail)=>{
    items.push({label,kind,insertText:insert,documentation,detail:detail||'CHAOS RELIC API',range,sortText:'0'+label});
   };
   if(match||nested||(loopVariable&&new RegExp('\\bfor\\s+'+loopVariable[1]+'\\s+in\\s+(?:self|target)\\.hand\\s*:').test(model.getValue()))){
    const obj=(match||nested||loopVariable)[1];
    const isSetting=obj==='card'&&/^card\.\w*$/.test(prefix);
    const dict=obj==='card'?cardFields:obj==='item'||nested?.[1].includes('.hand[')||(!match&&!nested)?handFields:playerFields;
    for(const [field,val]of Object.entries(dict)){
     const info=Array.isArray(val)?val[1]:val;
     const sample=Array.isArray(val)?val[0]:'';
     add(field,m.languages.CompletionItemKind.Property,isSetting?field+' = '+sample:field,info,obj+'.'+field);
    }
    return{suggestions:items};
   }
   for(const name of [...(root.PyCards?.reads||[]),...(root.PyCards?.effects||[])]){
    if(!Object.hasOwn(docs,name))continue;
    const [params,description]=docs[name];
    add(name,m.languages.CompletionItemKind.Function,name+'('+params+')',description,'ゲーム関数');
   }
   for(const [key,[sample,description]] of Object.entries(events)){
    add('def on_'+key+'()',m.languages.CompletionItemKind.Snippet,
      'def on_'+key+'():\n    '+sample,description,'イベント関数');
   }
   for(const field of Object.keys(cardFields)){
    add('card.'+field,m.languages.CompletionItemKind.Property,
      'card.'+field+' = '+cardFields[field][0],cardFields[field][1],'カード設定');
   }
   for(const [label,insert,description] of [
    ['🎬 オリジナルポップ','popup("天罰！", "残りHP {target.hp} / ボーナス {bonus}", "⚡", "danger")','変数の値を埋め込んだ全員共通のアニメーションを表示'],
    ['🪙 Goldプレゼント','resource("self", "gold", 1000)','Goldを増やす'],
    ['🛡 防御札を引く','draw_type("self", "defense", 3)','防御カードをまとめて引く'],
    ['📜 戦闘ログ','battle_log("獲得したGold: {self.gold}")','好きな戦闘ログを流す']
   ])add(label,m.languages.CompletionItemKind.Snippet,insert,description,'ゲーム用テンプレート');
   for(const [label,insert,description]of [
    ['for item in target.hand','for item in target.hand:\n    if item.type == "defense":\n        boost_attack(item.power)','対象の手札を走査'],
    ['for item in self.hand','for item in self.hand:\n    if item.type == "attack":\n        boost_attack(item.power)','自分の手札を走査'],
    ['if target.hp','if target.hp > 1:\n    damage("target", target.hp - 1)','条件分岐']]){
    add(label,m.languages.CompletionItemKind.Snippet,insert,description,'コード例');
   }
   return{suggestions:items};
  }
 });
}
function updateMarkers(){
 if(!editor||!monaco||!root.PyCards)return;
 const model=editor.getModel();if(!model)return;
 const code=model.getValue();
 if(!code.trim()){monaco.editor.setModelMarkers(model,'chaos-card',[]);return;}
 try{
  root.PyCards.compile(code);
  monaco.editor.setModelMarkers(model,'chaos-card',[]);
 }catch(err){
  const message=String(err.message||err);
  const lineMatch=message.match(/行\s*(\d+)/),line=Math.max(1,Math.min(model.getLineCount(),Number(lineMatch?.[1])||1));
  monaco.editor.setModelMarkers(model,'chaos-card',[{
   startLineNumber:line,startColumn:1,endLineNumber:line,
   endColumn:model.getLineMaxColumn(line),message,severity:monaco.MarkerSeverity.Error,
   source:'CHAOS RELIC Python'
  }]);
 }
}
function sync(value){
 if(textarea)textarea.value=value;
 if(onChange)onChange(value);
 root.clearTimeout(diagnosticTimer);
 diagnosticTimer=root.setTimeout(updateMarkers,350);
}
function dispose(){
 generation++;loading=false;
 root.clearTimeout(diagnosticTimer);
 if(editor){
  const val=editor.getValue();
  if(textarea)textarea.value=val;
  changeSubscription?.dispose();
  const model=editor.getModel();
  editor.dispose();model?.dispose();
  editor=null;changeSubscription=null;
 }
 if(host){host.style.display='none';host.closest('.code-region')?.classList.remove('monaco-active');}
 if(textarea)textarea.hidden=false;
 host=null;textarea=null;onChange=null;onStatus=null;
}
function mount(options){
 if(forceFallback)return Promise.resolve(false);
 if(loading||editor)return Promise.resolve(true);
 const el=root.document.getElementById(options.hostId),fallback=root.document.getElementById(options.textareaId);
 if(!el||!fallback)return Promise.resolve(false);
 host=el;textarea=fallback;onChange=options.onChange;onStatus=options.onStatus;
 const token=++generation;loading=true;notify('Monaco Editorを読み込み中…');
 return load().then(m=>{
  if(token!==generation||!el.isConnected||!fallback.isConnected)return false;
  const value=fallback.value;
  const uri=m.Uri.parse('inmemory://model/chaos-relic-card-'+token+'.py');
  const model=m.editor.createModel(value,'python',uri);
  editor=m.editor.create(el,{
   model,theme:'vs-dark',fontSize:13,lineHeight:22,
   fontFamily:"ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
   minimap:{enabled:false},lineNumbers:'on',glyphMargin:false,
   automaticLayout:true,tabSize:4,insertSpaces:true,
   suggestOnTriggerCharacters:true,quickSuggestions:{other:true,comments:false,strings:false},
   wordBasedSuggestions:'off',tabCompletion:'on',parameterHints:{enabled:true},
   scrollBeyondLastLine:false,formatOnType:false,
   suggest:{showWords:false,preview:true},
   padding:{top:12,bottom:16},renderLineHighlight:'line',
   ariaLabel:'CHAOS RELIC Pythonカードエディター'
  });
  changeSubscription=editor.onDidChangeModelContent(()=>sync(editor.getValue()));
  el.style.display='block';el.closest('.code-region')?.classList.add('monaco-active');
  fallback.hidden=true;notify('Monaco Editor｜補完 Ctrl+Space（スマホは候補をタップ）');
  root.requestAnimationFrame?.(()=>editor?.layout());
  updateMarkers();return true;
 }).catch(err=>{
  if(token!==generation)return false;
  notify('Monacoを読み込めません。簡易エディターで入力できます');
  if(root.console?.warn)root.console.warn('[CHAOS RELIC Monaco]',err);
  return false;
 }).finally(()=>{if(token===generation)loading=false;});
}
function getValue(){return editor?editor.getValue():textarea?.value??'';}
function setValue(value){
 const text=String(value??'');
 if(editor){if(editor.getValue()!==text)editor.setValue(text);}
 else{if(textarea)textarea.value=text;sync(text);}
}
function insert(text){
 const source=String(text);
 if(editor){
  const selection=editor.getSelection();
  editor.executeEdits('card-toolbar',[{range:selection,text:source,forceMoveMarkers:true}]);
  editor.focus();return;
 }
 const area=textarea||root.document.getElementById('code-input');
 if(!area)return;
 area.focus();area.setRangeText(source,area.selectionStart,area.selectionEnd,'end');
 area.dispatchEvent(new Event('input',{bubbles:true}));
}
function fallback(){
 forceFallback=true;const val=getValue();dispose();
 const area=root.document.getElementById('code-input');if(area)area.value=val;
 const status=root.document.getElementById('code-editor-status');
 if(status)status.textContent='軽量入力モード（Monacoは再読み込みで復帰）';
 area?.focus();
}
root.ForgeMonaco={mount,getValue,setValue,insert,dispose,fallback,
 isMounted:()=>!!editor,isLoading:()=>loading,layout:()=>editor?.layout()};
})(typeof window!=='undefined'?window:globalThis);
