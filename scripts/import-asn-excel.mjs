import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { Pool } from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx < 0) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v.replace(/^"|"$/g, "");
    }
  }
}

loadEnv();
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diset. Isi .env.local terlebih dahulu.");
  process.exit(1);
}

const XLSX = require("C:/Users/Bank Yan/portal-dinas/node_modules/xlsx");
const EXCEL = "C:/Users/Bank Yan/portal-dinas/data-pegawai-SEMUA-NEGERI.xlsx";

const wb = XLSX.readFile(EXCEL, { cellDates: true });
const sheet = wb.Sheets["Pegawai (dengan NIP)"];
if (!sheet) {
  console.error("Sheet 'Pegawai (dengan NIP)' tidak ditemukan.");
  process.exit(1);
}
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
const [header, ...data] = rows;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    let inserted = 0, updated = 0, skipped = 0, failed = 0;
    const errors = [];
    await client.query("BEGIN");
    for (const r of data) {
      const [nip, nik, nama, pangkat, golongan, jabatan, unit_kerja, status, email, no_hp, alamat] = r;
      if (!String(nip).trim() || !String(nama).trim()) { skipped++; continue; }
      if (!/^(PNS|PPPK|LAINNYA)$/.test(status)) {
        errors.push(`${nama}: status tidak valid '${status}'`);
        failed++;
        continue;
      }
      try {
        const res = await client.query(
          `INSERT INTO asn (nip, nama, pangkat, golongan, jabatan, unit_kerja, status, email, no_hp, alamat)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (nip) DO UPDATE SET
             nama = EXCLUDED.nama,
             pangkat = EXCLUDED.pangkat,
             golongan = EXCLUDED.golongan,
             jabatan = EXCLUDED.jabatan,
             unit_kerja = EXCLUDED.unit_kerja,
             status = EXCLUDED.status,
             email = EXCLUDED.email,
             no_hp = EXCLUDED.no_hp,
             alamat = EXCLUDED.alamat,
             updated_at = now()
           RETURNING (xmax = 0) AS is_insert`,
          [String(nip).trim(), String(nama).trim(), String(pangkat || "").trim() || null,
           String(golongan || "").trim() || null, String(jabatan || "").trim() || null,
           String(unit_kerja || "").trim() || null, status,
           String(email || "").trim() || null, String(no_hp || "").trim() || null,
           String(alamat || "").trim() || null]
        );
        if (res.rows[0].is_insert) inserted++; else updated++;
      } catch (e) {
        errors.push(`${nama} (${nip}): ${e.message}`);
        failed++;
      }
    }
    await client.query("COMMIT");
    console.log(`Selesai. Insert baru: ${inserted} | Update: ${updated} | Lewati: ${skipped} | Gagal: ${failed}`);
    if (errors.length) {
      console.log("\n=== Error details ===");
      errors.forEach((e) => console.log("- " + e));
    }
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Gagal:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();