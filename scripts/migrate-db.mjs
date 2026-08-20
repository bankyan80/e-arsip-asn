import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(root, '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 0) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v.replace(/^"|"$/g, '');
    }
  }
}

const cmd = process.argv[2] || 'all';
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diset. Set env terlebih dahulu atau isi .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const schemaSql = fs.readFileSync(path.join(root, 'src/lib/db/schema.sql'), 'utf8');
const seedSql = fs.readFileSync(path.join(root, 'src/lib/db/seed.sql'), 'utf8');

async function migrate() {
  await pool.query(schemaSql);
  console.log('Schema siap (idempotent).');
}

async function seed() {
  await pool.query(seedSql);
  // Ganti password_hash placeholder admin dengan hash bcrypt asli
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query(`UPDATE users SET password_hash=$1 WHERE username='admin' AND password_hash='$2a$10$placeholder'`, [hash]);
  console.log('Master data siap (idempotent). Admin default: admin/admin123');
}

const seedAsnSql = `
INSERT INTO asn (nip, nama, pangkat, golongan, jabatan, unit_kerja, status) VALUES
  ('198501012010011001', 'Andi Wijaya',   'Penata Tk.I', 'III/d', 'Analis Kepegawaian',  'Dinas Pendidikan', 'PNS'),
  ('199203152015032002', 'Siti Rahmawati', 'Penata Muda', 'III/a', 'Staf Umum',          'Dinas Kesehatan',  'PPPK'),
  ('198712242012122003', 'Budi Santoso',   'Pembina',     'IV/a', 'Kepala Bidang',       'Sekretariat Daerah','PNS')
ON CONFLICT (nip) DO NOTHING;
`;

async function seedAsn() {
  await pool.query(seedAsnSql);
  console.log('Contoh data ASN siap.');
}

async function main() {
  try {
    if (cmd === 'migrate') await migrate();
    else if (cmd === 'seed') await seed();
    else if (cmd === 'seed:asn') await seedAsn();
    else if (cmd === 'all') { await migrate(); await seed(); await seedAsn(); }
    else {
      console.error('Perintah tidak dikenal:', cmd);
      console.error('Gunakan: migrate | seed | seed:asn | all');
      process.exit(1);
    }
    console.log('Selesai.');
  } catch (e) {
    console.error('Gagal menjalankan migrasi:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();