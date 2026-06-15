# VPSでの動かし方（Windows VPS想定）

Vercel/GitHubを使わず、お手元のVPS1台だけで動かす場合の手順です。

## 1. Node.jsをインストール

VPSにRDP接続し、ブラウザで https://nodejs.org からLTS版をダウンロードしてインストール
（指示に従って「Next」を押していくだけでOKです）。

インストール後、コマンドプロンプト（またはPowerShell）で確認:

```
node -v
```

バージョンが表示されればOKです（v18以上が必要）。

## 2. ファイルを配置

このフォルダ（`keiba-app`）をVPS内の任意の場所に置きます。
例: `C:\apps\keiba-app`

含まれるファイル:
- `index.html` … 画面本体
- `server.js` … サーバー本体（これを起動します）
- `api/`, `package.json`, `README.md`, `VPS_DEPLOY.md` … Vercel用なので使いません（削除してOK）

## 3. Anthropic APIキーを設定

`keiba-app` フォルダの中に `apikey.txt` という名前のテキストファイルを新規作成し、
1行目にAPIキーをそのまま貼り付けて保存してください。

```
sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

（環境変数 `ANTHROPIC_API_KEY` を設定する方法でも構いません。その場合は
 `apikey.txt` は不要です。）

## 4. サーバーを起動

コマンドプロンプトで `keiba-app` フォルダに移動して実行:

```
cd C:\apps\keiba-app
node server.js
```

`ODDS LAB server running: http://localhost:3000` と表示されれば起動成功です。

## 5. 外部（スマホ）からアクセスできるようにする（ngrok）

ポート開放が難しい環境なので、MT5通知と同じくngrokでトンネルを張ります。

### 5-1. ngrokでトンネルを起動

`server.js`を起動したまま、別のコマンドプロンプトで:

```
ngrok http 3000
```

`Forwarding https://xxxx.ngrok-free.app -> http://localhost:3000` のような
行が表示されるので、その `https://xxxx.ngrok-free.app` がアクセス用URLです。

### 5-2. スマホからアクセス

スマホのブラウザで、上記の `https://xxxx.ngrok-free.app` を開きます。

### 注意（MT5通知用ngrokとの同時起動について）

ngrokの無料プランは、同時に起動できるトンネル（エンドポイント）数に上限があります。
MT5通知用に既にngrokを動かしている場合、プランによっては2つ目のトンネルが
同時起動できないことがあります。

- 使う時だけこのアプリ用のngrokを起動する（MT5側は止めない）
- 別のngrokアカウント／authtokenをこのアプリ専用に用意する
- ngrokの有料プランで複数エンドポイントに対応する

のいずれかで対応してください。ngrokの管理画面（dashboard.ngrok.com）の
「Endpoints」で現在の上限・使用状況を確認できます。

URLは再起動するたびに変わります（無料プランの場合）。固定したい場合は
ngrokの「予約済みドメイン（Reserved Domain）」機能（有料プラン）を使うと、
毎回同じURLでアクセスできます。

### （参考）ポート開放ができる場合

VPS側・ファイアウォール側でTCPポートが開放できる環境であれば、ngrokを使わず
直接 `http://(VPSのグローバルIP):3000` でアクセスすることも可能です。
Windows側は「Windows Defender ファイアウォール」→「詳細設定」→「受信の規則」
→「新しい規則」→ ポート → TCP → 3000 で許可します。

## 6. 常時起動させる（任意）

コマンドプロンプトを閉じるとサーバーも止まります。常時稼働させたい場合は、
以下のいずれかを使ってください。

**PM2を使う場合（おすすめ）**

```
npm install -g pm2
cd C:\apps\keiba-app
pm2 start server.js --name odds-lab
pm2 save
```

**タスクスケジューラを使う場合**

「タスクの作成」→ トリガー「PC起動時」→ 操作「プログラムの開始」で
`node.exe` を指定し、引数に `server.js`、開始フォルダに `C:\apps\keiba-app` を指定。
「ユーザーがログオンしていなくても実行する」を有効にしてください。

## 注意

- ngrok経由なら自動的にHTTPSになるので、通信の暗号化は問題ありません。
- MT5用VPSと共用するので、`server.js`がMT5やTelegram通知サーバーと
  ポート番号（3000番）が重複しないか確認してください。重複する場合は
  `server.js`実行時に環境変数 `PORT` を指定すれば変更できます
  （例: `set PORT=3500 && node server.js`）。その場合 `ngrok http 3500` も
  合わせて変更してください。
- 画像解析タブを使うとAnthropic APIの利用料が発生します（1回あたり数円程度）。
