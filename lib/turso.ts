import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { STATIC_KATEGORI, STATIC_JENIS_DOKUMEN } from './constants';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const isConfigured = !!(url && authToken);

let client: Awaited<ReturnType<typeof createClient>> | null = null;

async function getClient() {
  if (!isConfigured) return null;
  if (!client) {
    client = createClient({ url: url!, authToken: authToken! });
  }
  return client;
}

function sanitize(arr: unknown[]) {
  return arr.map(v => v === undefined ? null : v);
}

async function query(sql: string, args?: unknown[]) {
  const c = await getClient();
  if (!c) return null;
  return c.execute(sql, (args ? sanitize(args) : undefined) as any);
}

function mapRowWithPassword(row: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'status_aktif' || key === 'deleted' || key === 'wajib') {
      result[camel] = val == 1 || val === true;
    } else if (key === 'version_history') {
      continue;
    } else {
      result[camel] = val;
    }
  }
  return result;
}

function mapRow(row: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'status_aktif' || key === 'deleted' || key === 'wajib') {
      result[camel] = val == 1 || val === true;
    } else if (key === 'version_history' || key === 'password') {
      continue;
    } else {
      result[camel] = val;
    }
  }
  return result;
}

function mapArsipRow(row: Record<string, unknown>) {
  const base = mapRow(row);
  base.versionHistory = JSON.parse((row.version_history as string) || '[]');
  return base;
}

export async function initSchema() {
  const c = await getClient();
  if (!c) return;
  await c.batch([
    `CREATE TABLE IF NOT EXISTS instansi (id TEXT PRIMARY KEY, nama_instansi TEXT NOT NULL, alamat TEXT, kecamatan TEXT, kabupaten TEXT, status_aktif INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS pegawai (id TEXT PRIMARY KEY, instansi_id TEXT NOT NULL, nama_instansi TEXT, nama_pegawai TEXT NOT NULL, nip TEXT, nik TEXT, tanggal_lahir TEXT, jenis_kelamin TEXT, jabatan TEXT, status_pegawai TEXT, pangkat_golongan TEXT, pendidikan_terakhir TEXT, nomor_hp TEXT, email TEXT, alamat TEXT, password TEXT NOT NULL DEFAULT '', role TEXT DEFAULT 'pegawai', status_aktif INTEGER DEFAULT 1, login_terakhir TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS arsip (id TEXT PRIMARY KEY, pegawai_id TEXT NOT NULL, nip TEXT, nik TEXT, nama_pegawai TEXT, instansi_id TEXT, nama_instansi TEXT, kelompok_arsip TEXT, jenis_dokumen TEXT, nama_dokumen TEXT, nomor_dokumen TEXT, tanggal_dokumen TEXT, tahun TEXT, file_name TEXT, file_type TEXT, file_size INTEGER, storage_path TEXT, download_url TEXT, status_validasi TEXT DEFAULT 'Menunggu Validasi', catatan_admin TEXT, deleted INTEGER DEFAULT 0, uploaded_at TEXT, updated_at TEXT, uploaded_by TEXT, updated_by TEXT, version_history TEXT DEFAULT '[]')`,
    `CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, tanggal TEXT, user_id TEXT, pegawai_id TEXT, nip TEXT, nama_pegawai TEXT, role TEXT, aksi TEXT, detail TEXT, arsip_id TEXT, nama_dokumen TEXT)`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, keterangan TEXT)`,
    `CREATE TABLE IF NOT EXISTS kategori_arsip (id TEXT PRIMARY KEY, nama_kategori TEXT, urutan INTEGER, deskripsi TEXT)`,
    `CREATE TABLE IF NOT EXISTS jenis_dokumen (id TEXT PRIMARY KEY, kategori_id TEXT, nama_kategori TEXT, nama_dokumen TEXT, berlaku_untuk TEXT, wajib INTEGER DEFAULT 0, urutan INTEGER)`,
  ]);
  try { await c.execute('ALTER TABLE pegawai ADD COLUMN password TEXT NOT NULL DEFAULT \'\''); } catch {}
}

// INSTANSI
export async function getInstansi(id: string) {
  const r = await query('SELECT * FROM instansi WHERE id = ?', [id]);
  if (!r || r.rows.length === 0) return null;
  return mapRow(r.rows[0] as any);
}

export async function listInstansi() {
  const r = await query('SELECT * FROM instansi ORDER BY nama_instansi');
  if (!r) return [];
  return (r.rows as any[]).map(mapRow);
}

export async function createInstansi(data: {
  id: string; namaInstansi: string; alamat?: string; kecamatan?: string; kabupaten?: string; statusAktif: boolean;
}) {
  await query(
    `INSERT INTO instansi (id, nama_instansi, alamat, kecamatan, kabupaten, status_aktif) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.id, data.namaInstansi, data.alamat, data.kecamatan, data.kabupaten, data.statusAktif ? 1 : 0]
  );
  return data;
}

// PEGAWAI
export async function getPegawai(id: string) {
  const r = await query('SELECT * FROM pegawai WHERE id = ?', [id]);
  if (!r || r.rows.length === 0) return null;
  return mapRow(r.rows[0] as any);
}

export async function findPegawaiByNipNik(identifier: string, type: 'NIP' | 'NIK') {
  const col = type === 'NIP' ? 'nip' : 'nik';
  const r = await query(`SELECT * FROM pegawai WHERE ${col} = ?`, [identifier]);
  if (!r || r.rows.length === 0) return null;
  return mapRow(r.rows[0] as any);
}

export async function findPegawaiByNipNikWithPassword(identifier: string, type: 'NIP' | 'NIK') {
  const col = type === 'NIP' ? 'nip' : 'nik';
  const r = await query(`SELECT * FROM pegawai WHERE ${col} = ?`, [identifier]);
  if (!r || r.rows.length === 0) return null;
  return mapRowWithPassword(r.rows[0] as any);
}

export async function listPegawai(instansiId?: string) {
  let sql = 'SELECT * FROM pegawai';
  const args: unknown[] = [];
  if (instansiId) { sql += ' WHERE instansi_id = ?'; args.push(instansiId); }
  sql += ' ORDER BY nama_pegawai';
  const r = await query(sql, args.length > 0 ? args : undefined);
  if (!r) return [];
  return (r.rows as any[]).map(mapRow);
}

export async function createPegawai(data: any) {
  const pass = data.password || (data.nip ? data.nip.slice(-6) : (data.nik ? data.nik.slice(-6) : '123456'));
  const hashed = await bcrypt.hash(pass, 10);
  await query(
    `INSERT INTO pegawai (id, instansi_id, nama_instansi, nama_pegawai, nip, nik, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, nomor_hp, email, alamat, password, role, status_aktif, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.instansiId, data.namaInstansi, data.namaPegawai, data.nip, data.nik, data.tanggalLahir, data.jenisKelamin, data.jabatan, data.statusPegawai, data.pangkatGolongan, data.pendidikanTerakhir, data.nomorHp, data.email, data.alamat, hashed, data.role, data.statusAktif ? 1 : 0, data.createdAt, data.updatedAt]
  );
  return data;
}

export async function bulkCreatePegawai(list: any[]) {
  for (const data of list) {
    await createPegawai(data);
  }
}

export async function clearPegawaiExceptSuperAdmin() {
  await query("DELETE FROM arsip WHERE pegawai_id IN (SELECT id FROM pegawai WHERE id != 'PGW004')");
  await query("DELETE FROM logs WHERE pegawai_id IN (SELECT id FROM pegawai WHERE id != 'PGW004')");
  await query("DELETE FROM pegawai WHERE id != 'PGW004'");
}

export async function updateAllInstansiName(namaInstansi: string) {
  await query("UPDATE pegawai SET nama_instansi = ?, updated_at = datetime('now')", [namaInstansi]);
  await query("UPDATE instansi SET nama_instansi = ?", [namaInstansi]);
}

export async function updatePegawai(id: string, updates: Record<string, unknown>) {
  const setClauses: string[] = [];
  const args: unknown[] = [];
  for (const [key, val] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    setClauses.push(`${col} = ?`);
    args.push(key === 'statusAktif' ? (val ? 1 : 0) : val);
  }
  args.push(id);
  await query(`UPDATE pegawai SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`, args);
}

// ARSIP
export async function listArsipByPegawai(pegawaiId: string) {
  const r = await query('SELECT * FROM arsip WHERE pegawai_id = ? AND deleted = 0 ORDER BY updated_at DESC', [pegawaiId]);
  if (!r) return [];
  return (r.rows as any[]).map(mapArsipRow);
}

export async function getArsip(id: string) {
  const r = await query('SELECT * FROM arsip WHERE id = ?', [id]);
  if (!r || r.rows.length === 0) return null;
  return mapArsipRow(r.rows[0] as any);
}

export async function createArsip(data: any) {
  await query(
    `INSERT INTO arsip (id, pegawai_id, nip, nik, nama_pegawai, instansi_id, nama_instansi, kelompok_arsip, jenis_dokumen, nama_dokumen, nomor_dokumen, tanggal_dokumen, tahun, file_name, file_type, file_size, storage_path, download_url, status_validasi, deleted, uploaded_at, updated_at, uploaded_by, updated_by, version_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.pegawaiId, data.nip, data.nik, data.namaPegawai, data.instansiId, data.namaInstansi, data.kelompokArsip, data.jenisDokumen, data.namaDokumen, data.nomorDokumen, data.tanggalDokumen, data.tahun, data.fileName, data.fileType, data.fileSize, data.storagePath, data.downloadUrl, data.statusValidasi, data.deleted ? 1 : 0, data.uploadedAt, data.updatedAt, data.uploadedBy, data.updatedBy, JSON.stringify(data.versionHistory || [])]
  );
  return data;
}

export async function updateArsip(id: string, updates: Record<string, unknown>) {
  const setClauses: string[] = [];
  const args: unknown[] = [];
  for (const [key, val] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (key === 'versionHistory') {
      setClauses.push(`${col} = ?`);
      args.push(JSON.stringify(val));
    } else if (key === 'deleted') {
      setClauses.push(`${col} = ?`);
      args.push(val ? 1 : 0);
    } else {
      setClauses.push(`${col} = ?`);
      args.push(val);
    }
  }
  args.push(id);
  await query(`UPDATE arsip SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = ?`, args);
}

export async function listArsipAdmin(instansiId?: string) {
  let sql = 'SELECT * FROM arsip WHERE deleted = 0';
  const args: unknown[] = [];
  if (instansiId) { sql += ' AND instansi_id = ?'; args.push(instansiId); }
  sql += ' ORDER BY updated_at DESC';
  const r = await query(sql, args.length > 0 ? args : undefined);
  if (!r) return [];
  return (r.rows as any[]).map(mapArsipRow);
}

// LOGS
export async function createLog(data: any) {
  await query(
    `INSERT INTO logs (id, tanggal, user_id, pegawai_id, nip, nama_pegawai, role, aksi, detail, arsip_id, nama_dokumen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.tanggal, data.userId, data.pegawaiId, data.nip, data.namaPegawai, data.role, data.aksi, data.detail, data.arsipId || null, data.namaDokumen || null]
  );
}

export async function listLogs() {
  const r = await query('SELECT * FROM logs ORDER BY tanggal DESC LIMIT 200');
  if (!r) return [];
  return (r.rows as any[]).map(mapRow);
}

// SETTINGS
export async function getSetting(key: string) {
  const r = await query('SELECT value FROM settings WHERE key = ?', [key]);
  if (!r || r.rows.length === 0) return null;
  return (r.rows[0] as any).value;
}

export async function setSetting(key: string, value: string) {
  await query('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

// KATEGORI & JENIS DOKUMEN
export async function listKategori() {
  const r = await query('SELECT * FROM kategori_arsip ORDER BY urutan');
  if (!r) return [];
  return (r.rows as any[]).map(mapRow);
}

export async function createKategori(data: { id: string; namaKategori: string; urutan: number }) {
  await query('INSERT INTO kategori_arsip (id, nama_kategori, urutan) VALUES (?, ?, ?)',
    [data.id, data.namaKategori, data.urutan]);
  return data;
}

export async function updateKategori(id: string, data: { namaKategori?: string; urutan?: number }) {
  const set: string[] = []; const args: unknown[] = [];
  if (data.namaKategori !== undefined) { set.push('nama_kategori = ?'); args.push(data.namaKategori); }
  if (data.urutan !== undefined) { set.push('urutan = ?'); args.push(data.urutan); }
  if (set.length === 0) return;
  args.push(id);
  await query(`UPDATE kategori_arsip SET ${set.join(', ')} WHERE id = ?`, args);
}

export async function deleteKategori(id: string) {
  await query('DELETE FROM jenis_dokumen WHERE kategori_id = ?', [id]);
  await query('DELETE FROM kategori_arsip WHERE id = ?', [id]);
}

export async function listJenisDokumen() {
  const r = await query('SELECT * FROM jenis_dokumen ORDER BY urutan');
  if (!r) return [];
  return (r.rows as any[]).map(mapRow);
}

export async function createJenisDokumen(data: any) {
  await query('INSERT INTO jenis_dokumen (id, kategori_id, nama_kategori, nama_dokumen, berlaku_untuk, wajib, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.id, data.kategoriId, data.namaKategori, data.namaDokumen, data.berlakuUntuk, data.wajib ? 1 : 0, data.urutan || 0]);
  return data;
}

export async function updateJenisDokumen(id: string, data: any) {
  const set: string[] = []; const args: unknown[] = [];
  if (data.namaDokumen !== undefined) { set.push('nama_dokumen = ?'); args.push(data.namaDokumen); }
  if (data.berlakuUntuk !== undefined) { set.push('berlaku_untuk = ?'); args.push(data.berlakuUntuk); }
  if (data.wajib !== undefined) { set.push('wajib = ?'); args.push(data.wajib ? 1 : 0); }
  if (data.urutan !== undefined) { set.push('urutan = ?'); args.push(data.urutan); }
  if (set.length === 0) return;
  args.push(id);
  await query(`UPDATE jenis_dokumen SET ${set.join(', ')} WHERE id = ?`, args);
}

export async function deleteJenisDokumen(id: string) {
  await query('DELETE FROM jenis_dokumen WHERE id = ?', [id]);
}

export async function setPegawaiPassword(id: string, hashed: string) {
  await query('UPDATE pegawai SET password = ? WHERE id = ?', [hashed, id]);
}

export async function seedDefaultPasswords() {
  const seeds = [
    { id: 'PGW001', nip: '198705122010012003' },
    { id: 'PGW002', nip: '198501012008011002' },
    { id: 'PGW003', nip: '199003102014022001' },
  ];
  for (const s of seeds) {
    const pass = s.nip.slice(-6);
    const hashed = await bcrypt.hash(pass, 10);
    const r = await query('SELECT id, password FROM pegawai WHERE id = ?', [s.id]);
    if (r && r.rows.length > 0) {
      await query('UPDATE pegawai SET password = ? WHERE id = ?', [hashed, s.id]);
    }
  }
  // Super admin: specific credentials
  const saPass = await bcrypt.hash('admin456', 10);
  const sa = await query('SELECT id FROM pegawai WHERE id = ?', ['PGW004']);
  if (sa && sa.rows.length > 0) {
    await query('UPDATE pegawai SET nip = ?, password = ? WHERE id = ?', ['198001292025211035', saPass, 'PGW004']);
  }
}

export async function seedKategoriDanJenis() {
  const existingK = await query('SELECT COUNT(*) as cnt FROM kategori_arsip');
  if (existingK && (existingK.rows[0] as any).cnt > 0) return;
  for (const k of STATIC_KATEGORI) {
    await query('INSERT INTO kategori_arsip (id, nama_kategori, urutan, deskripsi) VALUES (?, ?, ?, ?)',
      [k.id, k.namaKategori, k.urutan, k.deskripsi || '']);
  }
  for (const jd of STATIC_JENIS_DOKUMEN) {
    await query('INSERT INTO jenis_dokumen (id, kategori_id, nama_kategori, nama_dokumen, berlaku_untuk, wajib, urutan) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [jd.id, jd.kategoriId, jd.namaKategori, jd.namaDokumen, jd.berlakuUntuk, jd.wajib ? 1 : 0, 0]);
  }
}

export async function ensureSuperAdmin() {
  const existing = await query("SELECT id FROM pegawai WHERE id = ?", ['PGW004']);
  if (existing && existing.rows.length > 0) return;
  const now = new Date().toISOString();
  const defaultPass = await bcrypt.hash('admin456', 10);
  await query(
    `INSERT INTO pegawai (id, instansi_id, nama_instansi, nama_pegawai, nip, nik, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, nomor_hp, email, alamat, password, role, status_aktif, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['PGW004', 'INST002', 'Kantor Kepegawaian Daerah Cirebon', 'Doni Prasetyo', '198001292025211035', '3209876543210002', '1992-08-15', 'Laki-laki', 'Admin Database', 'PNS', 'Penata Muda / III.a', 'D3', '085678912345', 'doni.prasetyo@asn.id', 'Perum Cipta Asri No. 7, Kesambi, Cirebon', defaultPass, 'super_admin', 1, now, now]
  );
}

export { isConfigured as isTursoConfigured };
