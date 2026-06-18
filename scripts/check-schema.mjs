import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const c = readFileSync('C:/Users/Bank Yan/simpeg-tim/.env', 'utf-8');
const seEnv = {};
for (const l of c.split(/\r?\n/)) {
  const eqIdx = l.indexOf('=');
  if (eqIdx === -1) continue;
  seEnv[l.substring(0, eqIdx).trim()] = l.substring(eqIdx + 1);
}

const client = createClient({ url: seEnv['TURSO_DATABASE_URL'], authToken: seEnv['TURSO_AUTH_TOKEN'] });

// List all tables
const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('Tables:', tables.rows.map(r => r.name));

// Check arsip columns
const arsipCols = await client.execute("PRAGMA table_info('arsip')");
console.log('\nArsip columns:', arsipCols.rows.map(r => ({ name: r.name, type: r.type })));

// Check pegawai columns
const pegCols = await client.execute("PRAGMA table_info('pegawai')");
console.log('\nPegawai columns:', pegCols.rows.map(r => ({ name: r.name, type: r.type })));

client.close();
