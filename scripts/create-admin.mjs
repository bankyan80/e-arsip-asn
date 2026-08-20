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

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum diset.');
  process.exit(1);
}

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin123';
const nama = process.argv[4] || 'Administrator';
const role = process.argv[5] || 'SUPER ADMIN';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const hash = await bcrypt.hash(password, 10);

const res = await pool.query(
  `INSERT INTO users (username, password_hash, nama, role) VALUES ($1,$2,$3,$4)
   ON CONFLICT (username) DO UPDATE SET password_hash=EXCLUDED.password_hash, nama=EXCLUDED.nama, role=EXCLUDED.role
   RETURNING id, username, role`,
  [username, hash, nama, role]
);

console.log('Admin siap:', JSON.stringify(res.rows[0]));
await pool.end();