import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { extname } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';

// ── Load env (multi-line value aware) ─────────────────────────
const loadEnv = (p) => {
  const c = readFileSync(p, 'utf-8');
  const e = {};
  let curKey = null, curVal = '';
  for (const l of c.split(/\r?\n/)) {
    if (curKey) {
      if (l.trim() === '"') { e[curKey] = curVal.replace(/\n$/, ''); curKey = null; curVal = ''; }
      else curVal += l + '\n';
    } else {
      const eqIdx = l.indexOf('=');
      if (eqIdx === -1) continue;
      const k = l.substring(0, eqIdx).trim();
      let v = l.substring(eqIdx + 1);
      if (v.startsWith('"') && v.endsWith('"')) { e[k] = v.slice(1, -1); }
      else if (v.startsWith('"')) { curKey = k; curVal = v.slice(1) + '\n'; }
      else { e[k] = v; }
    }
  }
  return e;
};

const tkEnv = loadEnv('C:/Users/Bank Yan/tim-kerja/.env.local');
const eaEnv = loadEnv('C:/Users/Bank Yan/e-arsip-pegawai-sekolah-negeri/.env');
const seEnv = loadEnv('C:/Users/Bank Yan/simpeg-tim/.env');

// ── DB Clients ────────────────────────────────────────────────
const tkDb = createClient({ url: tkEnv['TURSO_DATABASE_URL'], authToken: tkEnv['TURSO_AUTH_TOKEN'] });
const eaDb = createClient({ url: seEnv['TURSO_DATABASE_URL'], authToken: seEnv['TURSO_AUTH_TOKEN'] });

// ── Firebase Admin ────────────────────────────────────────────
const certKey = (eaEnv['FIREBASE_PRIVATE_KEY'] || '').replace(/\\n/g, '\n').replace(/"/g, '');
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: eaEnv['FIREBASE_PROJECT_ID'],
      clientEmail: eaEnv['FIREBASE_CLIENT_EMAIL'],
      privateKey: certKey
    }),
    storageBucket: eaEnv['FIREBASE_STORAGE_BUCKET'] || `${eaEnv['FIREBASE_PROJECT_ID']}.appspot.com`
  });
}
const bucket = getStorage().bucket(eaEnv['FIREBASE_STORAGE_BUCKET']);

// ── Helpers ───────────────────────────────────────────────────
const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function getMime(name) {
  const ext = extname(name).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  // 1. Read all pegawai from e-arsip DB for name matching
  const pegRows = await eaDb.execute("SELECT id, nip, nama_pegawai, instansi_id, nama_instansi FROM pegawai");
  const pegawaiList = pegRows.rows.map(r => ({
    id: r.id, nip: r.nip, nama: r.nama_pegawai, instansiId: r.instansi_id, namaInstansi: r.nama_instansi
  }));
  console.log(`Loaded ${pegawaiList.length} pegawai from e-arsip DB`);

  // 2. Read map sekolah from tim-kerja DB
  const sklRows = await tkDb.execute("SELECT id, npsn, nama FROM sekolah");
  const sekolahMap = {};
  for (const r of sklRows.rows) {
    sekolahMap[r.id] = { npsn: r.npsn, nama: r.nama };
  }
  console.log(`Loaded ${sklRows.rows.length} sekolah from tim-kerja DB`);

  // 3. Read arsip from tim-kerja DB
  const arsipRows = await tkDb.execute("SELECT * FROM arsip WHERE deleted_at IS NULL ORDER BY created_at ASC");
  const total = arsipRows.rows.length;
  console.log(`\nMigrating ${total} arsip records...\n`);

  let success = 0, skipped = 0, errors = 0;

  for (let i = 0; i < total; i++) {
    const a = arsipRows.rows[i];
    const namaPemilik = (a.pemilik || '').trim().toUpperCase();

    // Find pegawai by name (fuzzy match)
    const peg = pegawaiList.find(p => p.nama.toUpperCase() === namaPemilik);
    if (!peg) {
      console.log(`  [SKIP ${i + 1}/${total}] Pegawai tidak ditemukan: "${a.pemilik}" (${a.jenis_dokumen})`);
      skipped++;
      continue;
    }

    // Determine kelompok_arsip from jenis_dokumen
    const jenisDok = a.jenis_dokumen || 'Lainnya';
    const kelompokArsip = ['KTP', 'KK', 'Ijazah', 'SK', 'Sertifikat', 'BPJS', 'NPWP', 'Akta', 'Pass Foto', 'Kartu']
      .some(k => jenisDok.includes(k)) ? 'Dokumen Pendukung' : 'Dokumen Kepegawaian';

    // Extract base64 file data
    const fileData = a.file || '';
    const fileName = a.file_name || `dokumen_${a.id}.pdf`;
    const fileType = getMime(fileName);

    let storagePath = '';
    let downloadUrl = '';
    const fileSize = fileData.length;

    if (fileData.startsWith('data:')) {
      // Upload to Firebase Storage
      try {
        const [mimeHeader, b64Content] = fileData.split(',');
        const buf = Buffer.from(b64Content, 'base64');
        const cleanKel = kelompokArsip.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanJen = jenisDok.replace(/[^a-zA-Z0-9]/g, '_');
        const cleanNama = peg.nama.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = Date.now();
        const ext = extname(fileName) || '.pdf';
        storagePath = `arsip-asn/${peg.instansiId}/${peg.id}/${cleanKel}/${a.tahun}_${cleanJen}_${cleanNama}_${timestamp}${ext}`;

        const file = bucket.file(storagePath);
        await file.save(buf, {
          metadata: { contentType: fileType },
          resumable: false
        });
        downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
      } catch (fbErr) {
        console.log(`  [ERR ${i + 1}/${total}] Firebase upload failed for ${a.pemilik}:`, fbErr.message);
        errors++;
        continue;
      }
    }

    // Insert into e-arsip's arsip table
    try {
      const arsipId = a.id.substring(0, 16); // use first 16 chars of existing ID
      await eaDb.execute(
        `INSERT INTO arsip (id, pegawai_id, nip, nik, nama_pegawai, instansi_id, nama_instansi, kelompok_arsip, jenis_dokumen, nama_dokumen, nomor_dokumen, tanggal_dokumen, tahun, file_name, file_type, file_size, storage_path, download_url, status_validasi, deleted, uploaded_at, updated_at, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Valid', 0, ?, ?, 'migration@tim-kerja')`,
        [
          arsipId, peg.id, peg.nip || '', '',
          peg.nama, peg.instansiId, peg.namaInstansi,
          kelompokArsip, jenisDok, fileName,
          a.bulan ? `Bulan ${a.bulan}` : '', a.tahun ? `${a.tahun}-01-01` : '',
          a.tahun || '', fileName, fileType, fileSize,
          storagePath, downloadUrl,
          a.created_at || new Date().toISOString(), new Date().toISOString()
        ]
      );
      success++;
      if ((i + 1) % 50 === 0 || i === 0 || i === total - 1) {
        console.log(`  [OK ${i + 1}/${total}] ${a.pemilik} → ${jenisDok} (${fileName})`);
      }
    } catch (dbErr) {
      console.log(`  [ERR ${i + 1}/${total}] DB insert failed for ${a.pemilik}:`, dbErr.message);
      errors++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped} (pegawai tidak ditemukan)`);
  console.log(`Errors: ${errors}`);

  tkDb.close();
  eaDb.close();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
