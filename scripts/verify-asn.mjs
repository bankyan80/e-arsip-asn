import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
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
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const q = async (label, text) => {
  const r = await pool.query(text);
  console.log(label + ":", JSON.stringify(r.rows));
};
await q("Total ASN", "SELECT COUNT(*)::int AS n FROM asn");
await q("Per unit_kerja", "SELECT unit_kerja, COUNT(*)::int AS n FROM asn GROUP BY unit_kerja ORDER BY unit_kerja");
await q("Per status", "SELECT status, COUNT(*)::int AS n FROM asn GROUP BY status ORDER BY status");
await q("Sample", "SELECT nip, nama, pangkat, golongan, jabatan, unit_kerja, status FROM asn ORDER BY nama LIMIT 3");
await pool.end();