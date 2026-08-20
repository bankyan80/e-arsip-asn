import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

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

const XLSX = require("C:/Users/Bank Yan/portal-dinas/node_modules/xlsx");
const wb = XLSX.readFile("C:/Users/Bank Yan/portal-dinas/data-pegawai-SEMUA-NEGERI.xlsx");
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Pegawai (dengan NIP)"], { header: 1, defval: "" }).slice(1);
const excelNips = new Set(rows.map((r) => String(r[0]).trim()).filter(Boolean));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const dbRes = await pool.query("SELECT nip FROM asn");
const dbNips = new Set(dbRes.rows.map((r) => r.nip));

const inExcelNotDb = [...excelNips].filter((n) => !dbNips.has(n));
const inDbNotExcel = [...dbNips].filter((n) => !excelNips.has(n));

console.log("Excel ber-NIP:", excelNips.size);
console.log("DB ASN:", dbNips.size);
console.log("Di Excel tapi TIDAK di DB:", inExcelNotDb.length);
inExcelNotDb.forEach((n) => console.log("  -", n));
console.log("Di DB tapi TIDAK di Excel:", inDbNotExcel.length);
inDbNotExcel.forEach((n) => console.log("  -", n));
await pool.end();