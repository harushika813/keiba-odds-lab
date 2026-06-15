# ODDS LAB - 競馬モンテカルロ着順シミュレーター

出馬表のスクショから出走馬データを抽出し、モンテカルロ法（Plackett-Luce/Gumbel法）で
レースを多数回シミュレーションして、勝率や三連単などの買い目候補を表示するアプリです。

## 構成

- `index.html` … フロントエンド本体（シミュレーション・UIすべて）
- `api/analyze.js` … 画像をClaude APIに送って出走馬データを抽出するサーバー側関数（Vercel Serverless Function）

PiTaPa経費アプリと同じ構成（フロント→自前API→Anthropic API）です。
画像解析を使わない場合（クイック入力・JSON貼り付けのみ）は、`api/analyze.js` は不要です。

## デプロイ手順（Vercel）

### 1. Anthropic APIキーを取得

https://console.anthropic.com/ にログインし、「API Keys」からキーを発行してください。
（Claude.aiのチャットとは別の、従量課金のAPI利用になります。料金は
 https://docs.claude.com/en/docs/about-claude/pricing を参照してください。）

### 2. Vercelにデプロイ

**方法A: Vercel CLIを使う場合**

```bash
npm install -g vercel
cd keiba-app
vercel
```

指示に従ってログイン・プロジェクト作成を行うと、デプロイ用URLが発行されます。
最初のデプロイ後、もう一度 `vercel --prod` を実行すると本番URLが確定します。

**方法B: GitHub経由でVercelにインポートする場合**

1. このフォルダの中身をGitHubリポジトリにpush
2. https://vercel.com/new でそのリポジトリを選択してインポート
3. そのままデプロイ（Build Command・Output Directoryの設定は不要です）

### 3. 環境変数を設定

Vercelのプロジェクト設定 → 「Environment Variables」で以下を追加してください。

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | 手順1で取得したAPIキー |

設定後、再デプロイ（Redeploy）してください。環境変数はビルド時ではなく
実行時に読み込まれるため、再デプロイすれば反映されます。

### 4. 使い方

デプロイされたURLを開き、

- 「画像から解析」タブ: 出馬表・直前オッズ・パドック情報などのスクショを選択
  → サーバー経由でClaudeが解析し、出走馬一覧に自動反映
- 「クイック入力」タブ: 手入力（テンプレート機能あり）
- 「JSON貼り付け」タブ: 別途生成したJSONを貼り付け

出走馬一覧で馬場状態・直前オッズ・適性・パドック推奨などを調整し、
シミュレーション回数を選んで「レースを◯回走らせる」を押すと、
単勝・複勝・馬連・馬単・ワイド・三連複・三連単の確率がまとめて表示されます。

## 料金について

「画像から解析」は1回の呼び出しごとにAnthropic APIの利用料がかかります
（画像枚数・解像度・出力量によりますが、1回あたり数円程度が目安）。
Claude.aiのチャット使用量とは別会計です。心配な場合は、Anthropicコンソールの
使用量ダッシュボードで定期的に確認することをおすすめします。

「クイック入力」「JSON貼り付け」タブはAPIを呼ばないため無料です。
