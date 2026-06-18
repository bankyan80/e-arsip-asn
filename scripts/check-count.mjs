import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
const c = readFileSync('C:/Users/Bank Yan/simpeg-tim/.env', 'utf-8');
const e = {};
for (const l of c.split(/\r?\n/)) { const i=l.indexOf('='); if(i===-1) continue; e[l.substring(0,i).trim()] = l.substring(i+1); }
const cl = createClient({url:e['TURSO_DATABASE_URL'], authToken:e['TURSO_AUTH_TOKEN'] });
const r = await cl.execute("SELECT COUNT(*) as cnt FROM arsip");
console.log('ARSIP count:', r.rows[0].cnt);
const p = await cl.execute("SELECT COUNT(DISTINCT pegawai_id) as cnt FROM arsip");
console.log('Pegawai with arsip:', p.rows[0].cnt);
cl.close();
