import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv() {
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^"|"$/g, "");
  }
}
loadEnv();

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const TOKEN_API = "https://oauth2.googleapis.com/token";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const ROOT_FOLDER_ID = process.argv[2] || "11gc-80YCeDuxHvxS9su3vcgYrz9xTK_R";
const OUT_CSV = path.join(root, "drive-arsip-urls.csv");
const OUT_JSON = path.join(root, "drive-arsip-list.json");

async function getAccessToken() {
  const res = await fetch(TOKEN_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Token gagal: " + (await res.text()));
  const j = await res.json();
  return j.access_token;
}

async function driveFetch(token, path, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${DRIVE_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return await res.json();
    if (res.status === 429 || res.status >= 500) {
      const delay = attempt * 1000;
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new Error(`Drive API ${path} gagal: ${res.status} ${await res.text()}`);
  }
  throw new Error(`Drive API ${path} gagal setelah retry`);
}

async function listChildren(token, folderId, pageToken = "") {
  const q = `'${folderId}' in parents and trashed=false`;
  const p = `/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,webViewLink)&pageSize=1000&spaces=drive` + (pageToken ? `&pageToken=${pageToken}` : "");
  return await driveFetch(token, p);
}

async function walkFolder(token, folderId, folderName, depth, results, stats) {
  let pageToken = "";
  do {
    const page = await listChildren(token, folderId, pageToken);
    for (const f of page.files ?? []) {
      const relPath = folderName ? `${folderName}/${f.name}` : f.name;
      if (f.mimeType === FOLDER_MIME) {
        stats.folders++;
        await walkFolder(token, f.id, relPath, depth + 1, results, stats);
      } else {
        stats.files++;
        results.push({
          path: relPath,
          name: f.name,
          mimeType: f.mimeType,
          size: Number(f.size ?? 0),
          id: f.id,
          url: `https://drive.google.com/file/d/${f.id}/view`,
          webViewLink: f.webViewLink ?? "",
          downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
        });
      }
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);
}

(async () => {
  const token = await getAccessToken();
  const rootInfo = await driveFetch(token, `/files/${ROOT_FOLDER_ID}?fields=id,name,mimeType`);
  if (!rootInfo.id) throw new Error("Folder root tidak ditemukan / tidak punya akses");

  const results = [];
  const stats = { folders: 0, files: 0 };
  console.log("Scan mulai:", rootInfo.name, `(${rootInfo.id})`);
  await walkFolder(token, ROOT_FOLDER_ID, rootInfo.name, 0, results, stats);

  results.sort((a, b) => a.path.localeCompare(b.path, "id"));
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));

  const header = "PATH,NAMA,MIME_TYPE,SIZE,FILE_ID,URL,DOWNLOAD_URL";
  const lines = results.map((r) =>
    [r.path, r.name, r.mimeType, r.size, r.id, r.url, r.downloadUrl].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  fs.writeFileSync(OUT_CSV, [header, ...lines].join("\n"), "utf8");

  console.log(`Selesai. Folder: ${stats.folders}, File: ${stats.files}`);
  console.log("JSON:", OUT_JSON);
  console.log("CSV :", OUT_CSV);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});