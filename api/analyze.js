// Vercel Serverless Function: /api/analyze
// フロントから送られた画像(base64)をClaude APIに送り、出馬表データをJSONで抽出する

const PROMPT = `これらは同じ競馬レースに関する画像（出馬表、直前オッズ、馬場状態、パドック情報など、複数枚の場合あり）です。すべての情報を統合し、各出走馬について以下を抽出してください。
- number: 馬番(数値)
- name: 馬名
- frameNumber: 枠番(数値。記載が無ければnull)
- jockey: 騎手名(文字列。不明ならnull)
- jockeyRating: その騎手の一般的な実力評価。'得意'(リーディング上位・GI級の実力で知られる騎手)/'普通'(通常クラスの騎手)/'不得意'(見習い・経験が浅い騎手)のいずれか。最新の調子や成績データは見られないため、あくまで一般的な評価・知名度に基づく推測で構いません。判断できない場合は'普通'。
- odds: 単勝オッズ(数値のみ。直前オッズの画像がある場合はそちらを優先した最新の値)
- popularity: 人気(数値。不明ならnull)

また、馬場状態(trackCondition: '良'/'稍重'/'重'/'不良'のいずれか、不明ならnull)と、
パドックで推奨・評価が高いと記載されている馬番の配列(paddockPicks、記載が無ければ空配列)も抽出してください。

出力はJSONのみとし、説明文・マークダウン・コードブロックは一切付けないでください。
形式: {"raceName":"レース名またはnull","trackCondition":"良"または null,"paddockPicks":[3,7],"horses":[{"number":1,"frameNumber":1,"name":"馬名","jockey":"騎手名","jockeyRating":"普通","odds":4.5,"popularity":3}]}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY が設定されていません。Vercelの環境変数を確認してください。" });
    return;
  }

  try {
    const { images } = req.body || {};
    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ error: "images が空です。" });
      return;
    }

    const content = images.map((img) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType || "image/png",
        data: img.data,
      },
    }));
    content.push({ type: "text", text: PROMPT });

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
}
