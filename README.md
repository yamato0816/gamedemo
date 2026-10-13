# CHAOS RELIC P2P / カオスレリック

## Firebase Realtime Database 通信（大学Wi-Fi向け）

Firebaseを使った第3の通信方式を追加しました。**手順は [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) を参照**してください。Firebase Sparkプロジェクトを作成して、匿名認証を有効にし、[firebase.database.rules.json](./firebase.database.rules.json) を適用します。サイト全体で同じ設定を使うなら [firebase-config.js](./firebase-config.js) にブラウザ用Firebase構成を書き込めば、友達は招待リンクだけで接続できます。P2Pと既存のWebSocket中継も引き続き選択できます。

本番Firebaseはアカウントの初期設定後に有効になります。**コードのpushは完了していてもFirebaseプロジェクトの作成・ルール公開は未実施**です。


友達と **2〜8人** で遊べる、無料の短時間オンラインカードバトルです。ゴッドフィールドの「ランダムな手札で攻防する」遊びに着想を得ていますが、**画像・カードイラスト・名称・素材は独自のもの**です。

## 今回の変更点

- **WebRTC DataChannel（PeerJS 1.5.5）**でブラウザ同士が直接通信。GASポーリングは撤廃。
- **GitHub Pages / Cloudflare Pagesなどの静的サイト**としてデプロイ可能。Node.jsや常設ゲームサーバーは不要です。
- 各部屋のホストがゲーム判定を管理し、他のプレイヤーにはそのプレイヤー自身の手札だけ配信します。
- 最大8人、CPU対戦、武器3枚重ね、攻撃・防御・奇跡・道具・コイン・MP・HP・手札補充。
- **状態異常**: 毒、炎上、凍結、呪い、弱体化。
- **守護神**: 不死鳥、玄武、妖精、雷神、月の女神。
- **超常現象**: 流星雨、祝福、深い霧、静寂、魔力の雨、地鳴り、資源逆転。
- **カード工房**: コードの色分け、行番号、テンプレート、リアルタイムプレビュー、構文チェック、自作カード保存と部屋への公開。
- **Python風スクリプト**: `def on_hit():` / 変数 / 四則演算 / `if`・`elif`・`else` / 比較 / `and`・`or`・`not` / 条件付き効果 / 実ダメージ取得。
- PCの盤面一覧とスマホの横スクロール手札に対応。

## GitHub Pagesに公開する（無料）

事前準備: GitHubアカウント。

1. GitHubで新しい**公開リポジトリ**を作ります（例: `chaos-relic-p2p`）。GitHub FreeでPagesを使う場合、通常は公開リポジトリが必要です。
2. ZIPを展開し、次の7個のファイルを**リポジトリの直下**へアップロードしてコミットします。
   - `index.html`
   - `style.css`
   - `app.js`
   - `engine.js`
   - `network.js`
   - `pycards.js`
   - `.nojekyll`（空ファイル）
3. GitHubリポジトリの **Settings → Pages** を開き、**Build and deployment → Deploy from a branch** を選択します。
4. ブランチは `main`、フォルダーは `/ (root)` にし、**Save** を押します。
5. GitHub Pagesへの反映を待ち、提示された `https://<ユーザー名>.github.io/<リポジトリ名>/` を開きます。
6. 部屋を作成すると7文字の部屋コードが表示されます。「招待リンクをコピー」を友達に送るか、部屋コードを知らせてください。
7. 友達が参加したらホストが「対戦開始」を押します。

**ホスト側はブラウザタブを開き続けてください。** ホストが閉じると部屋が消えます。サイトは常時アクセスできますが、ゲームルームは常駐しません。

静的ファイルはCloudflare Pagesなどにも置けます。常設NodeサーバーやGASは不要です。

### ローカルで試す

Pythonがある場合、このフォルダーで次を実行します。

```bash
python -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。PCとスマホの通信をインターネット経由で行うには、GitHub Pagesなどに公開するのが簡単です。`file://` の直接起動は一部ブラウザ機能が制限されるため推奨しません。

## カード工房でPython風スクリプトを書く

**例：攻撃で相手に与えた実ダメージの半分を回復**

```python
def on_hit():
    dealt = damage_dealt()
    recovery = min(8, dealt // 2)
    if recovery > 0:
        heal("self", recovery)
```

**例：HPが少ないときだけ守護神を呼ぶ**

```python
def on_play():
    if my_hp() < 20:
        summon("self", "phoenix", 3)
    else:
        shield("self", 6)
```

**例：防御時に受けたダメージに応じて反撃**

```python
def on_defend():
    received = damage_taken()
    if received > 0:
        damage("target", min(10, received))

def on_block():
    heal("self", 3)
```

`on_play` はカード使用時、`on_hit` は防御処理後にダメージが当たったとき、`on_defend` は防御カード使用時、`on_block` は完全防御時、`on_turn_start` は守護神の効果が続く間の自ターン開始時に実行されます。

### 値を読む関数

| 関数 | 戻り値 |
|---|---|
| `damage_dealt()` | 直前の攻撃が対象に与えた実ダメージ（防御・バリア・守護神による軽減後） |
| `damage_taken()` | 直前の防御で自身が受けた実ダメージ |
| `my_hp()` / `target_hp()` | 自分・相手のHP |
| `my_mp()` / `target_mp()` | 自分・相手のMP |
| `my_gold()` / `target_gold()` | 自分・相手のコイン |
| `round_number()` | 現在のラウンド数 |
| `has_status("target","poison")` | 毒などの状態異常があるかどうか |
| `chance(0.5)` | 50%の確率で `True` |
| `randint(1,6)` | 1〜6の乱数（上下限はそれぞれ−30〜30） |
| `min` / `max` / `abs` / `round` / `int` | 基本的な数値関数 |

### 効果を起こす関数

| 関数 | 効果 |
|---|---|
| `damage("target", n)` | nダメージ |
| `heal("self", n)` | n回復 |
| `status("target", "poison", 3)` | 状態異常を3ターン付与 |
| `shield("self", 8)` | バリアを追加 |
| `resource("self", "mp", 3)` | MPを増やす（負数も可） |
| `draw("self", 2)` | 山札から補充 |
| `cleanse("self")` | 状態異常を消す |
| `summon("self", "phoenix", 3)` | 守護神を召喚 |
| `phenomenon("meteor")` | 超常現象を発生 |
| `steal("gold", 5)` | 相手からコインを奪う |

対象は `self`、`target`、`everyone`、`all_enemies`、`random_enemy`。状態異常は `poison`, `burn`, `freeze`, `curse`, `weak`。守護神は `phoenix`, `turtle`, `sprite`, `storm`, `muse`。

### 対応するPython構文と制限

**通常のPythonを実行しているわけではありません。** `pycards.js` は対応するPython構文だけをパースし、安全な命令として実行します。ブラウザや相手のPCで任意コードを走らせません。

対応: `def on_...():`、変数代入、`+=` `-=`、括弧と数値計算 `+ - * / // % **`、文字列、比較演算、`if / elif / else`、論理演算、上記の関数。イベントごとに変数は初期化されます。

非対応: `import`、任意の自作関数、`for` / `while`、オブジェクト属性・ファイル・ネットワーク操作、無制限のプログラム。3500文字、95行、180構文ノード、1回20効果などの上限があります。1効果の数値は最大20、ダメージ・HPなどはゲーム上の上限も適用されます。

**手順**: ヘッダーの「カード工房」→ カードの種類・威力などを入力 → `card_effect.py`へコードを書く →「構文チェック」→「マイカードに保存」→ 部屋の待機室で「追加」。試合途中の追加はできません。カードは自分のブラウザの `localStorage` に保存されるため、ブラウザデータを消すとカードも消えます。

## P2Pの仕組み・制限

- GitHub Pagesが配信するのは **HTML/CSS/JavaScriptだけ** です。通信を始めるときにPeerJSの無料公開シグナリングサービスを使います。
- 接続が成立した後、ゲームデータはWebRTC DataChannelで送受信します。GASの約3秒ごとのポーリングは使いません。ゲームデータが直接届くまでの速度は接続品質に左右され、実際の遅延時間を保証するものではありません。
- **TURNリレーは設定していません**。モバイル回線・学校のファイアウォール・対称NATなど、直接通信できない環境では接続に失敗します。無料シグナリングサービスの稼働状況にも依存します。
- ホストがゲームの正しい状態、乱数、相手の手札を保持する**ホスト権威方式**です。ホストを信用する仲間内のゲーム向けで、ホストが改造すれば不正可能です。
- ホストがページを閉じると部屋は終了。ホスト移譲・対戦の永続化・切断後の再参加は今回未実装です。タブをリロードしただけでも部屋から切断されるので注意してください。
- 相手の画面には自分の手札は通常送られません。ただしホストのブラウザには全員の手札が保持されています。
- ルームは招待コードでのみ参加可能。公開サービスとして不特定多数に提供する場合は、追加の認証・荒らし対策が必要です。

## テスト

```bash
node tests/engine.test.js
node tests/p2p.test.js
python tests/browser_test.py
```

対戦ルール、Python構文、安全性、P2P接続の模擬試験、デスクトップ・スマホのUI自動テストを実施済みです。ただし、模擬PeerJS通信とモックブラウザ環境での検証であり、**実際のPeerJS Cloud・二つの外部ネットワーク間のWebRTC接続テストは未実施**です。公開後、友達と別回線でテストしてください。

## ファイル

- `index.html`：トップページ
- `style.css`：レスポンシブUI
- `app.js`：画面・カード工房
- `pycards.js`：安全なPython風スクリプトの解析・実行
- `engine.js`：ゲームルール、HP・状態異常・守護神・勝利判定
- `network.js`：PeerJS WebRTC、部屋・参加・ゲーム同期
- `tests/`：エンジン・WebRTCモック・ブラウザ自動テスト

開発用の画像・コード・テストは製作者向けです。ゲーム公開に必要なのは冒頭の7ファイルだけです。


## 2026-10-13: カオス/インフレアップデート

基本札を51種類から67種類へ拡張しました。等倍反射、2倍反射、身代わり転送、分散、完全無効、MP吸収、追撃、連鎖、HP交換、全体毒、MP強奪、全員の手札引き直しを追加しました。

- **カード工房：フォームだけで作成** — 「🧩 入力だけでカード作成」を押すとPythonコードが空欄になり、基本効果のプルダウンだけでカードを保存できます。
- **カード工房：Pythonコードでも作成** — 「🐍 コードで追加効果」を押し、フォーム設定に任意の `def on_play()` などを追加して保存できます。
- 自作カードの威力と消費MPにはゲームバランス目的の固定上限を設けません。ただしJavaScriptで有限数として扱えること、CPU安全制限、HP/MP/所持金などのゲーム上限は別です。極端な威力での実ダメージはHP残量が限界です。
- 反射・転送は防御カード使用時の特殊処理です。自動無限反射にならないよう、転送先に新しい防御ターンを発生させずダメージだけを与えます。

## 大学・学校Wi-FiでP2Pが使えない場合（無料のWebSocket中継）

WebRTCを禁止する学内ネットワークやファイアウォールでは、通常のPeerJS P2P通信は成立しないことがあります。WebRTCではなく **wss:// (443ポート)** で通信する中継方式を実装しました。

Cloudflare Workers + SQLite-backed Durable Objectsの無料枠で実行できます。**このGitHubリポジトリにあるのはソースコードです。CloudflareのWorker自体は自動デプロイされていません。** Cloudflareアカウントから1回デプロイしてください。

1. Cloudflareアカウントにログインし、このGitHubリポジトリをPCへcloneします。
2. ターミナルで `cd relay-worker` を実行。
3. `npx wrangler login` を実行してCloudflareへのアクセスを許可。
4. `npx wrangler deploy` を実行。初回はWorkerとSQLite-backed Durable Objectが作成されます。
5. 表示される `https://chaos-relic-relay.<サブドメイン>.workers.dev` の **https://をwss://にしたURL** を控えます。
6. GitHub Pages版のゲームを開き、ヘッダーの「📡 通信」を押し、WSS中継URLを入力して保存（ページは再読み込みされます）。
7. 友達にも同じWSS中継URLを登録してもらい、通常通り部屋コードで参加します。

**注意事項**

- このモードはWebRTCを使いませんが、ネットワーク側でWebSocket自体が禁止されていれば接続できません。
- 各部屋のホストがブラウザを閉じると部屋も終了します。CloudflareはWebSocketメッセージを各参加者へ中継するだけで、対戦の審判はホストのブラウザ側です。
- 自作カードによる不正や荒らしを防ぐ必要がある場合は、認証・レート制限・セキュリティルールを追加してください。身内の非公開ルームを想定しています。
- Cloudflare無料枠には利用量の制限があり、将来的なサービス条件の変更にも影響されます。
- 中継方式を使わないときは「📡 通信」→「P2Pに戻す」で解除してください。
- [Cloudflare Durable Objectsガイド](https://developers.cloudflare.com/durable-objects/get-started/) / [WebSocketガイド](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)

中継ルーティングのローカル模擬テスト：`node tests/relay-worker.test.mjs`。



## 2026-10-13：防御インフレ＆盾狩りアップデート

- **防御札は最大18枚まで同時選択できます**（持ち札の上限）。すべての防御札の威力が合計されます。複数の反射カードを重ねたときは反射もそれぞれ発動します。攻撃札を重ねる上限は従来どおり3枚です。
- 新しい公式攻撃「盾狩りの矢」「防具喰らいの竜」「守護への課税」は、**相手が現在持つ防御札の枚数 × カードの威力**が攻撃力になります。自分の盾が多いと相手の盾狩りにも弱くなるため、使いどころが重要です。
- スマホのカードアイコン左上には、⚔（攻撃）、🛡（防御）、✦（奇跡）、🧪（道具）、👼（守護神）、☄（超常現象）の種別バッジを常時表示します。
- 自作カードのフォーム「攻撃」→「基本効果」から **防御札の枚数×威力** を選べます。コードでも再現できます。

### 相手の防御札の数で攻撃を増幅する

\`\`\`python
def on_play():
    shields = target_defense_cards()
    boost_attack(shields * 9)
\`\`\`

\`target_defense_cards()\` は狙った相手の防御札所持枚数、\`my_defense_cards()\` は自分の防御札所持枚数を返します。\`boost_attack(n)\` は直前に使用した攻撃の「防御前の威力」に n を追加し、相手は防御札で軽減できます（直接HPを減らす関数ではありません）。

### 自作防御札でさらに防御を積み増す

\`\`\`python
def on_guard():
    danger = incoming_damage()
    boost_defense(danger // 2 + my_defense_cards() * 5)
\`\`\`

\`on_guard()\` は通常の防御値を計算する前、選んだ防御カードごとに発動します。\`incoming_damage()\` で相手から来る攻撃の威力を読めます。\`boost_defense(n)\` は防御値を n だけ加算します（防御タイミングでのみ有効です）。

**安全性:** スクリプトはPythonの制限されたサブセットだけを実行します。外部コードは実行しません。数値が大きくてもゲーム中のループ回数には安全制限があります。

変更のテスト: \`node tests/guard-hunt.test.js\`（多重防御、18枚使用、重ね反射、相手の防御札カウント、自作カードの攻防威力追加）。
