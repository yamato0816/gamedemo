/* node tests/multiline-casino.test.js
 * Regression for CRフィーバー777 and Python-style multiline argument parsing.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dice=[];
const math=Object.create(Math);
math.random=()=>dice.length?dice.shift():.4;
let uid=0;
const ctx={Math:math,console,crypto:{randomUUID:()=>String(++uid).padStart(8,'0')+'-0000-4000-9000-000000000000'}};
vm.createContext(ctx);
for(const filename of ['pycards.js','engine.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),ctx,{filename});
const {PyCards:P,GameEngine:E}=ctx;
const fullCard=String.raw`
card.name = "CRフィーバー777"
card.description = "図柄を3つそろえろ！ 777なら超大当たり。ハズレは自分がダメージを受ける。"
card.type = "item"
card.emoji = "🎰"
card.element = "lightning"
card.power = 0
card.cost = 7
card.resource = "gold"
card.effect = "normal"
card.weight = 1

def on_play():
    a = randint(0, 9)
    b = randint(0, 9)
    c = randint(0, 9)

    popup(
        "図柄変動開始！",
        "第1停止：【{a}】 ？？",
        "🎰",
        "info"
    )

    popup(
        "第2停止！",
        "【{a}】【{b}】 ？",
        "⚡",
        "magic"
    )

    if a == b:
        popup(
            "リーチ！！",
            "【{a}】【{b}】 あと1つ…！",
            "🔥",
            "danger"
        )

    popup(
        "最終停止！",
        "【{a}】【{b}】【{c}】",
        "🎰",
        "magic"
    )

    if a == 7 and b == 7 and c == 7:
        popup(
            "💥 777 超・大当たり 💥",
            "敵全員に777777ダメージ！ +77777 Gold！",
            "👑",
            "gold"
        )
        damage("all_enemies", 777777)
        resource("self", "gold", 77777)

    elif a == b and b == c:
        popup(
            "✨ 大当たり！ ✨",
            "ゾロ目 {a}{b}{c}！ 全敵77ダメージ +777 Gold！",
            "💎",
            "gold"
        )
        damage("all_enemies", 77)
        resource("self", "gold", 777)

    elif a == b:
        if chance(0.33):
            popup(
                "🌈 復活大当たり！",
                "全敵30ダメージ +77 Gold！",
                "🌈",
                "success"
            )
            damage("all_enemies", 30)
            resource("self", "gold", 77)
        else:
            popup(
                "リーチ失敗…",
                "代償としてHPが15減少！",
                "💀",
                "danger"
            )
            damage("self", 15)

    elif a == 7 or b == 7 or c == 7:
        popup(
            "惜しい！ 単発ボーナス",
            "7が1つ出現！ +7 MP",
            "⭐",
            "info"
        )
        resource("self", "mp", 7)

    else:
        popup(
            "ハズレ…",
            "自分に15ダメージ！ また回す？",
            "💀",
            "danger",
        )
        damage("self", 15)
`;
const compiled=P.compile(fullCard);
assert.equal(compiled.meta.name,'CRフィーバー777');
assert.ok(compiled.handlers.play.length>=5);
assert.equal(E.card({script:fullCard},'maker').cost,7);
assert.equal(P.compile('def on_play():\n    popup("single", "line",)').handlers.play.length,1);
assert.equal(P.compile(
  'def on_play():\n    a = max(\n        1,\n        min(\n            randint(4, 8),\n            6,\n        ),\n    )\n    heal("self", a)'
).handlers.play.length,2,'nested multiline expressions should compile');
assert.equal(P.compile('def on_play():\n    popup(\n        "literal ) and #",  # comment\n        "(inside quotes)",\n    )').handlers.play.length,1);
assert.throws(()=>P.compile('def on_play():\n    popup(\n        "missing",\n        "bracket"'),/行 2: 括弧が閉じられていません/);
assert.throws(()=>P.compile('def on_play():\n    popup(\n        "bad",\n        "mismatch"]\n    )'),/括弧の対応/);
assert.throws(()=>P.compile('def on_play():\n    popup(\n    "bad indentation"\n    )'),/行 3: 複数行/);
assert.throws(()=>P.compile('def on_play():\n    import("unsafe")'),/許可されていない関数/);
function play(random,expected){
 const r=E.create('SLOT777','host','ホスト');
 E.join(r,'guest','ゲスト');
 E.apply(r,'host',{type:'start'});
 const a=r.players[r.turnIndex],b=r.players.find(p=>p.id!==a.id);
 a.hand=[{...E.card({script:fullCard},'tester'),uid:'CASINO'}];
 a.gold=1000;a.hp=100;a.mp=100;
 b.gold=1000;b.hp=100;b.shield=0;
 // The room setup draws randomly; only the card activation rolls matter.
 dice.splice(0,dice.length,...random);
 E.apply(r,a.id,{type:'use',card:'CASINO',target:b.id});
 const titles=r.customPopups.map(p=>p.title);
 assert.equal(r.scriptFeedback?.ok,true,'runtime must succeed on '+expected.name+': '+JSON.stringify(r.scriptFeedback));
 assert.equal(dice.length,0,'only expected random rolls should be consumed');
 assert.ok(r.customPopups.length<=6);
 assert.ok(r.customPopups[0].detail.includes('第1停止：【'+Math.floor(random[0]*10)+'】'));
 assert.equal(a.gold,expected.gold,'Gold on '+expected.name);
 assert.equal(a.hp,expected.hp,'HP on '+expected.name);
 if(expected.otherHp!==undefined)assert.equal(b.hp,expected.otherHp,'enemy HP on '+expected.name);
 assert.ok(titles.some(s=>s.includes(expected.popup)),'result popup missing for '+expected.name);
 const otherView=E.view(r,b.id);
 assert.deepEqual(otherView.customPopups,r.customPopups,'all users receive the same synchronized popup data');
}
play([.7,.7,.7],{name:'777 jackpot',gold:1000-7+77777,hp:100,otherHp:0,popup:'777 超'});
play([.5,.5,.5],{name:'555 jackpot',gold:1000-7+777,hp:100,otherHp:23,popup:'大当たり'});
play([.3,.3,.4,.2],{name:'reach revival',gold:1000-7+77,hp:100,otherHp:70,popup:'復活大当たり'});
play([.3,.3,.4,.8],{name:'reach failure',gold:1000-7,hp:85,otherHp:100,popup:'リーチ失敗'});
play([.7,.1,.2],{name:'single 7',gold:1000-7,hp:100,otherHp:100,popup:'単発ボーナス'});
play([.1,.2,.3],{name:'miss',gold:1000-7,hp:85,otherHp:100,popup:'ハズレ'});
console.log('PASS multiline syntax, nested/trailing commas, bracket diagnostics and all six CRフィーバー777 outcomes');
