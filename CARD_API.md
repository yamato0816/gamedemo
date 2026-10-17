# CHAOS RELIC カード工房 v3 — Python風コード / JSON 仕様書

ゲームの「カード工房」では**フォームで作る**ことも、**コードだけでカード設定まで完結させる**こともできます。保存したカードはロビーで公開すると次の試合から登場します。

## コードだけで定義する完全な例

```python
card.name = "裁定の大剣"
card.description = "相手の盾すべての威力を吸収して攻撃に上乗せします。"
card.type = "attack"
card.emoji = "⚔️"
card.power = 100
card.cost = 7
card.resource = "mp"
card.effect = "normal"
card.element = "dark"
card.weight = 3

def on_play():
    bonus = 0
    for item in target.hand:
        if item.type == "defense":
            bonus += item.power
    boost_attack(bonus)

def on_hit():
    heal("self", damage_dealt() // 2)
```

先頭の `card.FIELD = リテラル` は**カード定義**、`def on_...():` は**効果発動処理**です。設定値には文字列、非負整数を使ってください。変数による計算は発動処理内で行います。

## カード設定キー（JSON / card.プロパティ）

| キー | 型 | 意味・指定例 |
|---|---|---|
| `name` | string | 名前（最大64文字）。`card.name = "大剣"` |
| `description` | string | 長い説明（最大8000文字）。`card.description = "攻撃に盾の力を加える"` |
| `type` | enum | `attack` 攻撃、`defense` 防御、`magic` 奇跡、`item` 道具、`guardian` 守護神、`omen` 超常現象 |
| `emoji` | string | アイコン（最大16文字）。`card.emoji = "⚔️"` |
| `power` | integer | 基本威力／回復値。0〜JavaScript安全整数まで。ゲームバランス上の上限なし |
| `cost` | integer | MPまたはお金の消費。0〜JavaScript安全整数まで |
| `resource` | enum | `mp` または `gold`。どちらで支払うか |
| `effect` | enum | 基本効果。攻撃例：`normal`, `poison`, `guard_hunt`, `drain`。防御例：`reflect_full`, `reflect_double`, `counter` |
| `element` | enum | `none`, `fire`, `water`, `forest`, `lightning`, `dark` |
| `weight` | integer | 山札内の出やすさの重み（1以上、大きいほど高い確率） |
| `script` | string | Python風の効果コード（最大30000文字） |
| `program` | generated | コンパイル済み構文木。ゲーム側が自動生成。手で書く必要はありません |
| `id`, `owner`, `author`, `uid` | generated | エンジン側が割り当てる識別情報 |

通常のJSONカード形式例：

```json
{
  "name": "巨大な鏡",
  "description": "反射の威力を2倍にする防御札",
  "type": "defense",
  "emoji": "🪞",
  "effect": "reflect_double",
  "power": 0,
  "cost": 0,
  "resource": "mp",
  "element": "water",
  "weight": 2,
  "script": "def on_guard():\n    boost_defense(incoming_damage())"
}
```

**保存時の優先順位**： **「🧩 入力で作成」タブではフォームの値だけが反映**され、別タブに残っているコード（`card.*` や効果関数）は保存に使用しません。**「🐍 コードで作成」タブではコードの `card.*` 定義が優先**されます。表示中のタブで保存方式を決めます。

## Python風コードの読み取り専用オブジェクト

| オブジェクト | 参照例 | 意味 |
|---|---|---|
| `self` | `self.hp`, `self.mp`, `self.gold`, `self.shield` | 自分の現在値 |
| `target` | `target.hp`, `target.hand` | 効果の対象となった相手 |
| `card` | `card.name`, `card.type`, `card.power`, `card.cost`, `card.description` | 発動中のカードの情報 |
| `players` | `len(players)`, `players[0].hp` | 対戦中のプレイヤーの簡易一覧 |
| `self.hand` | `len(self.hand)`, `self.hand[0].type` | 自分の手札 |
| `target.hand` | `target.hand[0].power`, `count_cards(target.hand, "defense")` | **相手の手札。ホスト内での効果計算時だけ**参照 |
| `item` | `item.type`, `item.power`, `item.cost`, `item.effect`, `item.name` | `for item in target.hand` で1枚ずつ参照 |

**セキュリティ:** データ参照はホストブラウザ内部のサンドボックスで処理します。相手の手札全体を通常のFirebase画面配信へ公開するわけではありません。プレイヤーの値を直接 `target.hp = 0` のように変更することはできません。値の変更には後述の効果APIを使用してください。

## 使用できる関数・パラメータ

| 関数 | パラメータ | 返り値 / 内容 |
|---|---|---|
| `len(array)` | 手札やplayersの配列 | アイテム数 |
| `count_cards(array, type)` | 手札配列と `"defense"` 等（省略可） | 特定のカードタイプの枚数 |
| `sum_power(array, type)` | 手札配列とタイプ（省略可） | 指定タイプの威力合計 |
| `card_at(array, i)` | 配列、0から始まる位置 | 対象カード／なければNone |
| `my_hp()`, `target_hp()` | 引数なし | HP |
| `my_mp()`, `target_mp()` | 引数なし | MP |
| `my_gold()`, `target_gold()` | 引数なし | お金 |
| `my_defense_cards()`, `target_defense_cards()` | 引数なし | 防御札枚数 |
| `round_number()` | 引数なし | 現在ラウンド |
| `damage_dealt()`, `damage_taken()` | 引数なし | 実際に与えた／受けたHPダメージ |
| `incoming_damage()` | 引数なし | 今から防ごうとしている攻撃の威力 |
| `has_status(who, status)` | `"self"` または `"target"`; `"poison"`, `"freeze"` 等 | 状態異常の有無 |
| `chance(probability)` | `0.0`〜`1.0` | 確率判定(True/False) |
| `randint(min, max)` | 整数2個 | 範囲内の乱数 |
| `min(...)`, `max(...)`, `abs(x)`, `int(x)`, `round(x)` | 数値 | 算術関数 |
| `damage(who, n)` | 対象とダメージ数 | HPへダメージ |
| `heal(who, n)` | 対象と回復量 | HP回復 |
| `shield(who, n)` | 対象とバリア量 | バリア増加 |
| `status(who, key, turns)` | 対象・状態異常名・継続ターン数 | 状態付与 |
| `resource(who, key, n)` | 対象・`"mp"`または`"gold"`・増減数 | MP/お金の増減 |
| `draw(who, count)` | 対象・枚数 | ドロー（1回の処理は最大64枚） |
| `cleanse(who)` | 対象 | 状態異常解除 |
| `summon(who, kind, turns)` | 対象・守護神名・継続ターン数 | 守護神を召喚 |
| `phenomenon(kind)` | 超常現象名 | 全体現象を発生 |
| `steal(key, amount)` | `"mp"`/`"gold"`と数量 | 対象から自分へ移す |
| `boost_attack(n)` | 攻撃威力の加算量 | 現在発動中の攻撃に威力を加える |
| `boost_defense(n)` | 防御威力の加算量 | 防御前の防御力に加算する |
| `multiply_attack(factor)` | 倍率（例: `3`） | 現在の攻撃威力を乗算 |
| `discard(who, type, n)` | 対象・カードタイプ（`"any"`可）・枚数 | 指定されたプレイヤーの手札を破棄 |
| `swap_hands()` | 引数なし | 自分と対象の手札を丸ごと交換 |


`who` は `"self"`、`"target"`、`"everyone"`、`"all_enemies"`、`"random_enemy"` から選択します。

## 発動タイミング

- `on_play()`: カード使用直後
- `on_hit()`: 攻撃が相手へ命中した後（`damage_dealt()` が読めます）
- `on_guard()`: 防御札の威力計算の直前（`incoming_damage()` が読めます）
- `on_defend()`: 防御の成否にかかわらず防御札の使用後
- `on_block()`: 防御しきったとき
- `on_turn_start()`: **召喚された守護神が生きている間**の手番開始時

自作の手札条件の例：

```python
def on_play():
    total = 0
    for item in target.hand:
        if item.type == "defense":
            total += item.power
    boost_attack(total * 3)
```

## 許可するPython構文と限界

使用できるもの：数値/文字列、変数代入、加減乗除、剰余、累乗、比較、and/or/not、if/elif/else、`for item in target.hand:`、オブジェクトの読み取り `item.type`、配列インデックス `target.hand[0]`。

実際のCPythonや任意のライブラリをホストで直接実行するわけではありません。`import`、`while`、クラス宣言、ファイル/ネットワークアクセス、任意の関数呼び出しは許可していません。ユーザーの安全と対戦の同期を保つためです。

### JSONサイズと処理の現状

| 項目 | 現在の制限 | 理由 |
|---|---:|---|
| カードJSON（ロビー登録） | **128 KiB相当**（JSON文字数131072） | ロビーを悪意のある巨大データから守る |
| 操作メッセージ（P2P/Firebase/中継） | **256 KiB相当**（JSON文字数262144） | 通信過負荷の保護 |
| カード名 | 64文字 | UI上で表示できる範囲 |
| 説明文 | 8000文字 | 辞書/プレビュー |
| Python風スクリプト | 30000文字・600行 | パース時間の保護 |
| 手札配列 `for` 走査 | 最大1024要素 | 無限ループ・処理時間の保護 |
| スクリプト実行 | 最大4000ステップ/効果120個 | ホストブラウザの処理時間の保護 |
| Firebase RTDB SDKの単一書き込み | **16 MiB未満**（公式サービス制限） | ゲーム側から撤廃できない制約 |

これらは**ゲームの威力やHPの上限とは別**の、安全性・通信容量の制限です。Firebaseの仕様上、巨大なJSONを無制限に共有することはできません。上記のカードと操作サイズは開発者がコード中で調整できます。大量の巨大カードを使う場合は回線負荷に注意してください。

## 反射・反撃への防御

反射鏡、針のよろい等の反撃、雷神の反撃は、反撃相手を新しく防御待ちにします。**返ってきた攻撃にも防御札を選べます。** 無限反射を防ぐため、反射の連鎖は6回で停止します。

## より複雑な能力の例

```python
card.name = "次元交換の天罰"
card.description = "相手が防御札を4枚以上持っているとき、すべて破棄してから攻撃を3倍にする。"
card.type = "attack"
card.emoji = "🌀"
card.power = 50
card.cost = 10

def on_play():
    n = count_cards(target.hand, "defense")
    if n >= 4:
        discard("target", "defense", n)
        multiply_attack(3)
```

自作の `on_guard()` / `on_block()` / `on_defend()` からの `damage("target", ...)` も、相手が**防御できる反撃**として送られます。

注意: カードの手札破棄などの直接状態操作は、発動タイミングと順序で結果が変わります。カード工房の「🧪 実行テスト」で確認してください。日本語の説明用JSONはMarkdown形式のこの文書でも参照できます。

## Monaco Editor・フォームからコード生成（2026-10）

- 「コードで作成」タブでは **Monaco Editor 0.52.2** を読み込み、Python構文の色分け・行番号・インデント、ゲーム固有の `card.*` / `target.hand` / `resource` / `steal` / `on_play` などの補完を提供します。補完は **Ctrl+Space** で手動表示もできます。関数候補はゲーム独自の許可リストに基づいています（一般Pythonの全機能ではありません）。
- CDNsがブロックされる環境や一部スマホ向けに**軽量入力モード**を残しています。コードタブ上部の「軽量入力」を押すと切り替わります。
- **「🧩 フォームからコード生成」** はカード名・説明・種類・アイコン・威力・コスト・支払い方法・基本効果・属性・頻度を `card.xxx = ...` として**完全に変換**します。基本効果はエンジンが `card.effect` の指定で実行します。生成時に `def on_play()` で同じ効果を重複実装しません。必要な追加効果だけ追記してください。
- フォームタブでの保存では、別タブのスクリプトを空にしてからバリデーションします。そのため、古い `card.name` や `card.cost` がフォーム側の値を勝手に上書きすることはありません。コードタブではコード優先です。
- 説明文は改行付きでも保存できます。カードの作成途中の入力とコードはブラウザ内で自動保存し、次に開いたときに復元します。

テスト: `node tests/card-forge-modes.test.js`。


## 2026-10-15: 大規模カードAPIアップデート・自由なポップ演出

カード工房の「コードで作成」タブは関数一覧を**説明文込みで検索**できます。Monacoでは関数名や引数を入力するとオートコンプリートが出ます。対象者の手札は `target.hand`、使用中カードは `card`、自分の情報は `self` からも読み取れます。

### 🎬 カスタムポップ（全員に表示）

```python
card.name = "黄金の奇跡"
card.type = "item"
card.effect = "mana"
card.power = 0
card.cost = 0

def on_play():
    shields = hand_count("target", "defense")
    bonus = shields * 100 + 500
    resource("self", "gold", bonus)
    popup("黄金の祝福！", "対象の盾 {shields} 枚 × 100 + 500 = +{bonus} Gold / 今は {self.gold}G", "💰", "gold")
    battle_log("{self.name} は {bonus}G を獲得！")
```

**`popup(title, message, icon, theme, duration_ms)`** は保存されたポップイベントを全員に配信し、アニメーションで見せます。`message` と `title` 内の `{変数名}`、`{self.hp}`、`{target.hand[0].power}`、`{hand_count('target', 'defense')}` のような中身を、そのイベント実行時の値に置き換えます。`{bonus * 2}` のような算術式も利用できます。`{{`/`}}` は文字としての波括弧を表示します。`format("現在 {self.gold}G")` を使うと文章だけを生成できます。

ポップ色は次の9種類です。

| theme | 見た目 | 使用例 |
|---|---|---|
| `"magic"` | 紫の魔法演出 | 奇跡、召喚、異常現象 |
| `"danger"` | 赤の警告演出 | 即死攻撃、反撃 |
| `"success"` | 緑の回復演出 | 回復、護符 |
| `"gold"` | 金色の報酬演出 | Gold・アイテム獲得 |
| `"info"` | 青の情報演出 | 戦況告知、読み取り |
| `"rainbow"` | 虹色に流れるアニメーショングラデーション | 777・プレミア演出 |
| `"aurora"` | 青緑・紫のゆらめくオーロラ | リーチ・特殊変化 |
| `"sunset"` | ピンクから橙への夕焼けアニメーション | 激アツ・発展演出 |
| `"neon"` | ネオンの光彩が動くグラデーション | 図柄変動・予告 |

省略すると `popup("発動！")` でも動作し、デフォルトは魔法色です。アイコン・色はカード作者が指定し、表示文字列はHTMLとして実行されません。巨大な演出や連続スパムを防ぐため、1回のイベントで最大6個、最近の配信履歴は12個までです。実行テスト中はポップの見た目も確認できます。

### 便利な読み取り関数（52種類）

| 関数（例） | 何ができるか |
|---|---|
| `len(array)` | 配列または文字列の長さ |
| `count_cards(target.hand, "defense")` | 指定したカード種類の枚数 |
| `sum_power(target.hand, "attack")` | 指定種類の威力合計 |
| `card_at(target.hand, 0)` | 指定位置のカードを取得 |
| `count_element(target.hand, "fire")` | 特定属性のカード枚数 |
| `count_effect(target.hand, "heal")` | 特定効果のカード枚数 |
| `sum_cost(target.hand, "attack")` | 指定種類のコスト合計 |
| `highest_power(target.hand, "attack")` | 指定種類の最大威力（該当なしなら0） |
| `lowest_power(target.hand, "defense")` | 指定種類の最小威力（該当なしなら0） |
| `random_card(target.hand)` | 手札からランダムなカードを選ぶ |
| `hand_count("target", "defense")` | 対象の防御札の枚数、種類を省略すると全手札 |
| `hand_power("target", "attack")` | 対象手札の威力合計 |
| `hand_cost("target", "magic")` | 対象手札のコスト合計 |
| `alive_count()` | 生存プレイヤーの人数 |
| `enemy_count()` | 生存する敵の人数 |
| `total_hp()` | 生存プレイヤーのHP合計 |
| `total_shield()` | 生存プレイヤーのバリア合計 |
| `status_turns("target", "poison")` | 対象の状態異常残りターン |
| `guardian_turns("self")` | 守護神の残りターン |
| `has_guardian("target", "phoenix")` | 指定守護神がいるか（省略で種類問わず） |
| `is_alive("target")` | 対象が生存しているか |
| `random_enemy()` | 生存中の敵をランダムで取得 |
| `player_at(0)` | 全プレイヤーの指定位置を取得 |
| `turn_player()` | 現在手番のプレイヤーを取得 |
| `is_my_turn()` | 自分のターンか |
| `format("残りHP {target.hp} / 倍率 {bonus}")` | 波括弧内の式を実際の値に置換 |
| `str(target.hp)` | 数値や真偽値を文字列に変換 |
| `floor(value)` | 小数点以下を切り捨て |
| `ceil(value)` | 小数点以下を切り上げ |
| `sqrt(value)` | 平方根 |
| `clamp(value, 0, 100)` | 指定範囲に数値を収める |
| `contains("fire", "ir")` | 文字列や配列に指定値が含まれるか |
| `damage_dealt()` | 与えた実ダメージ |
| `damage_taken()` | 受けた実ダメージ |
| `my_hp()` | 自分のHP |
| `target_hp()` | 対象のHP |
| `my_mp()` | 自分のMP |
| `target_mp()` | 対象のMP |
| `my_gold()` | 自分のGold |
| `target_gold()` | 対象のGold |
| `my_defense_cards()` | 自分の防御札枚数 |
| `target_defense_cards()` | 対象の防御札枚数 |
| `incoming_damage()` | 防御前の攻撃威力 |
| `round_number()` | 現在のラウンド |
| `has_status("target", "poison")` | 状態異常の有無 |
| `randint(1, 6)` | 指定範囲のランダム整数 |
| `chance(0.5)` | 指定確率でTrue |
| `min(a, b)` | 最小値 |
| `max(a, b)` | 最大値 |
| `abs(value)` | 絶対値 |
| `int(value)` | 整数部分 |
| `round(value)` | 四捨五入 |

### ゲーム操作・演出関数（31種類）

| 関数（例） | 何ができるか |
|---|---|
| `damage("target", 100)` | 指定対象にダメージ |
| `heal("self", 100)` | HPを回復 |
| `set_hp("everyone", 1)` | HPを指定値に設定（バリアを通さない） |
| `status("target", "poison", 3)` | 状態異常を付与 |
| `shield("self", 100)` | バリアを追加 |
| `resource("self", "gold", 100)` | MPまたはGoldを増減 |
| `draw("self", 3)` | カードを引く |
| `cleanse("self")` | 状態異常をすべて解除 |
| `summon("self", "phoenix", 3)` | 守護神を召喚 |
| `phenomenon("meteor")` | 超常現象を発生 |
| `steal("mp", 50)` | 相手のMP/Goldを奪う |
| `boost_attack(100)` | 現在の攻撃威力に加算 |
| `boost_defense(100)` | 現在の防御力に加算 |
| `discard("target", "defense", 2)` | 指定種類のカードを破棄 |
| `swap_hands()` | 対象と手札を丸ごと交換 |
| `multiply_attack(3)` | 現在の攻撃威力を指定倍率に |
| `set_resource("self", "mp", 500)` | MPまたはGoldを指定値に設定 |
| `set_shield("self", 100)` | バリアを指定値に設定 |
| `set_status("target", "poison", 1)` | 残りターンを指定値に設定 |
| `remove_status("target", "poison")` | 指定した状態異常だけ解除 |
| `heal_percent("self", 50)` | 現在HPの指定パーセントを回復 |
| `draw_type("self", "defense", 3)` | 指定種類のカードを引く |
| `duplicate("self", "attack", 2)` | 対象の手札にある指定種類のカードを複製 |
| `clear_hand("target")` | 対象の手札を全部破棄 |
| `give("target", "gold", 100)` | 自分のGold/MPを対象へ渡す |
| `swap_stat("hp")` | 自分と対象のHP/MP/Gold/バリアを交換 |
| `shuffle_hand("self")` | 手札の順番をシャッフル |
| `popup("天罰発動！", "HP {target.hp} / 倍率 {bonus}", "⚡", "danger", 1400)` | 1つのカスタムポップを表示。5番目の引数は表示時間ms |
| `popup_update("🌈 大当たり！", "図柄 {a}{b}{c}", "🌈", "rainbow", 2400)` | 直前のポップを閉じずに、タイトル・本文・絵文字・色を切り替える |
| `popup_wait(650)` | 現在のポップの表示時間を650ms延長 |
| `battle_log("ボーナス {bonus} を獲得！")` | カスタム戦闘ログを全員へ表示 |

**共通の対象指定**：`"self"` 自分、`"target"` そのカードの対象、`"everyone"` 生存者全員、`"all_enemies"` 自分以外の生存者、`"random_enemy"` 生存している敵からランダムです。

`set_hp()` はバリアを貫通して直接HPを指定値にします。0にした場合は通常の脱落判定を行います。`heal_percent()` は上限HPが存在しないため、**現在HPに対する割合回復**です。`draw_type()` と `duplicate()` は1回64枚までです。`swap_stat()` はカードの `target` と自分の指定ステータスを交換します。`remove_status()` は指定状態だけ解除し、`cleanse()` は全状態を解除します。

**注意**：通常のPythonライブラリ、無限ループ、ファイルや通信アクセスは利用できません。ここに記載したゲーム専用APIだけが実行されます。数値の演算やプレイヤー情報はホスト側で処理されます。フォームで保存する場合はコードの効果は含まれず、コードを発動させる場合は「コードで作成」タブで保存してください。


## 複数行の関数呼び出し（2026-10-17対応）

`popup()` をはじめ、ゲーム専用関数の引数を**括弧の内側で複数行に改行**できます。1つの呼び出し内に入れ子の関数を配置した場合も同様です。最後の引数のあとにカンマを付けることもできます。

```python
card.name = "777ジャックポット"
card.type = "item"
card.cost = 7
card.resource = "gold"
card.effect = "normal"

def on_play():
    number = randint(0, 9)
    popup(
        "図柄停止！",
        "最初の数字は {number} ！",
        "🎰",
        "gold",  # 末尾のカンマは任意
    )
    amount = max(
        0,
        number * 100,
    )
    resource("self", "gold", amount)
```

- **終了する `) `は呼び出し開始行と同じインデント位置でOK**です。引数の行には4スペースなどの字下げを使ってください。
- 引数の途中に改行を入れられるのは `(...)` や `[...]` などの**括弧の内側だけ**です。引用符内の生の改行（複数行文字列）や、括弧なしの行末改行は非対応です。
- `#` から始まるコメントは、従来どおり式の末尾に書けます。
- 引数は最大8個、1つの式は最大40行、スクリプト全体で最大600個の非空行という安全制限を維持しています。
- 開いた括弧が閉じていない場合や、閉じ括弧が余っている場合には該当行のエラーを表示します。
- 回帰テスト: `node tests/multiline-casino.test.js`。実際の「CRフィーバー777」を使い、777大当たり／通常大当たり／リーチ復活／失敗／7の単発／完全ハズレを検証します。



## 🎰 演出BUSY・動的なポップ変更（2026-10-17）

同じポップアップを一度だけ表示して、**文字・計算結果・アイコン・テーマを段階的に書き換え**できます。すべてのステージが終了するまで**他のプレイヤー操作・CPU操作・次のターン・制限時間のカウント**をホスト側で一時停止します。

```python
card.name = "レインボー777"
card.type = "item"
card.emoji = "🎰"
card.effect = "normal"
card.cost = 7
card.resource = "gold"

def on_play():
    a = randint(0, 9)
    b = randint(0, 9)
    c = randint(0, 9)

    popup("図柄変動開始！", "【？】【？】【？】", "🎰", "neon", 850)
    popup_update("第1停止", "【{a}】【？】【？】", "⚡", "sunset", 900)

    if a == b:
        popup_update("激アツリーチ！", "【{a}】【{b}】【？】", "🔥", "aurora", 1400)
        popup_wait(700)
    else:
        popup_update("第2停止", "【{a}】【{b}】【？】", "🎰", "info", 900)

    if a == 7 and b == 7 and c == 7:
        popup_update("🌈 超・大当たり！", "【{a}】【{b}】【{c}】", "👑", "rainbow", 2600)
        damage("all_enemies", 777777)
    elif a == b and b == c:
        popup_update("✨ 大当たり！", "【{a}】【{b}】【{c}】", "💎", "gold", 1800)
        damage("all_enemies", 77)
    else:
        popup_update("残念…", "【{a}】【{b}】【{c}】", "💀", "danger", 1000)
        damage("self", 5)
```

**追加API：** `popup(title, detail, icon="✨", theme="magic", duration_ms=1900)`、`popup_update(title, detail, icon="✨", theme="magic", duration_ms=1300)`、`popup_wait(duration_ms=700)`。末尾の時間は**ミリ秒**で、`popup` および `popup_update` は350〜5000ms、`popup_wait` は0〜3000msです。複数行での引数記述も使用できます。

**安全仕様・通信：**

- `popup_update()` と `popup_wait()` は、同じイベント内で先に `popup()` を呼ぶ必要があります。無効な順序はコード実行エラーとして表示され、永久待機にはなりません。
- 1回のコードイベントで新規ポップは最大6個、1つのポップで最大12ステージ。1回の連続演出によるbusyは**最大24秒**です。
- 時間はホストのゲーム状態に保存されるため、P2P・Firebase・WebSocket中継の各端末が同じ進行停止を共有します。演出終了後は自動解除され、途中でタブを閉じても解除用の手動操作は必要ありません。ホスト離脱による部屋終了の制約は通信方式ごとに従来どおりです。
- `{a}`、`{self.gold}` などの**文字置換は各 `popup_update` 実行時に確定した値**で、後からゲーム状態が変更されても表示済みステージが勝手に変わるわけではありません。
- **カード効果の数値処理自体は発動時に同期的・原子的に実行されます。** その後、表示演出が終わるまで**次のゲーム操作とターン進行**を待たせる設計です。個々の `damage()` までリアルタイムに遅延実行する仕様ではありません。
- アニメーションを減らすOS設定（`prefers-reduced-motion`）に対応。ユーザーの文字はHTMLに変換しません。
- 実行テストもポップの複数ステージを順番に表示します。確認には `node tests/popup-busy-timeline.test.js` と `node tests/popup-stages-ui.test.js` を使用します。

