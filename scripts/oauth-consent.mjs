import http from "http";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");

function readEnv() {
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=");
      if (i > 0 && !line.trim().startsWith("#")) {
        env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
      }
    }
  }
  return env;
}

const env = readEnv();
const CLIENT_ID = env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_DRIVE_CLIENT_SECRET;
const PORT = Number(process.argv[2] || 4025);
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/drive";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("GOOGLE_DRIVE_CLIENT_ID/SECRET tidak ditemukan di .env.local");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth" +
  `?client_id=${encodeURIComponent(CLIENT_ID)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  "&response_type=code" +
  `&scope=${encodeURIComponent(SCOPE)}` +
  "&access_type=offline&prompt=consent";

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/oauth2callback") {
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Gagal: " + err);
      return;
    }
    try {
      const tok = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT,
          grant_type: "authorization_code",
        }),
      });
      const j = await tok.json();
      if (!j.refresh_token) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Tidak dapat refresh_token. Coba lagi (perlu prompt=consent): " + JSON.stringify(j));
        return;
      }
      // update .env.local
      let content = fs.readFileSync(envPath, "utf8");
      const lineRe = /^GOOGLE_DRIVE_REFRESH_TOKEN=.*$/m;
      const newLine = `GOOGLE_DRIVE_REFRESH_TOKEN="${j.refresh_token}"`;
      if (lineRe.test(content)) content = content.replace(lineRe, newLine);
      else content += "\n" + newLine + "\n";
      fs.writeFileSync(envPath, content);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h3>Berhasil!</h3><p>Refresh token baru disimpan ke .env.local.</p>" +
          `<p>Scope: <code>${(j.scope || "").replace(/ /g, ", ")}</code></p>` +
          "<p>Bisa tutup tab ini.</p>"
      );
      console.log("OK - refresh token baru disimpan. Scope:", j.scope);
      setTimeout(() => process.exit(0), 500);
    } catch (e) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Error: " + e.message);
    }
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log("Server otorisasi aktif di", REDIRECT);
  console.log("Buka link berikut di browser (login sebagai yanuarhidayat80@gmail.com):\n");
  console.log(authUrl);
  console.log("\n");
});