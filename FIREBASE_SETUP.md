# Firebase 通信の導入手順 — CHAOS RELIC

GitHub Pages 上のゲームに **Firebase Realtime Database** を追加するための設定です。通常の P2P は引き続き利用できます。大学などで WebRTC が使えない場合に、Firebase 経由で通信します。**Firestore ではなく Realtime Database を利用してください。**

## 1. Firebase の無料プロジェクトを作る

1. [Firebase Console](https://console.firebase.google.com/) を開き、プロジェクトを作成。料金プランは **Spark（無料）** を選択。
2. プロジェクト設定 →「マイアプリ」→ **Web アプリ（</>）** を登録。
3. Authentication → Sign-in method → **匿名（Anonymous）** を有効化。
4. Build → **Realtime Database** → データベースを作成。最初のセキュリティ設定はロックモードにし、後述のルールを設定してください。**テストモードを公開しないでください。**
5. Realtime Database のデータタブにある **databaseURL** を確認。Webアプリの構成情報に databaseURL がなければ、追加してください。
6. Realtime Database → **ルール（Rules）** に、リポジトリの [firebase.database.rules.json](./firebase.database.rules.json) 全文を貼り付け、**公開（Publish）**。匿名認証している人だけが部屋にアクセスでき、参加者は原則として自分専用の状態しか読めません。

> **注意:** Firebase の Web アプリ設定中の `apiKey` は公開用識別子ですが、**サービスアカウントの秘密鍵は絶対に公開しないでください**。この仕組みは友達同士向けで、公開大規模サービス向けのレート制限や不正対策は未実装です。

## 2. サイト全体で同じ Firebase 設定を使用する（推奨）

リポジトリの [firebase-config.js](./firebase-config.js) の最後の行を、Firebase Console に表示された値で置き換えます。

```js
window.CHAOS_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_DATABASE.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  appId: "1:123456789:web:abcdef"
};
```

その後 `main` にコミットします。**友達が個別にJSONを登録する必要がなくなります**。ブラウザには公開できる Web アプリ設定だけを置き、個人の秘密鍵やサービスアカウントJSONは置かないでください。

共通設定をGitHubにコミットしたくなければ、各端末でゲームの「📡 通信」に `firebaseConfig` を貼り付けて保存する方法もあります。その設定は各ブラウザの localStorage にのみ保存されます。

## 3. 実際の対戦

1. [カオスレリック](https://yamato0816.github.io/gamedemo/) を開き、上部の **📡 通信** を押します。
2. **Firebase Realtime Database** を選択。大学Wi-Fiなどでは **Long Pollingを優先する** にチェックします。
3. 「Firebase設定を保存して選択」で再読み込み。
4. ホストが部屋を作って招待リンクを共有する。リンクに `&transport=firebase` が含まれます。
5. 参加者はリンクから入り、同じFirebaseプロジェクトで接続します。共通設定を登録してあれば、参加者側の貼り付けは不要です。
6. P2P に戻す場合は **📡 通信 → WebRTC P2Pを使う**。

## 仕組みと制約

- **ホスト権威型**: 乱数やカード効果の確定はホストのブラウザで実行します。Firebase 自体が勝敗を判定するわけではありません。ホストの画面を閉じると部屋は終了します。
- **手札のプライバシー**: 参加者の画面状態は `rooms/<room>/views/<firebase-uid>` に分け、Firebase Security Rules で本人とホストのみに読み取りを制限しています。
- **操作経路**: 参加者は `actions/<uid>/<push-id>` に操作を書き込み、ホストが取り込んで状態を各人に配信します。通常の対戦にはGASの3秒ポーリングを使いません。
- **Long Polling**: Firebase RTDB のWebSocketが学校のネットワークで使えない場合に、Long Pollingを強制するオプションがあります。ただし **学校側がFirebaseをブロックしている場合は接続できません**。
- **自動再参加**: 一時的な切断後は、同じ端末の匿名認証IDで復帰するよう試みます。ブラウザの認証データを消した場合やホストが終了した場合は復帰できません。
- **複数タブ**: 同じブラウザプロファイルで開いたタブはFirebaseの匿名認証IDを共有するため、同じ部屋に複数人として参加できません。テストはPCの別プロファイル、プライベートウィンドウ、またはスマホを使ってください。
- **無料枠**: Firebase Spark は Realtime Database **同時100接続・保存1GB・ダウンロード10GB/月** の範囲で無料です。上限を超えた場合、Spark プランではサービスが停止・制限される場合があります。最新情報は [Firebaseの公式料金ページ](https://firebase.google.com/pricing) で確認してください。
- **管理**: 大量の部屋・データベースへのスパムを防ぐには App Check、匿名認証の濫用制限、レート制限やサーバー側検証が別途必要です。仲間内の招待制で運用してください。

## 動作を確認するとき

- Firebase コンソール → Realtime Database → データ: `rooms/部屋コード/meta` や `participants` が作られること
- 接続できないときはブラウザの開発者ツールで `PERMISSION_DENIED` が出ていないか確認し、Authentication の匿名設定と Rules を見直す
- `Firebase SDKを読み込めません` と出るときは `www.gstatic.com` への接続を確認
- 本番Firebaseとの実接続テストは Firebase プロジェクトの作成後に行ってください。今回確認済みなのは通信ロジックのモックテストです
