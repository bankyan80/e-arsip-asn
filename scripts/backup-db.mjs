import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const TABLES = [
  "asn",
  "users",
  "jenis_dokumen",
  "dokumen",
  "upload_session",
  "audit_log",
  "download_log",
  "notifikasi_config",
  "notifications",
  "settings",
];

function loadEnv() {
  for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v.replace(/^"|"$/g, "");
  }
}
loadEnv();

const outDir = path.join(root, "backups");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const file = path.join(outDir, `backup-${stamp}.json`);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dump = {};
for (const t of TABLES) {
  const res = await pool.query(`SELECT * FROM ${t}`);
  dump[t] = res.rows;
}
fs.writeFileSync(file, JSON.stringify(dump, null, 2));
console.log("Backup saved:", file);
for (const t of TABLES) console.log(`  ${t}: ${dump[t].length} rows`);
await pool.end();