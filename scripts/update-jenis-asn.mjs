import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  if (!line || line.trim().startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx < 0) continue;
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
  if (!process.env[k]) process.env[k] = v;
}

// Pemetaan NIP -> jenis_asn (PPPK Paruh Waktu)
const GURU_PW = [
  '198709092025212107', // Asiatul Fauziah
  '198507252025212055', // Nurul Hikmah
  '197902022025212040', // Karyati
  '199007162025212090', // Rahmah Yulia
  '198705272025212081', // Aan Fitrianani
  '199709162025212054', // Ica Anisah
  '199903242025212046', // Fariziah Ambarsari
  '199612132025212054', // Ismawati
  '199201012025211199', // Heri Kuswanto
  '199905222025212039', // Meigy Irma Oktaverina
  '199605242025212064', // Islamati Istiqomah
  '199510062025211079', // Fajar Dedi Miftakhuddin
  '198903062025211071', // Firman Awaludin
  '199707032025212074', // Yulian Sabitni Amanah
  '199712112025212060', // Suprihatin
  '198912092025212085', // Nunung Herawati
  '199306112025212093', // Mar'atun Sholehah
];

const TENDIK_PW = [
  '199911152025211031', // Muhamad Syahrul Efendi
  '198303152025212108', // Carwinah
  '199302092025211085', // Diyan Hidayat
  '197605182025212033', // Sri Nurchaeni
  '199711252025211087', // Yudha Nugraha
  '197505032025211057', // Rahmat
  '197310122025211042', // Nana Junaedi
  '198811102025211144', // Agus Maulana
  '199411072025212060', // Garnis Nurul Fathonah
  '197109062025211029', // Imanurdin Ramadon
  '199307242025211075', // Shepta
  '199901092025211041', // Mochamad Ramdhani
  '197705092025211048', // Ade Subur Sugiharto
  '198404022025212090', // Siti Solaeha
  '199403102025212080', // Mertyani Rahayu
  '197310102025211056', // Nana Mulyana
  '198705102025212104', // Sofroh
  '198911112025211114', // Azi Purnama
  '198503202025211091', // Gofur
  '198803092025212064', // Martiningsih
  '197505112025211053', // Hendra Permana
  '197610132025211042', // Sunandar
  '198701242025212055', // Siti Nurlaelasari
  '197309152025211052', // Wachyudin
  '200301242025211008', // Putra Jayadi
  '197606112025212028', // Juni
  '197006172025211050', // Een Sunarya
  '197510142025211033', // Adang Maulana
  '198007312025211041', // Endang Kasmara
  '199108272025211057', // Saeful Alim
  '200104062025211027', // Fajar Sidik
  '199906292025211051', // Ade Setia Maulana
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let okGuru = 0, okTendik = 0;
const gagal = [];

for (const nip of GURU_PW) {
  const r = await pool.query(
    `UPDATE asn SET jenis_asn = 'PPPK_GURU_PARUH_WAKTU', status = 'PPPK', updated_at = now()
     WHERE nip = $1 RETURNING nip, nama`,
    [nip]
  );
  if (r.rowCount > 0) okGuru++;
  else gagal.push(nip);
}

for (const nip of TENDIK_PW) {
  const r = await pool.query(
    `UPDATE asn SET jenis_asn = 'PPPK_TENDIK_PARUH_WAKTU', status = 'PPPK', updated_at = now()
     WHERE nip = $1 RETURNING nip, nama`,
    [nip]
  );
  if (r.rowCount > 0) okTendik++;
  else gagal.push(nip);
}

console.log(`✅ Guru Paruh Waktu : ${okGuru}/${GURU_PW.length} diperbarui`);
console.log(`✅ Tendik Paruh Waktu: ${okTendik}/${TENDIK_PW.length} diperbarui`);
if (gagal.length > 0) {
  console.log('❌ NIP tidak ditemukan:', gagal.join(', '));
}

const rekap = await pool.query(
  `SELECT COALESCE(jenis_asn, '(kosong)') AS jenis, COUNT(*)::int AS total FROM asn GROUP BY 1 ORDER BY 2 DESC`
);
console.log('\nRekap jenis ASN:');
for (const r of rekap.rows) console.log(`  ${r.jenis}: ${r.total}`);

await pool.end();
