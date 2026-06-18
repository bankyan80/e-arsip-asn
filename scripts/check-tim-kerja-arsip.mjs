import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const envContent = readFileSync('C:/Users/Bank Yan/tim-kerja/.env.local', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^=]+)="?(.+?)"?$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const client = createClient({ url: env['TURSO_DATABASE_URL'], authToken: env['TURSO_AUTH_TOKEN'] });

const count = await client.execute("SELECT COUNT(*) as cnt FROM arsip WHERE deleted_at IS NULL");
console.log('Total arsip:', count.rows[0].cnt);

const rows = await client.execute("SELECT * FROM arsip WHERE deleted_at IS NULL LIMIT 5");
for (const r of rows.rows) {
  const fileSize = r.file ? Math.round((r.file.length / 1024)) + ' KB' : 'N/A';
  console.log({ id: r.id, jenis_dokumen: r.jenis_dokumen, sekolah_id: r.sekolah_id, bulan: r.bulan, tahun: r.tahun, pemilik: r.pemilik, file_name: r.file_name, file_size: fileSize, versi: r.versi, created_at: r.created_at });
}

const jenis = await client.execute("SELECT DISTINCT jenis_dokumen FROM arsip WHERE deleted_at IS NULL");
console.log('\nJenis dokumen:', jenis.rows.map(r => r.jenis_dokumen));

const sizes = await client.execute("SELECT SUM(LENGTH(file)) as total FROM arsip WHERE file IS NOT NULL AND file != '' AND deleted_at IS NULL");
const totalMb = Math.round(Number(sizes.rows[0]?.total || 0) / (1024 * 1024));
console.log('\nTotal file size:', totalMb, 'MB');

client.close();
