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
