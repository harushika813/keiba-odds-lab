// VPS用 簡易サーバー
// 使い方: node server.js
// ポート番号は環境変数 PORT で変更可（デフォルト3000）
// ANTHROPIC_API_KEY は環境変数、または同じフォルダの apikey.txt から読み込みます

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;

let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  try {
    ANTHROPIC_API_KEY = fs.readFileSync(path.join(__dirname, "apikey.txt"), "utf8").trim();
  } catch {
    ANTHROPIC_API_KEY = "";
  }
}

const PROMPT = `これらは同じ競馬レースに関する画像（出馬表、直前オッズ、馬場状態、パドック情報など、複数枚の場合あり）です。すべての情報を統合し、各出走馬の馬番(number)、馬名(name)、単勝オッズ(odds, 数値のみ。直前オッズの画像がある場合はそちらを優先した最新の値)、人気(popularity, 数値。不明ならnull)を抽出してください。また馬場状態(trackCondition: '良'/'稍重'/'重'/'不良'のいずれか、不明ならnull)と、パドックで推奨・評価が高いと記載されている馬番の配列(paddockPicks、記載が無ければ空配列)も抽出してください。
出力はJSONのみとし、説明文・マークダウン・コードブロックは一切付けないでください。
形式: {"raceName":"レース名またはnull","trackCondition":"良"または null,"paddockPicks":[3,7],"horses":[{"number":1,"name":"馬名","odds":4.5,"popularity":3}]}`;

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  // ---- 静的ファイル: index.html ----
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    fs.readFile(path.join(__dirname, "index.html"), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end("index.html not found");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  // ---- 画像解析API ----
  if (req.method === "POST" && req.url === "/api/analyze") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) req.destroy(); // 50MB上限
    });
    req.on("end", async () => {
      try {
        const { images } = JSON.parse(body || "{}");
        if (!Array.isArray(images) || images.length === 0) {
          sendJson(res, 400, { error: "images が空です。" });
          return;
        }
        if (!ANTHROPIC_API_KEY) {
          sendJson(res, 500, { error: "ANTHROPIC_API_KEY が設定されていません。環境変数か apikey.txt を確認してください。" });
          return;
        }

        const content = images.map((img) => ({
          type: "image",
          source: { type: "base64", media_type: img.mediaType || "image/png", data: img.data },
        }));
        content.push({ type: "text", text: PROMPT });

        const upstream = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 2000,
            messages: [{ role: "user", content }],
          }),
        });

        const data = await upstream.json();
        sendJson(res, upstream.status, data);
      } catch (e) {
        sendJson(res, 500, { error: e.message || String(e) });
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`ODDS LAB server running: http://localhost:${PORT}`);
  if (!ANTHROPIC_API_KEY) {
    console.log("警告: ANTHROPIC_API_KEY が未設定です（画像解析タブは使えません）。");
  }
});
