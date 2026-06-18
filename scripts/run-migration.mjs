import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

// Load tim-kerja env
const c = readFileSync('C:/Users/Bank Yan/tim-kerja/.env.local', 'utf-8');
const tkEnv = {};
for (const l of c.split(/\r?\n/)) {
  const i = l.indexOf('=');
  if (i === -1) continue;
  tkEnv[l.substring(0, i).trim()] = l.substring(i + 1);
}

const tkDb = createClient({ url: tkEnv['TURSO_DATABASE_URL'], authToken: tkEnv['TURSO_AUTH_TOKEN'] });

// Read all arsip
const rows = await tkDb.execute("SELECT * FROM arsip WHERE deleted_at IS NULL");
const arsip = rows.rows.map(r => ({
  jenis_dokumen: r.jenis_dokumen,
  sekolah_id: r.sekolah_id,
  bulan: r.bulan,
  tahun: r.tahun,
  pemilik: r.pemilik,
  file: r.file,
  file_name: r.file_name,
  created_at: r.created_at
}));

tkDb.close();

console.log(`Read ${arsip.length} arsip from tim-kerja DB`);

// Send to e-arsip migration endpoint
const BASE = 'https://e-arsip-asn.vercel.app';
const loginRes = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ loginType: 'NIP', identifier: '198001292025211035', password: 'admin456' })
});
const cookies = loginRes.headers.getSetCookie?.() || [];
const sessionCookie = cookies.find(c => c.startsWith('session='));
if (!sessionCookie) { console.error('Login failed'); process.exit(1); }
console.log('Logged in');

// Send in batches
const BATCH = 100;
for (let i = 0; i < arsip.length; i += BATCH) {
  const batch = arsip.slice(i, i + BATCH);
  const res = await fetch(BASE + '/api/admin/migrate-arsip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': sessionCookie.split(';')[0] },
    body: JSON.stringify({ arsip: batch })
  });
  const data = await res.json();
  const batchNum = Math.floor(i / BATCH) + 1;
  console.log(`Batch ${batchNum}/${Math.ceil(arsip.length / BATCH)}:`, data.message || data.error);
}
