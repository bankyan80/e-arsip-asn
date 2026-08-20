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
const fix = await pool.query("UPDATE asn SET unit_kerja = $1, updated_at = now() WHERE unit_kerja = $2", ["SD NEGERI 1 LEUWIDINGDING", "SDN 1 Leuwidingding"]);
const fix2 = await pool.query("UPDATE asn SET unit_kerja = $1, updated_at = now() WHERE unit_kerja = $2", ["SD NEGERI 1 WANGKELANG", "SDN 1 Wangkelang"]);
console.log("fix Leuwidingding:", fix.rowCount, "| fix Wangkelang:", fix2.rowCount);
const c = await pool.query("SELECT unit_kerja, COUNT(*)::int n FROM asn GROUP BY unit_kerja ORDER BY unit_kerja");
console.log("unit_kerja:", c.rows.map((x) => x.unit_kerja + "(" + x.n + ")").join(", "));
const s = await pool.query("SELECT status, COUNT(*)::int n FROM asn GROUP BY status ORDER BY status");
console.log("status:", s.rows.map((x) => x.status + "(" + x.n + ")").join(", "));
await pool.end();