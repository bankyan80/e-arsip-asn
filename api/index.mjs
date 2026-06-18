var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// lib/turso.ts
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
async function getClient() {
  if (!isConfigured) return null;
  if (!client) {
    client = createClient({ url, authToken });
  }
  return client;
}
function sanitize(arr) {
  return arr.map((v) => v === void 0 ? null : v);
}
async function query(sql, args) {
  const c = await getClient();
  if (!c) return null;
  return c.execute(sql, args ? sanitize(args) : void 0);
}
function mapRowWithPassword(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "status_aktif" || key === "deleted" || key === "wajib") {
      result[camel] = val == 1 || val === true;
    } else if (key === "version_history") {
      continue;
    } else {
      result[camel] = val;
    }
  }
  return result;
}
function mapRow(row) {
  const result = {};
  for (const [key, val] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (key === "status_aktif" || key === "deleted" || key === "wajib") {
      result[camel] = val == 1 || val === true;
    } else if (key === "version_history" || key === "password") {
      continue;
    } else {
      result[camel] = val;
    }
  }
  return result;
}
function mapArsipRow(row) {
  const base = mapRow(row);
  base.versionHistory = JSON.parse(row.version_history || "[]");
  return base;
}
async function initSchema() {
  const c = await getClient();
  if (!c) return;
  await c.batch([
    `CREATE TABLE IF NOT EXISTS instansi (id TEXT PRIMARY KEY, nama_instansi TEXT NOT NULL, alamat TEXT, kecamatan TEXT, kabupaten TEXT, status_aktif INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS pegawai (id TEXT PRIMARY KEY, instansi_id TEXT NOT NULL, nama_instansi TEXT, nama_pegawai TEXT NOT NULL, nip TEXT, nik TEXT, tanggal_lahir TEXT, jenis_kelamin TEXT, jabatan TEXT, status_pegawai TEXT, pangkat_golongan TEXT, pendidikan_terakhir TEXT, nomor_hp TEXT, email TEXT, alamat TEXT, password TEXT NOT NULL DEFAULT '', role TEXT DEFAULT 'pegawai', status_aktif INTEGER DEFAULT 1, login_terakhir TEXT, created_at TEXT, updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS arsip (id TEXT PRIMARY KEY, pegawai_id TEXT NOT NULL, nip TEXT, nik TEXT, nama_pegawai TEXT, instansi_id TEXT, nama_instansi TEXT, kelompok_arsip TEXT, jenis_dokumen TEXT, nama_dokumen TEXT, nomor_dokumen TEXT, tanggal_dokumen TEXT, tahun TEXT, file_name TEXT, file_type TEXT, file_size INTEGER, storage_path TEXT, download_url TEXT, status_validasi TEXT DEFAULT 'Menunggu Validasi', catatan_admin TEXT, deleted INTEGER DEFAULT 0, uploaded_at TEXT, updated_at TEXT, uploaded_by TEXT, updated_by TEXT, version_history TEXT DEFAULT '[]')`,
    `CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, tanggal TEXT, user_id TEXT, pegawai_id TEXT, nip TEXT, nama_pegawai TEXT, role TEXT, aksi TEXT, detail TEXT, arsip_id TEXT, nama_dokumen TEXT)`,
    `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, keterangan TEXT)`,
    `CREATE TABLE IF NOT EXISTS kategori_arsip (id TEXT PRIMARY KEY, nama_kategori TEXT, urutan INTEGER, deskripsi TEXT)`,
    `CREATE TABLE IF NOT EXISTS jenis_dokumen (id TEXT PRIMARY KEY, kategori_id TEXT, nama_kategori TEXT, nama_dokumen TEXT, berlaku_untuk TEXT, wajib INTEGER DEFAULT 0, urutan INTEGER)`
  ]);
  try {
    await c.execute("ALTER TABLE pegawai ADD COLUMN password TEXT NOT NULL DEFAULT ''");
  } catch {
  }
}
async function getInstansi(id) {
  const r = await query("SELECT * FROM instansi WHERE id = ?", [id]);
  if (!r || r.rows.length === 0) return null;
  return mapRow(r.rows[0]);
}
async function listInstansi() {
  const r = await query("SELECT * FROM instansi ORDER BY nama_instansi");
  if (!r) return [];
  return r.rows.map(mapRow);
}
async function createInstansi(data) {
  await query(
    `INSERT INTO instansi (id, nama_instansi, alamat, kecamatan, kabupaten, status_aktif) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.id, data.namaInstansi, data.alamat, data.kecamatan, data.kabupaten, data.statusAktif ? 1 : 0]
  );
  return data;
}
async function getPegawai(id) {
  const r = await query("SELECT * FROM pegawai WHERE id = ?", [id]);
  if (!r || r.rows.length === 0) return null;
  return mapRow(r.rows[0]);
}
async function findPegawaiByNipNikWithPassword(identifier, type) {
  const col = type === "NIP" ? "nip" : "nik";
  const r = await query(`SELECT * FROM pegawai WHERE ${col} = ?`, [identifier]);
  if (!r || r.rows.length === 0) return null;
  return mapRowWithPassword(r.rows[0]);
}
async function listPegawai(instansiId) {
  let sql = "SELECT * FROM pegawai";
  const args = [];
  if (instansiId) {
    sql += " WHERE instansi_id = ?";
    args.push(instansiId);
  }
  sql += " ORDER BY nama_pegawai";
  const r = await query(sql, args.length > 0 ? args : void 0);
  if (!r) return [];
  return r.rows.map(mapRow);
}
async function createPegawai(data) {
  await query(
    `INSERT INTO pegawai (id, instansi_id, nama_instansi, nama_pegawai, nip, nik, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, nomor_hp, email, alamat, password, role, status_aktif, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.instansiId, data.namaInstansi, data.namaPegawai, data.nip, data.nik, data.tanggalLahir, data.jenisKelamin, data.jabatan, data.statusPegawai, data.pangkatGolongan, data.pendidikanTerakhir, data.nomorHp, data.email, data.alamat, data.password || "", data.role, data.statusAktif ? 1 : 0, data.createdAt, data.updatedAt]
  );
  return data;
}
async function updatePegawai(id, updates) {
  const setClauses = [];
  const args = [];
  for (const [key, val] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    setClauses.push(`${col} = ?`);
    args.push(key === "statusAktif" ? val ? 1 : 0 : val);
  }
  args.push(id);
  await query(`UPDATE pegawai SET ${setClauses.join(", ")}, updated_at = datetime('now') WHERE id = ?`, args);
}
async function listArsipByPegawai(pegawaiId) {
  const r = await query("SELECT * FROM arsip WHERE pegawai_id = ? AND deleted = 0 ORDER BY updated_at DESC", [pegawaiId]);
  if (!r) return [];
  return r.rows.map(mapArsipRow);
}
async function getArsip(id) {
  const r = await query("SELECT * FROM arsip WHERE id = ?", [id]);
  if (!r || r.rows.length === 0) return null;
  return mapArsipRow(r.rows[0]);
}
async function createArsip(data) {
  await query(
    `INSERT INTO arsip (id, pegawai_id, nip, nik, nama_pegawai, instansi_id, nama_instansi, kelompok_arsip, jenis_dokumen, nama_dokumen, nomor_dokumen, tanggal_dokumen, tahun, file_name, file_type, file_size, storage_path, download_url, status_validasi, deleted, uploaded_at, updated_at, uploaded_by, updated_by, version_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.pegawaiId, data.nip, data.nik, data.namaPegawai, data.instansiId, data.namaInstansi, data.kelompokArsip, data.jenisDokumen, data.namaDokumen, data.nomorDokumen, data.tanggalDokumen, data.tahun, data.fileName, data.fileType, data.fileSize, data.storagePath, data.downloadUrl, data.statusValidasi, data.deleted ? 1 : 0, data.uploadedAt, data.updatedAt, data.uploadedBy, data.updatedBy, JSON.stringify(data.versionHistory || [])]
  );
  return data;
}
async function updateArsip(id, updates) {
  const setClauses = [];
  const args = [];
  for (const [key, val] of Object.entries(updates)) {
    const col = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    if (key === "versionHistory") {
      setClauses.push(`${col} = ?`);
      args.push(JSON.stringify(val));
    } else if (key === "deleted") {
      setClauses.push(`${col} = ?`);
      args.push(val ? 1 : 0);
    } else {
      setClauses.push(`${col} = ?`);
      args.push(val);
    }
  }
  args.push(id);
  await query(`UPDATE arsip SET ${setClauses.join(", ")}, updated_at = datetime('now') WHERE id = ?`, args);
}
async function listArsipAdmin(instansiId) {
  let sql = "SELECT * FROM arsip WHERE deleted = 0";
  const args = [];
  if (instansiId) {
    sql += " AND instansi_id = ?";
    args.push(instansiId);
  }
  sql += " ORDER BY updated_at DESC";
  const r = await query(sql, args.length > 0 ? args : void 0);
  if (!r) return [];
  return r.rows.map(mapArsipRow);
}
async function createLog(data) {
  await query(
    `INSERT INTO logs (id, tanggal, user_id, pegawai_id, nip, nama_pegawai, role, aksi, detail, arsip_id, nama_dokumen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.id, data.tanggal, data.userId, data.pegawaiId, data.nip, data.namaPegawai, data.role, data.aksi, data.detail, data.arsipId || null, data.namaDokumen || null]
  );
}
async function listLogs() {
  const r = await query("SELECT * FROM logs ORDER BY tanggal DESC LIMIT 200");
  if (!r) return [];
  return r.rows.map(mapRow);
}
async function getSetting(key) {
  const r = await query("SELECT value FROM settings WHERE key = ?", [key]);
  if (!r || r.rows.length === 0) return null;
  return r.rows[0].value;
}
async function setSetting(key, value) {
  await query("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
}
async function listKategori() {
  const r = await query("SELECT * FROM kategori_arsip ORDER BY urutan");
  if (!r) return [];
  return r.rows.map(mapRow);
}
async function listJenisDokumen() {
  const r = await query("SELECT * FROM jenis_dokumen ORDER BY urutan");
  if (!r) return [];
  return r.rows.map(mapRow);
}
async function setPegawaiPassword(id, hashed) {
  await query("UPDATE pegawai SET password = ? WHERE id = ?", [hashed, id]);
}
async function seedDefaultPasswords() {
  const defaultPass = await bcrypt.hash("12345678", 10);
  for (const id of ["PGW001", "PGW002", "PGW003", "PGW004"]) {
    const r = await query("SELECT id, password FROM pegawai WHERE id = ?", [id]);
    if (r && r.rows.length > 0 && !r.rows[0].password) {
      await query("UPDATE pegawai SET password = ? WHERE id = ?", [defaultPass, id]);
    }
  }
}
async function ensureSuperAdmin() {
  const existing = await query("SELECT id FROM pegawai WHERE id = ?", ["PGW004"]);
  if (existing && existing.rows.length > 0) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const defaultPass = await bcrypt.hash("12345678", 10);
  await query(
    `INSERT INTO pegawai (id, instansi_id, nama_instansi, nama_pegawai, nip, nik, tanggal_lahir, jenis_kelamin, jabatan, status_pegawai, pangkat_golongan, pendidikan_terakhir, nomor_hp, email, alamat, password, role, status_aktif, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ["PGW004", "INST002", "Kantor Kepegawaian Daerah Cirebon", "Doni Prasetyo", "199208152015031004", "3209876543210002", "1992-08-15", "Laki-laki", "Admin Database", "PNS", "Penata Muda / III.a", "D3", "085678912345", "doni.prasetyo@asn.id", "Perum Cipta Asri No. 7, Kesambi, Cirebon", defaultPass, "super_admin", 1, now, now]
  );
}
var url, authToken, isConfigured, client;
var init_turso = __esm({
  "lib/turso.ts"() {
    "use strict";
    url = process.env.TURSO_DATABASE_URL;
    authToken = process.env.TURSO_AUTH_TOKEN;
    isConfigured = !!(url && authToken);
    client = null;
  }
});

// lib/firebaseAdmin.ts
async function init() {
  if (hasAdminCreds) {
    try {
      const mod = await import("firebase-admin");
      const admin = mod.default || mod;
      const certPrivateKey = privateKey.replace(/\\n/g, "\n").replace(/"/g, "");
      if (!admin.apps || !admin.apps.length) {
        app = admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey: certPrivateKey }),
          storageBucket: storageBucket || `${projectId}.appspot.com`
        });
      } else {
        app = admin.apps[0];
      }
      db = admin.firestore();
      try {
        bucket = admin.storage().bucket();
      } catch {
      }
      console.log("Firebase Admin SDK initialized.");
    } catch (error) {
      console.error("Admin SDK init failed:", error?.message || error);
    }
  }
  if (!db && hasClientCreds) {
    try {
      const compat = await import("firebase/compat/app");
      await import("firebase/compat/firestore");
      const firebase = compat.default || compat;
      const config = { apiKey, authDomain, projectId, messagingSenderId, appId };
      if (storageBucket) config.storageBucket = storageBucket;
      app = firebase.initializeApp(config);
      db = app.firestore();
      console.log("Firebase Client SDK (compat) initialized. Storage falls back to local.");
    } catch (error) {
      console.error("Client SDK init failed, will use local DB:", error?.message || error);
    }
  }
}
var app, db, bucket, projectId, clientEmail, privateKey, storageBucket, apiKey, authDomain, messagingSenderId, appId, hasAdminCreds, hasClientCreds, isFirebaseConfigured;
var init_firebaseAdmin = __esm({
  "lib/firebaseAdmin.ts"() {
    "use strict";
    app = null;
    db = null;
    bucket = null;
    projectId = process.env.FIREBASE_PROJECT_ID;
    clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    privateKey = process.env.FIREBASE_PRIVATE_KEY;
    storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
    apiKey = process.env.FIREBASE_API_KEY;
    authDomain = process.env.FIREBASE_AUTH_DOMAIN;
    messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID;
    appId = process.env.FIREBASE_APP_ID;
    hasAdminCreds = !!(projectId && clientEmail && privateKey);
    hasClientCreds = !!(apiKey && projectId);
    isFirebaseConfigured = hasAdminCreds || hasClientCreds;
    if (isFirebaseConfigured) {
      init().catch((e) => console.error("Firebase init error:", e));
    }
  }
});

// lib/constants.ts
var constants_exports = {};
__export(constants_exports, {
  STATIC_JENIS_DOKUMEN: () => STATIC_JENIS_DOKUMEN,
  STATIC_KATEGORI: () => STATIC_KATEGORI
});
var STATIC_KATEGORI, STATIC_JENIS_DOKUMEN;
var init_constants = __esm({
  "lib/constants.ts"() {
    "use strict";
    STATIC_KATEGORI = [
      { id: "KAT1", namaKategori: "Riwayat Karier", urutan: 1, statusAktif: true },
      { id: "KAT2", namaKategori: "Pendidikan", urutan: 2, statusAktif: true },
      { id: "KAT3", namaKategori: "Kinerja", urutan: 3, statusAktif: true },
      { id: "KAT4", namaKategori: "Data Pribadi", urutan: 4, statusAktif: true },
      { id: "KAT5", namaKategori: "Kesehatan dan Disiplin", urutan: 5, statusAktif: true }
    ];
    STATIC_JENIS_DOKUMEN = [
      // Riwayat Karier
      { id: "JD1_1", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK CPNS/PNS", wajib: false, berlakuUntuk: "PNS", statusAktif: true },
      { id: "JD1_2", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK PPPK", wajib: false, berlakuUntuk: "PPPK", statusAktif: true },
      { id: "JD1_3", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK Kenaikan Pangkat", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD1_4", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK Jabatan", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD1_5", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK Mutasi", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD1_6", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK Penempatan", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD1_7", kategoriId: "KAT1", namaKategori: "Riwayat Karier", namaDokumen: "SK Pembagian Tugas", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      // Pendidikan
      { id: "JD2_1", kategoriId: "KAT2", namaKategori: "Pendidikan", namaDokumen: "Ijazah", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD2_2", kategoriId: "KAT2", namaKategori: "Pendidikan", namaDokumen: "Transkrip Nilai", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD2_3", kategoriId: "KAT2", namaKategori: "Pendidikan", namaDokumen: "Sertifikat Pendidik", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD2_4", kategoriId: "KAT2", namaKategori: "Pendidikan", namaDokumen: "Sertifikat Pelatihan/Diklat", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD2_5", kategoriId: "KAT2", namaKategori: "Pendidikan", namaDokumen: "Sertifikat Workshop/Seminar", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      // Kinerja
      { id: "JD3_1", kategoriId: "KAT3", namaKategori: "Kinerja", namaDokumen: "SKP", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD3_2", kategoriId: "KAT3", namaKategori: "Kinerja", namaDokumen: "Rekap Absensi", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD3_3", kategoriId: "KAT3", namaKategori: "Kinerja", namaDokumen: "Penilaian Kinerja", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD3_4", kategoriId: "KAT3", namaKategori: "Kinerja", namaDokumen: "Laporan Kinerja", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      // Data Pribadi
      { id: "JD4_1", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "KTP", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_2", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Kartu Keluarga", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_3", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "NPWP", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_4", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "BPJS", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_5", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Surat Nikah", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_6", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Akta Anak", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_7", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Buku Rekening", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_8", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Daftar Riwayat Hidup", wajib: true, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD4_9", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Karpeg", wajib: false, berlakuUntuk: "PNS", statusAktif: true },
      { id: "JD4_10", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "Taspen", wajib: false, berlakuUntuk: "PNS", statusAktif: true },
      { id: "JD4_11", kategoriId: "KAT4", namaKategori: "Data Pribadi", namaDokumen: "KARIS/KARSU", wajib: false, berlakuUntuk: "PNS", statusAktif: true },
      // Kesehatan dan Disiplin
      { id: "JD5_1", kategoriId: "KAT5", namaKategori: "Kesehatan dan Disiplin", namaDokumen: "Surat Cuti", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD5_2", kategoriId: "KAT5", namaKategori: "Kesehatan dan Disiplin", namaDokumen: "Riwayat Kesehatan", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD5_3", kategoriId: "KAT5", namaKategori: "Kesehatan dan Disiplin", namaDokumen: "Surat Sakit", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD5_4", kategoriId: "KAT5", namaKategori: "Kesehatan dan Disiplin", namaDokumen: "SK Hukuman Disiplin", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD5_5", kategoriId: "KAT5", namaKategori: "Kesehatan dan Disiplin", namaDokumen: "Surat Teguran", wajib: false, berlakuUntuk: "Semua", statusAktif: true },
      { id: "JD5_6", kategoriId: "KAT5", namaKategori: "Kesehatan dan Disiplin", namaDokumen: "Berita Acara Pemeriksaan", wajib: false, berlakuUntuk: "Semua", statusAktif: true }
    ];
  }
});

// lib/firestore.ts
import * as fs from "fs";
import * as path from "path";
function readLocalDb() {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const projectPath = path.join(process.cwd(), "local-db.json");
    if (process.env.VERCEL === "1" && fs.existsSync(projectPath)) {
      try {
        fs.cpSync(projectPath, LOCAL_DB_PATH);
        const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
        return JSON.parse(content);
      } catch {
      }
    }
    const fresh = {
      instansi: [],
      pegawai: [],
      arsip: [],
      logs: [],
      settings: [],
      kategoriArsip: [],
      jenisDokumen: []
    };
    writeLocalDb(fresh);
    return fresh;
  }
  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading local database JSON:", err);
    return {
      instansi: [],
      pegawai: [],
      arsip: [],
      logs: [],
      settings: [],
      kategoriArsip: [],
      jenisDokumen: []
    };
  }
}
function writeLocalDb(data) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing local database JSON:", err);
  }
}
async function seedInitialDb() {
  const defaultInstansi = [
    {
      id: "INST001",
      namaInstansi: "SD Negeri 1 Lemahabang",
      alamat: "Jl. Raya Lemahabang",
      kecamatan: "Lemahabang",
      kabupaten: "Cirebon",
      statusAktif: true
    },
    {
      id: "INST002",
      namaInstansi: "Kantor Kepegawaian Daerah Cirebon",
      alamat: "Jl. Pemuda No. 12",
      kecamatan: "Kesambi",
      kabupaten: "Cirebon",
      statusAktif: true
    }
  ];
  const defaultPegawai = [
    {
      id: "PGW001",
      instansiId: "INST001",
      namaInstansi: "SD Negeri 1 Lemahabang",
      namaPegawai: "Ahmad Hidayat",
      nip: "198705122010012003",
      nik: "3209123456780001",
      tanggalLahir: "1987-05-12",
      jenisKelamin: "Laki-laki",
      jabatan: "Guru Kelas",
      statusPegawai: "PNS",
      pangkatGolongan: "Penata / III.c",
      pendidikanTerakhir: "S1",
      nomorHp: "081234567890",
      email: "ahmad.hidayat@asn.id",
      alamat: "Jl. Merdeka No. 4, Lemahabang, Cirebon",
      role: "pegawai",
      statusAktif: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "PGW002",
      instansiId: "INST001",
      namaInstansi: "SD Negeri 1 Lemahabang",
      namaPegawai: "Budi Santoso",
      nip: "198501012008011002",
      nik: "3209123456780002",
      tanggalLahir: "1985-01-01",
      jenisKelamin: "Laki-laki",
      jabatan: "Kepala Sekolah",
      statusPegawai: "PNS",
      pangkatGolongan: "Penata Tk. I / III.d",
      pendidikanTerakhir: "S2",
      nomorHp: "081398765432",
      email: "budi.santoso@asn.id",
      alamat: "Kompleks Gria Indah Blok C5, Cirebon",
      role: "admin_instansi",
      statusAktif: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "PGW003",
      instansiId: "INST002",
      namaInstansi: "Kantor Kepegawaian Daerah Cirebon",
      namaPegawai: "Citra Dewi Lestari",
      nip: "199003102014022001",
      nik: "3209876543210001",
      tanggalLahir: "1990-03-10",
      jenisKelamin: "Perempuan",
      jabatan: "Analis Kepegawaian",
      statusPegawai: "PNS",
      pangkatGolongan: "Penata Muda Tk. I / III.b",
      pendidikanTerakhir: "S1",
      nomorHp: "082134567891",
      email: "citra.dewi@asn.id",
      alamat: "Jl. Diponegoro No. 23, Kesambi, Cirebon",
      role: "admin_instansi",
      statusAktif: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const defaultSettings = [
    { key: "allowDeleteValid", value: "false", keterangan: "Mengizinkan pegawai mendelete dokumen yang sudah divalidasi" },
    { key: "limitSizeMB", value: "10", keterangan: "Ukuran file maks dalam satuan MB" }
  ];
  if (isFirebaseConfigured && db) {
    try {
      const instSnapshot = await db.collection("instansi").limit(1).get();
      if (instSnapshot.empty) {
        console.log("Seeding real Firestore database...");
        for (const i of defaultInstansi) {
          await db.collection("instansi").doc(i.id).set(i);
        }
        for (const p of defaultPegawai) {
          await db.collection("pegawai").doc(p.id).set(p);
          await db.collection("users").doc(p.id).set({
            id: p.id,
            pegawaiId: p.id,
            nip: p.nip,
            nik: p.nik,
            nama: p.namaPegawai,
            role: p.role,
            instansiId: p.instansiId,
            statusAktif: p.statusAktif,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
          });
        }
        for (const c of STATIC_KATEGORI) {
          await db.collection("kategoriArsip").doc(c.id).set(c);
        }
        for (const jd of STATIC_JENIS_DOKUMEN) {
          await db.collection("jenisDokumen").doc(jd.id).set(jd);
        }
        for (const s of defaultSettings) {
          await db.collection("settings").doc(s.key).set(s);
        }
        console.log("Real Firestore seed completed successfully.");
      }
    } catch (err) {
      console.error("Error seeding Firestore database:", err);
    }
  }
  const local = readLocalDb();
  if (local.instansi.length === 0) {
    console.log("Seeding local storage fallback DB...");
    local.instansi = defaultInstansi;
    local.pegawai = defaultPegawai;
    local.kategoriArsip = STATIC_KATEGORI;
    local.jenisDokumen = STATIC_JENIS_DOKUMEN;
    local.settings = defaultSettings;
    local.logs = [
      {
        id: "L0",
        tanggal: (/* @__PURE__ */ new Date()).toISOString(),
        userId: "SYSTEM",
        pegawaiId: "SYSTEM",
        nip: "000000",
        namaPegawai: "System Seeder",
        role: "admin_instansi",
        aksi: "SEED_DATA",
        detail: "Sistem berhasil melakukan seeding data awal."
      }
    ];
    writeLocalDb(local);
  }
}
async function getInstansiData(id) {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection("instansi").doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  const local = readLocalDb();
  return local.instansi.find((item) => item.id === id) || null;
}
async function listAllInstansi() {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection("instansi").get();
    return qs.docs.map((doc) => doc.data());
  }
  return readLocalDb().instansi;
}
async function getPegawaiData(id) {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection("pegawai").doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  const local = readLocalDb();
  return local.pegawai.find((item) => item.id === id) || null;
}
async function findPegawaiByCredentials(identifier, type, tanggalLahir) {
  if (isFirebaseConfigured && db) {
    if (type === "NIP" || type === "BOTH") {
      const qs = await db.collection("pegawai").where("nip", "==", identifier).where("tanggalLahir", "==", tanggalLahir).get();
      if (!qs.empty) return qs.docs[0].data();
    }
    if (type === "NIK" || type === "BOTH") {
      const qs = await db.collection("pegawai").where("nik", "==", identifier).where("tanggalLahir", "==", tanggalLahir).get();
      if (!qs.empty) return qs.docs[0].data();
    }
    return null;
  }
  const local = readLocalDb();
  const found = local.pegawai.find((p) => {
    let fieldMatch = false;
    if (type === "NIP" || type === "BOTH") {
      fieldMatch = fieldMatch || p.nip === identifier;
    }
    if (type === "NIK" || type === "BOTH") {
      fieldMatch = fieldMatch || p.nik === identifier;
    }
    return fieldMatch && p.tanggalLahir === tanggalLahir;
  });
  return found || null;
}
async function updatePegawaiData(id, updates) {
  if (isFirebaseConfigured && db) {
    await db.collection("pegawai").doc(id).update({
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const userDoc = await db.collection("users").doc(id).get();
    if (userDoc.exists) {
      await db.collection("users").doc(id).update({
        nama: updates.namaPegawai || userDoc.data()?.nama,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return getPegawaiData(id);
  }
  const local = readLocalDb();
  const list = local.pegawai;
  const index = list.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updatedPegawai = {
    ...list[index],
    ...updates,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  list[index] = updatedPegawai;
  writeLocalDb(local);
  return updatedPegawai;
}
async function listAllPegawai(instansiId) {
  if (isFirebaseConfigured && db) {
    let q = db.collection("pegawai");
    if (instansiId) {
      q = q.where("instansiId", "==", instansiId);
    }
    const qs = await q.get();
    return qs.docs.map((doc) => doc.data());
  }
  const local = readLocalDb();
  if (instansiId) {
    return local.pegawai.filter((p) => p.instansiId === instansiId);
  }
  return local.pegawai;
}
async function adminCreatePegawai(newPegawai) {
  if (isFirebaseConfigured && db) {
    await db.collection("pegawai").doc(newPegawai.id).set(newPegawai);
    await db.collection("users").doc(newPegawai.id).set({
      id: newPegawai.id,
      pegawaiId: newPegawai.id,
      nip: newPegawai.nip,
      nik: newPegawai.nik,
      nama: newPegawai.namaPegawai,
      role: newPegawai.role,
      instansiId: newPegawai.instansiId,
      statusAktif: newPegawai.statusAktif,
      createdAt: newPegawai.createdAt,
      updatedAt: newPegawai.updatedAt
    });
    return newPegawai;
  }
  const local = readLocalDb();
  local.pegawai.push(newPegawai);
  writeLocalDb(local);
  return newPegawai;
}
async function getKategoriList() {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection("kategoriArsip").orderBy("urutan", "asc").get();
    return qs.docs.map((doc) => doc.data());
  }
  return readLocalDb().kategoriArsip.sort((a, b) => a.urutan - b.urutan);
}
async function getJenisDokumenList() {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection("jenisDokumen").get();
    return qs.docs.map((doc) => doc.data());
  }
  return readLocalDb().jenisDokumen;
}
async function listArsipByPegawai2(pegawaiId) {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection("arsip").where("pegawaiId", "==", pegawaiId).where("deleted", "==", false).get();
    return qs.docs.map((doc) => doc.data());
  }
  const local = readLocalDb();
  return local.arsip.filter((a) => a.pegawaiId === pegawaiId && !a.deleted);
}
async function getArsipData(id) {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection("arsip").doc(id).get();
    return doc.exists ? doc.data() : null;
  }
  const local = readLocalDb();
  return local.arsip.find((item) => item.id === id) || null;
}
async function createArsipData(newArsip) {
  if (isFirebaseConfigured && db) {
    await db.collection("arsip").doc(newArsip.id).set(newArsip);
    return newArsip;
  }
  const local = readLocalDb();
  local.arsip.push(newArsip);
  writeLocalDb(local);
  return newArsip;
}
async function updateArsipData(id, updates) {
  if (isFirebaseConfigured && db) {
    await db.collection("arsip").doc(id).update({
      ...updates,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    return getArsipData(id);
  }
  const local = readLocalDb();
  const index = local.arsip.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updatedArsip = {
    ...local.arsip[index],
    ...updates,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  local.arsip[index] = updatedArsip;
  writeLocalDb(local);
  return updatedArsip;
}
async function listAllArsipAdmin(instansiId) {
  if (isFirebaseConfigured && db) {
    let q = db.collection("arsip").where("deleted", "==", false);
    if (instansiId) {
      q = q.where("instansiId", "==", instansiId);
    }
    const qs = await q.get();
    return qs.docs.map((doc) => doc.data());
  }
  const local = readLocalDb();
  let list = local.arsip.filter((item) => !item.deleted);
  if (instansiId) {
    list = list.filter((item) => item.instansiId === instansiId);
  }
  return list;
}
async function createLogEntry(log) {
  if (isFirebaseConfigured && db) {
    await db.collection("logs").doc(log.id).set(log);
    return log;
  }
  const local = readLocalDb();
  local.logs.unshift(log);
  if (local.logs.length > 1e3) {
    local.logs = local.logs.slice(0, 1e3);
  }
  writeLocalDb(local);
  return log;
}
async function getLogsData() {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection("logs").orderBy("tanggal", "desc").limit(200).get();
    return qs.docs.map((doc) => doc.data());
  }
  return readLocalDb().logs;
}
async function getSettingValue(key, defaultValue = "") {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection("settings").doc(key).get();
    if (doc.exists) {
      return doc.data()?.value || defaultValue;
    }
    return defaultValue;
  }
  const local = readLocalDb();
  const match = local.settings.find((s) => s.key === key);
  return match ? match.value : defaultValue;
}
async function updateSettingValue(key, value) {
  if (isFirebaseConfigured && db) {
    await db.collection("settings").doc(key).set({
      key,
      value,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, { merge: true });
    return;
  }
  const local = readLocalDb();
  const index = local.settings.findIndex((s) => s.key === key);
  if (index !== -1) {
    local.settings[index].value = value;
  } else {
    local.settings.push({ key, value, keterangan: "" });
  }
  writeLocalDb(local);
}
var LOCAL_DB_PATH;
var init_firestore = __esm({
  "lib/firestore.ts"() {
    "use strict";
    init_firebaseAdmin();
    init_constants();
    LOCAL_DB_PATH = process.env.VERCEL === "1" ? path.join("/tmp", "local-db.json") : path.join(process.cwd(), "local-db.json");
  }
});

// lib/data.ts
var data_exports = {};
__export(data_exports, {
  adminCreatePegawai: () => adminCreatePegawai2,
  createArsipData: () => createArsipData2,
  createLogEntry: () => createLogEntry2,
  findPegawaiByCredentials: () => findPegawaiByCredentials2,
  getArsipData: () => getArsipData2,
  getInstansiData: () => getInstansiData2,
  getJenisDokumenList: () => getJenisDokumenList2,
  getKategoriList: () => getKategoriList2,
  getLogsData: () => getLogsData2,
  getPegawaiData: () => getPegawaiData2,
  getSettingValue: () => getSettingValue2,
  listAllArsipAdmin: () => listAllArsipAdmin2,
  listAllInstansi: () => listAllInstansi2,
  listAllPegawai: () => listAllPegawai2,
  listArsipByPegawai: () => listArsipByPegawai3,
  readLocalDb: () => readLocalDb2,
  seedInitialDb: () => seedInitialDb2,
  setPegawaiPassword: () => setPegawaiPassword2,
  updateArsipData: () => updateArsipData2,
  updatePegawaiData: () => updatePegawaiData2,
  updateSettingValue: () => updateSettingValue2,
  writeLocalDb: () => writeLocalDb2
});
async function seedTurso() {
  await initSchema();
  console.log("Seeding Turso database...");
  const defaultInstansi = [
    { id: "INST001", namaInstansi: "SD Negeri 1 Lemahabang", alamat: "Jl. Raya Lemahabang", kecamatan: "Lemahabang", kabupaten: "Cirebon", statusAktif: true },
    { id: "INST002", namaInstansi: "Kantor Kepegawaian Daerah Cirebon", alamat: "Jl. Pemuda No. 12", kecamatan: "Kesambi", kabupaten: "Cirebon", statusAktif: true }
  ];
  for (const i of defaultInstansi) {
    try {
      await createInstansi(i);
    } catch (e) {
      console.error("Seed instansi error:", i.id, e?.message);
    }
  }
  console.log("Instansi seeded");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const defaultPegawai = [
    { id: "PGW001", instansiId: "INST001", namaInstansi: "SD Negeri 1 Lemahabang", namaPegawai: "Ahmad Hidayat", nip: "198705122010012003", nik: "3209123456780001", tanggalLahir: "1987-05-12", jenisKelamin: "Laki-laki", jabatan: "Guru Kelas", statusPegawai: "PNS", pangkatGolongan: "Penata / III.c", pendidikanTerakhir: "S1", nomorHp: "081234567890", email: "ahmad.hidayat@asn.id", alamat: "Jl. Merdeka No. 4, Lemahabang, Cirebon", role: "pegawai", statusAktif: true, createdAt: now, updatedAt: now },
    { id: "PGW002", instansiId: "INST001", namaInstansi: "SD Negeri 1 Lemahabang", namaPegawai: "Budi Santoso", nip: "198501012008011002", nik: "3209123456780002", tanggalLahir: "1985-01-01", jenisKelamin: "Laki-laki", jabatan: "Kepala Sekolah", statusPegawai: "PNS", pangkatGolongan: "Penata Tk. I / III.d", pendidikanTerakhir: "S2", nomorHp: "081398765432", email: "budi.santoso@asn.id", alamat: "Kompleks Gria Indah Blok C5, Cirebon", role: "admin_instansi", statusAktif: true, createdAt: now, updatedAt: now },
    { id: "PGW003", instansiId: "INST002", namaInstansi: "Kantor Kepegawaian Daerah Cirebon", namaPegawai: "Citra Dewi Lestari", nip: "199003102014022001", nik: "3209876543210001", tanggalLahir: "1990-03-10", jenisKelamin: "Perempuan", jabatan: "Analis Kepegawaian", statusPegawai: "PNS", pangkatGolongan: "Penata Muda Tk. I / III.b", pendidikanTerakhir: "S1", nomorHp: "082134567891", email: "citra.dewi@asn.id", alamat: "Jl. Diponegoro No. 23, Kesambi, Cirebon", role: "admin_instansi", statusAktif: true, createdAt: now, updatedAt: now },
    { id: "PGW004", instansiId: "INST002", namaInstansi: "Kantor Kepegawaian Daerah Cirebon", namaPegawai: "Doni Prasetyo", nip: "199208152015031004", nik: "3209876543210002", tanggalLahir: "1992-08-15", jenisKelamin: "Laki-laki", jabatan: "Admin Database", statusPegawai: "PNS", pangkatGolongan: "Penata Muda / III.a", pendidikanTerakhir: "D3", nomorHp: "085678912345", email: "doni.prasetyo@asn.id", alamat: "Perum Cipta Asri No. 7, Kesambi, Cirebon", role: "super_admin", statusAktif: true, createdAt: now, updatedAt: now }
  ];
  for (const p of defaultPegawai) {
    try {
      await createPegawai(p);
    } catch (e) {
      console.error("Seed pegawai error:", p.id, e?.message);
    }
  }
  console.log("Pegawai seeded");
  try {
    await ensureSuperAdmin();
  } catch (e) {
    console.error("Seed super_admin error:", e?.message);
  }
  await setSetting("app_nama", "Arsip Digital ASN");
  await setSetting("app_instansi", "Pemerintah Kabupaten Cirebon");
  await seedDefaultPasswords();
  console.log("Seeding complete");
}
async function seedInitialDb2() {
  if (isConfigured) {
    await seedTurso();
    return;
  }
  return seedInitialDb();
}
var getInstansiData2, listAllInstansi2, getPegawaiData2, findPegawaiByCredentials2, updatePegawaiData2, listAllPegawai2, adminCreatePegawai2, listArsipByPegawai3, getArsipData2, createArsipData2, updateArsipData2, listAllArsipAdmin2, createLogEntry2, getLogsData2, getSettingValue2, updateSettingValue2, getKategoriList2, getJenisDokumenList2, setPegawaiPassword2, readLocalDb2, writeLocalDb2;
var init_data = __esm({
  "lib/data.ts"() {
    "use strict";
    init_turso();
    init_turso();
    init_firestore();
    getInstansiData2 = isConfigured ? async (id) => {
      const d = await getInstansi(id);
      return d;
    } : getInstansiData;
    listAllInstansi2 = isConfigured ? () => listInstansi() : listAllInstansi;
    getPegawaiData2 = isConfigured ? async (id) => {
      const d = await getPegawai(id);
      return d;
    } : getPegawaiData;
    findPegawaiByCredentials2 = isConfigured ? async (identifier, type, _tanggalLahir) => {
      if (type === "NIP" || type === "BOTH") {
        const d = await findPegawaiByNipNikWithPassword(identifier, "NIP");
        if (d) return d;
      }
      if (type === "NIK" || type === "BOTH") {
        const d = await findPegawaiByNipNikWithPassword(identifier, "NIK");
        if (d) return d;
      }
      return null;
    } : findPegawaiByCredentials;
    updatePegawaiData2 = isConfigured ? async (id, updates) => {
      await updatePegawai(id, updates);
      return getPegawai(id);
    } : updatePegawaiData;
    listAllPegawai2 = isConfigured ? async (instansiId) => listPegawai(instansiId) : listAllPegawai;
    adminCreatePegawai2 = isConfigured ? async (data) => createPegawai(data) : adminCreatePegawai;
    listArsipByPegawai3 = isConfigured ? async (pegawaiId) => listArsipByPegawai(pegawaiId) : listArsipByPegawai2;
    getArsipData2 = isConfigured ? async (id) => getArsip(id) : getArsipData;
    createArsipData2 = isConfigured ? async (data) => createArsip(data) : createArsipData;
    updateArsipData2 = isConfigured ? async (id, updates) => {
      await updateArsip(id, updates);
      return getArsip(id);
    } : updateArsipData;
    listAllArsipAdmin2 = isConfigured ? async (instansiId) => listArsipAdmin(instansiId) : listAllArsipAdmin;
    createLogEntry2 = isConfigured ? async (data) => createLog(data) : createLogEntry;
    getLogsData2 = isConfigured ? async () => listLogs() : getLogsData;
    getSettingValue2 = isConfigured ? async (key, defaultValue) => {
      const v = await getSetting(key);
      return v !== null ? v : defaultValue || "";
    } : getSettingValue;
    updateSettingValue2 = isConfigured ? async (key, value) => setSetting(key, value) : updateSettingValue;
    getKategoriList2 = isConfigured ? async () => listKategori() : getKategoriList;
    getJenisDokumenList2 = isConfigured ? async () => listJenisDokumen() : getJenisDokumenList;
    setPegawaiPassword2 = isConfigured ? async (id, hashed) => setPegawaiPassword(id, hashed) : async (id, _hashed) => {
      console.warn("setPegawaiPassword not available (Firestore fallback)");
    };
    readLocalDb2 = readLocalDb;
    writeLocalDb2 = writeLocalDb;
  }
});

// api-build/handler.ts
import express from "express";
import path5 from "path";
import multer from "multer";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

// lib/session.ts
import jwt from "jsonwebtoken";
var SECRET_KEY = process.env.SESSION_SECRET;
if (!SECRET_KEY) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET wajib diatur di production!");
  }
  console.warn("SESSION_SECRET tidak diatur! Gunakan fallback default (hanya untuk development).");
}
var DEV_FALLBACK = "e_arsip_asn_dev_fallback_do_not_use_in_production";
var ACTIVE_KEY = SECRET_KEY || DEV_FALLBACK;
function signSession(data) {
  return jwt.sign(data, ACTIVE_KEY, { expiresIn: "7d" });
}
function verifySession(token) {
  try {
    const decoded = jwt.verify(token, ACTIVE_KEY);
    if (decoded && decoded.id) {
      return {
        id: decoded.id,
        pegawaiId: decoded.pegawaiId,
        nip: decoded.nip,
        nik: decoded.nik,
        nama: decoded.nama,
        role: decoded.role,
        instansiId: decoded.instansiId,
        namaInstansi: decoded.namaInstansi
      };
    }
  } catch {
    return null;
  }
  return null;
}

// api-build/handler.ts
init_data();

// routes/auth.ts
init_data();
import { Router } from "express";
import bcrypt2 from "bcryptjs";

// lib/validation.ts
import { z } from "zod";
var loginSchema = z.object({
  loginType: z.enum(["NIP", "NIK", "BOTH"]),
  identifier: z.string().regex(/^\d{16,18}$/, "NIP harus 18 digit atau NIK 16 digit.").refine((v) => v.length === 16 || v.length === 18, "NIP harus 18 digit atau NIK 16 digit."),
  password: z.string().min(1, "Password wajib diisi.")
});
var profileUpdateSchema = z.object({
  nomorHp: z.string().optional(),
  email: z.string().email("Format email tidak valid.").optional().or(z.literal("")),
  alamat: z.string().optional()
});
var arsipUploadSchema = z.object({
  kelompokArsip: z.string().min(1),
  jenisDokumen: z.string().min(1),
  namaDokumen: z.string().min(1),
  nomorDokumen: z.string().min(1),
  tanggalDokumen: z.string().min(1),
  tahun: z.string().min(4).max(4)
});
var validasiSchema = z.object({
  statusValidasi: z.enum(["Valid", "Perlu Perbaikan", "Ditolak"]),
  catatanAdmin: z.string().optional()
});
var createPegawaiSchema = z.object({
  namaPegawai: z.string().min(1, "Nama pegawai wajib diisi."),
  nip: z.string().regex(/^\d{18}$/, "NIP harus 18 digit angka."),
  nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit angka."),
  tanggalLahir: z.string().min(1, "Tanggal lahir wajib diisi."),
  statusPegawai: z.string().min(1, "Status pegawai wajib diisi."),
  jenisKelamin: z.string().optional(),
  jabatan: z.string().optional(),
  pangkatGolongan: z.string().optional(),
  pendidikanTerakhir: z.string().optional(),
  nomorHp: z.string().optional(),
  email: z.string().optional(),
  alamat: z.string().optional(),
  role: z.enum(["pegawai", "admin_instansi", "super_admin"]).optional(),
  instansiId: z.string().optional(),
  statusAktif: z.boolean().optional()
});
var settingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(0)
});

// routes/auth.ts
function createAuthRouter(requireAuth2, rateLimit2) {
  const router = Router();
  const loginLimiter = rateLimit2({
    windowMs: 15 * 60 * 1e3,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }
  });
  router.post("/login", loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Data login tidak valid." });
    }
    const { loginType, identifier, password } = parsed.data;
    try {
      const p = await findPegawaiByCredentials2(identifier, loginType);
      if (!p) {
        return res.status(401).json({ error: "NIP/NIK tidak ditemukan." });
      }
      if (!p.statusAktif) {
        return res.status(403).json({ error: "Akun pegawai tidak aktif. Silakan hubungi admin." });
      }
      const pwMatch = await bcrypt2.compare(password, p.password || "");
      if (!pwMatch) {
        return res.status(401).json({ error: "Password salah." });
      }
      await updatePegawaiData2(p.id, { loginTerakhir: (/* @__PURE__ */ new Date()).toISOString() });
      const sessionData = {
        id: p.id,
        pegawaiId: p.id,
        nip: p.nip,
        nik: p.nik,
        nama: p.namaPegawai,
        role: p.role,
        instansiId: p.instansiId,
        namaInstansi: p.namaInstansi
      };
      const token = signSession(sessionData);
      const isSecure = process.env.NODE_ENV === "production";
      res.setHeader("Set-Cookie", `session=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${isSecure ? "; Secure" : ""}`);
      const log = {
        id: "LOG_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
        tanggal: (/* @__PURE__ */ new Date()).toISOString(),
        userId: sessionData.id,
        pegawaiId: sessionData.pegawaiId,
        nip: sessionData.nip,
        namaPegawai: sessionData.nama,
        role: sessionData.role,
        aksi: "LOGIN",
        detail: `Pegawai dengan ${loginType} ${identifier} berhasil login.`
      };
      await createLogEntry2(log);
      return res.json({ message: "Login berhasil.", user: sessionData });
    } catch (err) {
      console.error("Login error:", err?.stack || err?.message || err);
      return res.status(500).json({ error: "Terjadi kesalahan pada server saat login." });
    }
  });
  router.post("/logout", requireAuth2, async (req, res) => {
    const session = req.session;
    const log = {
      id: "LOG_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
      tanggal: (/* @__PURE__ */ new Date()).toISOString(),
      userId: session.id,
      pegawaiId: session.pegawaiId,
      nip: session.nip,
      namaPegawai: session.nama,
      role: session.role,
      aksi: "LOGOUT",
      detail: `Pegawai ${session.nama} berhasil logout.`
    };
    await createLogEntry2(log);
    const isSecure = process.env.NODE_ENV === "production";
    res.setHeader("Set-Cookie", `session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${isSecure ? "; Secure" : ""}`);
    return res.json({ message: "Logout berhasil." });
  });
  router.get("/session", (req, res) => {
    const token = req.cookies?.session;
    if (!token) return res.json({ user: null });
    const session = verifySession(token);
    return res.json({ user: session });
  });
  return router;
}

// routes/pegawai.ts
init_data();
import { Router as Router2 } from "express";
function createPegawaiRouter(requireAuth2, logAction2) {
  const router = Router2();
  router.get("/me", requireAuth2, async (req, res) => {
    const session = req.session;
    try {
      const p = await getPegawaiData2(session.pegawaiId);
      if (!p) return res.status(404).json({ error: "Data pegawai tidak ditemukan." });
      return res.json(p);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil data profil." });
    }
  });
  router.patch("/me", requireAuth2, async (req, res) => {
    const session = req.session;
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "Data profil tidak valid." });
    }
    const { nomorHp, email, alamat } = parsed.data;
    try {
      const updates = {};
      if (nomorHp !== void 0) updates.nomorHp = nomorHp;
      if (email !== void 0) updates.email = email;
      if (alamat !== void 0) updates.alamat = alamat;
      const p = await updatePegawaiData2(session.pegawaiId, updates);
      await logAction2(session, "EDIT_PROFIL", `Pegawai memperbaharui data kontak: HP=${nomorHp}, Email=${email}.`);
      return res.json({ message: "Profil berhasil diperbarui.", data: p });
    } catch {
      return res.status(500).json({ error: "Gagal memperbarui data profil." });
    }
  });
  return router;
}
function createMetadataRouter(requireAuth2) {
  const router = Router2();
  router.get("/kategori", requireAuth2, async (_req, res) => {
    try {
      const list = await getKategoriList2();
      return res.json(list);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil kategori arsip." });
    }
  });
  router.get("/jenis-dokumen", requireAuth2, async (_req, res) => {
    try {
      const list = await getJenisDokumenList2();
      return res.json(list);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil jenis dokumen." });
    }
  });
  return router;
}

// routes/arsip.ts
init_data();
import { Router as Router3 } from "express";
import path3 from "path";

// lib/storage.ts
init_firebaseAdmin();
import * as fs2 from "fs";
import * as path2 from "path";
var LOCAL_STORAGE_DIR = process.env.VERCEL === "1" ? "/tmp/uploaded_files" : path2.join(process.cwd(), "uploaded_files");
try {
  if (!fs2.existsSync(LOCAL_STORAGE_DIR)) {
    fs2.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
} catch {
}
async function uploadFile(fileBuffer, fileName, mimeType, meta) {
  const cleanKelompok = meta.kelompokArsip.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const cleanJenis = meta.jenisDokumen.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const cleanNamaPegawai = meta.namaPegawai.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const timestamp = Date.now();
  const ext = path2.extname(fileName) || ".bin";
  const storagePath = `arsip-asn/${meta.instansiId}/${meta.pegawaiId}/${cleanKelompok}/${meta.tahun}_${cleanJenis}_${cleanNamaPegawai}_${timestamp}${ext}`;
  if (isFirebaseConfigured && bucket) {
    try {
      const file = bucket.file(storagePath);
      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType
        },
        resumable: false
      });
      const downloadUrl2 = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
      console.log(`Successfully uploaded file to GCS: ${storagePath}`);
      return { storagePath, downloadUrl: downloadUrl2 };
    } catch (err) {
      console.error("Error uploading file to Firebase Storage. Falling back to local FS storage.", err);
    }
  }
  const safePath = path2.join(LOCAL_STORAGE_DIR, storagePath);
  fs2.mkdirSync(path2.dirname(safePath), { recursive: true });
  fs2.writeFileSync(safePath, fileBuffer);
  const downloadUrl = `/api/files/download?path=${encodeURIComponent(storagePath)}`;
  console.log(`Successfully uploaded file to local filesystem: ${safePath}`);
  return { storagePath, downloadUrl };
}
async function deleteFile(storagePath) {
  if (isFirebaseConfigured && bucket) {
    try {
      const file = bucket.file(storagePath);
      await file.delete();
      console.log(`Successfully deleted file from GCS: ${storagePath}`);
      return true;
    } catch (err) {
      console.error("Error deleting file from Firebase GCS:", err);
    }
  }
  try {
    const safePath = path2.join(LOCAL_STORAGE_DIR, storagePath);
    if (fs2.existsSync(safePath)) {
      fs2.unlinkSync(safePath);
      console.log(`Successfully deleted file from local FS: ${safePath}`);
      return true;
    }
  } catch (err) {
    console.error("Error deleting file from local storage:", err);
  }
  return false;
}
function getLocalFileBuffer(storagePath) {
  try {
    const resolved = path2.resolve(LOCAL_STORAGE_DIR, storagePath);
    if (!resolved.startsWith(path2.resolve(LOCAL_STORAGE_DIR))) {
      console.error("Path traversal detected:", storagePath);
      return null;
    }
    if (resolved !== path2.normalize(resolved)) return null;
    const safePath = resolved;
    if (fs2.existsSync(safePath)) {
      const buffer = fs2.readFileSync(safePath);
      return {
        buffer,
        mimeType: getMimeTypeByExt(path2.extname(storagePath))
      };
    }
  } catch (err) {
    console.error("Failed to read local file:", err);
  }
  return null;
}
function getMimeTypeByExt(ext) {
  switch (ext.toLowerCase()) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

// routes/arsip.ts
var MIME_MAP = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
};
var ALLOWED_EXT = Object.keys(MIME_MAP);
function validateFile(reqFile) {
  const ext = path3.extname(reqFile.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return "Format berkas tidak diizinkan.";
  const expectedMimes = MIME_MAP[ext];
  if (expectedMimes && !expectedMimes.includes(reqFile.mimetype)) {
    return `Tipe berkas "${reqFile.mimetype}" tidak sesuai dengan ekstensi "${ext}".`;
  }
  return null;
}
function createArsipRouter(requireAuth2, upload, logAction2) {
  const router = Router3();
  router.get("/me", requireAuth2, async (req, res) => {
    const session = req.session;
    try {
      const list = await listArsipByPegawai3(session.pegawaiId);
      return res.json(list);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil dokumen arsip Anda." });
    }
  });
  router.post("/upload", requireAuth2, upload.single("file"), async (req, res) => {
    const session = req.session;
    if (!req.file) return res.status(400).json({ error: "Berkas dokumen wajib diupload." });
    if (req.file.size > 10 * 1024 * 1024) return res.status(400).json({ error: "Ukuran file melebihi batas 10 MB." });
    const parsed = arsipUploadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Semua metadata arsip wajib diisi." });
    const { kelompokArsip, jenisDokumen, namaDokumen, nomorDokumen, tanggalDokumen, tahun } = parsed.data;
    const fileErr = validateFile(req.file);
    if (fileErr) return res.status(400).json({ error: fileErr });
    try {
      const uploadDetails = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, {
        instansiId: session.instansiId,
        pegawaiId: session.pegawaiId,
        kelompokArsip,
        tahun,
        jenisDokumen,
        namaPegawai: session.nama
      });
      const newArsip = {
        id: "ARS_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
        pegawaiId: session.pegawaiId,
        nip: session.nip,
        nik: session.nik,
        namaPegawai: session.nama,
        instansiId: session.instansiId,
        namaInstansi: session.namaInstansi,
        kelompokArsip,
        jenisDokumen,
        namaDokumen,
        nomorDokumen,
        tanggalDokumen,
        tahun,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storagePath: uploadDetails.storagePath,
        downloadUrl: uploadDetails.downloadUrl,
        statusValidasi: "Menunggu Validasi",
        deleted: false,
        uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        uploadedBy: session.id,
        updatedBy: session.id,
        versionHistory: [{
          versionId: "V1",
          fileName: req.file.originalname,
          fileSize: req.file.size,
          downloadUrl: uploadDetails.downloadUrl,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedByNama: `${session.nama} (${session.role === "pegawai" ? "Pegawai" : "Admin"})`,
          statusValidasi: "Menunggu Validasi",
          nomorDokumen,
          tanggalDokumen,
          tahun,
          catatanAdmin: "",
          changeSummary: "Unggah berkas pertama"
        }]
      };
      const result = await createArsipData2(newArsip);
      await logAction2(session, "UPLOAD_ARSIP", `Berhasil mengunggah dokumen baru: ${jenisDokumen} (${namaDokumen})`, result.id, namaDokumen);
      return res.status(201).json({ message: "Arsip berhasil disimpan.", arsip: result });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Gagal menyimpan unggahan arsip." });
    }
  });
  router.patch("/:id", requireAuth2, upload.single("file"), async (req, res) => {
    const session = req.session;
    const { id } = req.params;
    const { kelompokArsip, jenisDokumen, namaDokumen, nomorDokumen, tanggalDokumen, tahun } = req.body;
    try {
      const existingArsip = await getArsipData2(id);
      if (!existingArsip) return res.status(404).json({ error: "Arsip tidak ditemukan." });
      if (session.role === "pegawai" && existingArsip.pegawaiId !== session.pegawaiId) {
        return res.status(403).json({ error: "Akses ditolak. Dokumen ini bukan milik Anda." });
      }
      const updates = { updatedBy: session.id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      if (kelompokArsip) updates.kelompokArsip = kelompokArsip;
      if (jenisDokumen) updates.jenisDokumen = jenisDokumen;
      if (namaDokumen) updates.namaDokumen = namaDokumen;
      if (nomorDokumen) updates.nomorDokumen = nomorDokumen;
      if (tanggalDokumen) updates.tanggalDokumen = tanggalDokumen;
      if (tahun) updates.tahun = tahun;
      if (req.file) {
        const fileErr = validateFile(req.file);
        if (fileErr) return res.status(400).json({ error: fileErr });
        if (existingArsip.storagePath) await deleteFile(existingArsip.storagePath);
        const uRes = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, {
          instansiId: existingArsip.instansiId || session.instansiId,
          pegawaiId: existingArsip.pegawaiId,
          kelompokArsip: kelompokArsip || existingArsip.kelompokArsip,
          tahun: tahun || existingArsip.tahun,
          jenisDokumen: jenisDokumen || existingArsip.jenisDokumen,
          namaPegawai: existingArsip.namaPegawai
        });
        updates.storagePath = uRes.storagePath;
        updates.downloadUrl = uRes.downloadUrl;
        updates.fileName = req.file.originalname;
        updates.fileType = req.file.mimetype;
        updates.fileSize = req.file.size;
        updates.statusValidasi = "Menunggu Validasi";
      }
      let history = existingArsip.versionHistory;
      if (!history || history.length === 0) {
        history = [{
          versionId: "V1",
          fileName: existingArsip.fileName,
          fileSize: existingArsip.fileSize,
          downloadUrl: existingArsip.downloadUrl,
          updatedAt: existingArsip.uploadedAt || existingArsip.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedByNama: `${existingArsip.namaPegawai} (Pegawai)`,
          statusValidasi: existingArsip.statusValidasi,
          nomorDokumen: existingArsip.nomorDokumen,
          tanggalDokumen: existingArsip.tanggalDokumen,
          tahun: existingArsip.tahun,
          catatanAdmin: existingArsip.catatanAdmin || "",
          changeSummary: "Unggah berkas pertama"
        }];
      }
      const nextVerNum = history.length + 1;
      const nextVersion = {
        versionId: `V${nextVerNum}`,
        fileName: updates.fileName || existingArsip.fileName,
        fileSize: updates.fileSize !== void 0 ? updates.fileSize : existingArsip.fileSize,
        downloadUrl: updates.downloadUrl || existingArsip.downloadUrl,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedByNama: `${session.nama} (${session.role === "pegawai" ? "Pegawai" : "Admin"})`,
        statusValidasi: updates.statusValidasi || existingArsip.statusValidasi,
        nomorDokumen: updates.nomorDokumen || existingArsip.nomorDokumen,
        tanggalDokumen: updates.tanggalDokumen || existingArsip.tanggalDokumen,
        tahun: updates.tahun || existingArsip.tahun,
        catatanAdmin: existingArsip.catatanAdmin || "",
        changeSummary: req.file ? "Pembaruan Berkas Dokumen & Detail" : "Pembaruan Detail Metadata Dokumen"
      };
      updates.versionHistory = [...history, nextVersion];
      const result = await updateArsipData2(id, updates);
      await logAction2(session, "EDIT_ARSIP", `Memperbarui detail arsip: ${existingArsip.jenisDokumen}`, id, namaDokumen || existingArsip.namaDokumen);
      return res.json({ message: "Arsip berhasil disunting.", arsip: result });
    } catch {
      return res.status(500).json({ error: "Gagal mengubah dokumen." });
    }
  });
  router.delete("/:id", requireAuth2, async (req, res) => {
    const session = req.session;
    const { id } = req.params;
    try {
      const existingArsip = await getArsipData2(id);
      if (!existingArsip) return res.status(404).json({ error: "Arsip tidak ditemukan." });
      if (session.role === "pegawai" && existingArsip.pegawaiId !== session.pegawaiId) {
        return res.status(403).json({ error: "Akses ditolak. Dokumen ini bukan milik Anda." });
      }
      if (existingArsip.statusValidasi === "Valid") {
        const allowDelete = await getSettingValue2("allowDeleteValid", "false");
        if (allowDelete !== "true") {
          return res.status(400).json({ error: "Dokumen yang telah berstatus VALID tidak diperbolehkan untuk dihapus pegawai." });
        }
      }
      await updateArsipData2(id, { deleted: true, statusValidasi: "Ditolak" });
      if (existingArsip.storagePath) await deleteFile(existingArsip.storagePath);
      await logAction2(session, "HAPUS_ARSIP", `Pegawai menghapus arsip: ${existingArsip.jenisDokumen}`, id, existingArsip.namaDokumen);
      return res.json({ message: "Arsip berhasil dihapus." });
    } catch {
      return res.status(500).json({ error: "Gagal melakukan penghapusan." });
    }
  });
  return router;
}

// routes/admin.ts
init_data();
import { Router as Router4 } from "express";
import bcrypt3 from "bcryptjs";
init_constants();
function createAdminRouter(requireAuth2, requireRole2, logAction2) {
  const router = Router4();
  router.get("/pegawai", requireAuth2, requireRole2(["admin_instansi", "super_admin"]), async (req, res) => {
    const session = req.session;
    const filterInstansi = req.query.instansiId;
    try {
      const targetInstansi = session.role === "admin_instansi" ? session.instansiId : filterInstansi;
      const employees = await listAllPegawai2(targetInstansi);
      return res.json(employees);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil data ASN." });
    }
  });
  router.post("/pegawai", requireAuth2, requireRole2(["super_admin", "admin_instansi"]), async (req, res) => {
    const session = req.session;
    const parsed = createPegawaiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Mohon isi seluruh data pegawai wajib." });
    const body = parsed.data;
    try {
      const existing = await findPegawaiByCredentials2(body.nip, "NIP");
      if (existing) return res.status(400).json({ error: "Pegawai dengan NIP tersebut sudah ada." });
      let instansiId = body.instansiId || "INST001";
      if (session.role === "admin_instansi") instansiId = session.instansiId;
      let instansiName = "Badan Kepegawaian Daerah";
      if (instansiId) {
        const ins = await getInstansiData2(instansiId);
        if (ins) instansiName = ins.namaInstansi;
      }
      const defaultPass = await bcrypt3.hash("12345678", 10);
      const p = {
        id: "PGW_" + Date.now(),
        instansiId,
        namaInstansi: instansiName,
        namaPegawai: body.namaPegawai,
        nip: body.nip,
        nik: body.nik,
        tanggalLahir: body.tanggalLahir,
        jenisKelamin: body.jenisKelamin === "Perempuan" ? "Perempuan" : "Laki-laki",
        jabatan: body.jabatan || "Staf Kepegawaian",
        statusPegawai: body.statusPegawai || "PNS",
        pangkatGolongan: body.pangkatGolongan || "Penata / III.c",
        pendidikanTerakhir: body.pendidikanTerakhir || "S1",
        nomorHp: body.nomorHp || "",
        email: body.email || "",
        alamat: body.alamat || "",
        password: defaultPass,
        role: body.role === "admin_instansi" || body.role === "super_admin" ? body.role : "pegawai",
        statusAktif: body.statusAktif !== void 0 ? body.statusAktif : true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const result = await adminCreatePegawai2(p);
      await logAction2(session, "CREATE_PEGAWAI", `Administrator (${session.nama}) mendaftarkan pegawai baru: ${body.namaPegawai} (${body.nip})`);
      return res.status(201).json(result);
    } catch {
      return res.status(500).json({ error: "Gagal membuat data pegawai baru." });
    }
  });
  router.get("/arsip", requireAuth2, requireRole2(["admin_instansi", "super_admin"]), async (req, res) => {
    const session = req.session;
    const filterInstansi = req.query.instansiId;
    try {
      const targetInstansi = session.role === "admin_instansi" ? session.instansiId : filterInstansi;
      const archives = await listAllArsipAdmin2(targetInstansi);
      return res.json(archives);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil arsip." });
    }
  });
  router.patch("/arsip/:id/validasi", requireAuth2, requireRole2(["admin_instansi", "super_admin"]), async (req, res) => {
    const session = req.session;
    const { id } = req.params;
    const parsed = validasiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Status validasi tidak valid." });
    const { statusValidasi, catatanAdmin } = parsed.data;
    try {
      const arc = await getArsipData2(id);
      if (!arc) return res.status(404).json({ error: "Dokumen arsip tidak ditemukan." });
      if (session.role === "admin_instansi" && arc.instansiId !== session.instansiId) {
        return res.status(403).json({ error: "Akses ditolak. Anda tidak berhak memvalidasi dokumen di luar instansi Anda." });
      }
      let history = arc.versionHistory;
      if (!history || history.length === 0) {
        history = [{
          versionId: "V1",
          fileName: arc.fileName,
          fileSize: arc.fileSize,
          downloadUrl: arc.downloadUrl,
          updatedAt: arc.uploadedAt || arc.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
          updatedByNama: `${arc.namaPegawai} (Pegawai)`,
          statusValidasi: arc.statusValidasi,
          nomorDokumen: arc.nomorDokumen,
          tanggalDokumen: arc.tanggalDokumen,
          tahun: arc.tahun,
          catatanAdmin: arc.catatanAdmin || "",
          changeSummary: "Unggah berkas pertama"
        }];
      }
      const nextVersion = {
        versionId: `V${history.length + 1}`,
        fileName: arc.fileName,
        fileSize: arc.fileSize,
        downloadUrl: arc.downloadUrl,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedByNama: `${session.nama} (Admin)`,
        statusValidasi,
        nomorDokumen: arc.nomorDokumen,
        tanggalDokumen: arc.tanggalDokumen,
        tahun: arc.tahun,
        catatanAdmin: catatanAdmin || "",
        changeSummary: `Verifikasi & Evaluasi: ${statusValidasi}`
      };
      const updates = { statusValidasi, catatanAdmin: catatanAdmin || "", updatedAt: (/* @__PURE__ */ new Date()).toISOString(), updatedBy: session.id, versionHistory: [...history, nextVersion] };
      const result = await updateArsipData2(id, updates);
      await logAction2(session, "VALIDASI_ARSIP", `Mengevaluasi arsip pegawai (${arc.namaPegawai} - ${arc.jenisDokumen}): Status BARU=${statusValidasi}. Catatan: ${catatanAdmin || "tidak ada."}`, id, arc.namaDokumen);
      return res.json({ message: "Status validasi berhasil diperbarui.", arsip: result });
    } catch {
      return res.status(500).json({ error: "Gagal memproses validasi." });
    }
  });
  router.get("/rekap", requireAuth2, requireRole2(["admin_instansi", "super_admin"]), async (req, res) => {
    const session = req.session;
    const filterInstansi = req.query.instansiId;
    try {
      const targetInstansi = session.role === "admin_instansi" ? session.instansiId : filterInstansi;
      const pegawais = await listAllPegawai2(targetInstansi);
      const archives = await listAllArsipAdmin2(targetInstansi);
      const statistics = pegawais.map((p) => {
        const staffArchs = archives.filter((a) => a.pegawaiId === p.id);
        const mandatoryDocs = STATIC_JENIS_DOKUMEN.filter((doc) => doc.wajib && (doc.berlakuUntuk === "Semua" || doc.berlakuUntuk === p.statusPegawai));
        const validCount = staffArchs.filter((a) => a.statusValidasi === "Valid").length;
        const pendingCount = staffArchs.filter((a) => a.statusValidasi === "Menunggu Validasi").length;
        const reviseCount = staffArchs.filter((a) => a.statusValidasi === "Perlu Perbaikan").length;
        const uploadedMandatory = mandatoryDocs.filter((m) => staffArchs.some((a) => a.jenisDokumen === m.namaDokumen && a.statusValidasi === "Valid")).length;
        const totalWajib = mandatoryDocs.length;
        const pctKelengkapan = totalWajib > 0 ? Math.round(uploadedMandatory / totalWajib * 100) : 100;
        return {
          pegawaiId: p.id,
          namaPegawai: p.namaPegawai,
          nip: p.nip,
          jabatan: p.jabatan,
          instansiId: p.instansiId,
          namaInstansi: p.namaInstansi,
          statusPegawai: p.statusPegawai,
          jumlahArsipUploaded: staffArchs.length,
          jumlahArsipValid: validCount,
          jumlahArsipPending: pendingCount,
          jumlahArsipPerbaikan: reviseCount,
          jumlahWajib: totalWajib,
          jumlahWajibValid: uploadedMandatory,
          persentaseKelengkapan: pctKelengkapan
        };
      });
      return res.json(statistics);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil data rekap kelengkapan." });
    }
  });
  router.get("/logs", requireAuth2, requireRole2(["admin_instansi", "super_admin"]), async (req, res) => {
    const session = req.session;
    try {
      const list = await getLogsData2();
      if (session.role === "admin_instansi") {
        const targetPegawaiList = await listAllPegawai2(session.instansiId);
        const pIds = new Set(targetPegawaiList.map((p) => p.id));
        return res.json(list.filter((item) => pIds.has(item.pegawaiId) || item.userId === session.id));
      }
      return res.json(list);
    } catch {
      return res.status(500).json({ error: "Gagal mengambil riwayat sistem (logs)." });
    }
  });
  router.get("/instansi", requireAuth2, requireRole2(["super_admin", "admin_instansi"]), async (_req, res) => {
    try {
      const list = await listAllInstansi2();
      return res.json(list);
    } catch {
      return res.status(500).json({ error: "Gagal memuat daftar instansi." });
    }
  });
  router.get("/settings", requireAuth2, requireRole2(["super_admin", "admin_instansi"]), async (_req, res) => {
    try {
      const allowDeleteValue = await getSettingValue2("allowDeleteValid", "false");
      const limitSizeMBValue = await getSettingValue2("limitSizeMB", "10");
      return res.json([
        { key: "allowDeleteValid", value: allowDeleteValue, keterangan: "Mengizinkan pegawai menghapus dokumen yang bersetatus VALID." },
        { key: "limitSizeMB", value: limitSizeMBValue, keterangan: "Batas ukuran file maksimal di sistem (Satuan MB)." }
      ]);
    } catch {
      return res.status(500).json({ error: "Gagal memanggil pengaturan." });
    }
  });
  router.patch("/settings", requireAuth2, requireRole2(["super_admin", "admin_instansi"]), async (req, res) => {
    const parsed = settingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Konfigurasi kunci dan nilai wajib dilampirkan." });
    const { key, value } = parsed.data;
    try {
      await updateSettingValue2(key, String(value));
      return res.json({ message: "Pengaturan berhasil diperbaharui." });
    } catch {
      return res.status(500).json({ error: "Gagal menyimpan konfigurasi." });
    }
  });
  router.patch("/pegawai/:id/reset-password", requireAuth2, requireRole2(["super_admin", "admin_instansi"]), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password baru minimal 6 karakter." });
    }
    try {
      const hashed = await bcrypt3.hash(newPassword, 10);
      await setPegawaiPassword2(id, hashed);
      return res.json({ message: "Password berhasil direset." });
    } catch {
      return res.status(500).json({ error: "Gagal mereset password." });
    }
  });
  return router;
}

// routes/files.ts
import { Router as Router5 } from "express";
import path4 from "path";
function createFilesRouter(requireAuth2) {
  const router = Router5();
  router.get("/download", requireAuth2, (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: "Path file tidak ditentukan." });
    const session = req.session;
    const pathParts = filePath.split("/");
    if (pathParts[0] === "arsip-asn") {
      const instansiId = pathParts[1];
      const pegawaiId = pathParts[2];
      if (session.role === "pegawai" && session.pegawaiId !== pegawaiId) {
        return res.status(403).json({ error: "Akses ditolak. Anda tidak berhak melihat dokumen pegawai lain." });
      }
      if (session.role === "admin_instansi" && session.instansiId !== instansiId) {
        return res.status(403).json({ error: "Akses ditolak. Anda tidak berhak melihat dokumen di luar instansi Anda." });
      }
    }
    const result = getLocalFileBuffer(filePath);
    if (!result) return res.status(404).json({ error: "Berkas dokumen tidak ditemukan di server." });
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${path4.basename(filePath)}"`);
    res.send(result.buffer);
  });
  return router;
}

// api-build/handler.ts
function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Akses ditolak. Silakan login terlebih dahulu." });
  const session = verifySession(token);
  if (!session) {
    res.setHeader("Set-Cookie", "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure");
    return res.status(401).json({ error: "Sesi Anda telah berakhir. Silakan login kembali." });
  }
  req.session = session;
  next();
}
function requireRole(roles) {
  return (req, res, next) => {
    const session = req.session;
    if (!session || !roles.includes(session.role)) return res.status(403).json({ error: "Akses ditolak." });
    next();
  };
}
async function logAction(session, aksi, detail, arsipId, namaDokumen) {
  await createLogEntry2({
    id: "LOG_" + Date.now() + "_" + Math.floor(Math.random() * 1e3),
    tanggal: (/* @__PURE__ */ new Date()).toISOString(),
    userId: session.id,
    pegawaiId: session.pegawaiId,
    nip: session.nip,
    namaPegawai: session.nama,
    role: session.role,
    aksi,
    detail,
    arsipId,
    namaDokumen
  });
}
var appInstance = null;
var seedingPromise = null;
async function handler(req, res) {
  if (!seedingPromise) {
    seedingPromise = seedInitialDb2().catch((err) => console.error("Seed initial DB error:", err));
  }
  await seedingPromise;
  try {
    if (!appInstance) {
      const app2 = express();
      app2.set("trust proxy", 1);
      app2.use(express.json({ limit: "50mb" }));
      app2.use(express.urlencoded({ extended: true, limit: "50mb" }));
      app2.use(cookieParser());
      const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
      const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1e3,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Terlalu banyak permintaan. Coba lagi dalam 15 menit." }
      });
      const strictLimiter = rateLimit({
        windowMs: 60 * 1e3,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." }
      });
      app2.use("/api/", generalLimiter);
      app2.use("/api/auth/login", strictLimiter);
      app2.use("/api/auth", createAuthRouter(requireAuth, rateLimit));
      app2.use("/api", createMetadataRouter(requireAuth));
      app2.use("/api/pegawai", createPegawaiRouter(requireAuth, logAction));
      app2.use("/api/arsip", createArsipRouter(requireAuth, upload, logAction));
      app2.use("/api/admin", createAdminRouter(requireAuth, requireRole, logAction));
      app2.use("/api/files", createFilesRouter(requireAuth));
      app2.get("/api/kelengkapan/me", requireAuth, async (req2, res2) => {
        const session = req2.session;
        try {
          const { getPegawaiData: getPegawaiData3, listArsipByPegawai: listArsipByPegawai4 } = await Promise.resolve().then(() => (init_data(), data_exports));
          const { STATIC_JENIS_DOKUMEN: STATIC_JENIS_DOKUMEN2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
          const userPegawai = await getPegawaiData3(session.pegawaiId);
          if (!userPegawai) return res2.status(404).json({ error: "Data tidak ditemukan." });
          const uploads = await listArsipByPegawai4(session.pegawaiId);
          return res2.json(STATIC_JENIS_DOKUMEN2.map((doc) => {
            const m = uploads.find((u) => u.jenisDokumen === doc.namaDokumen);
            const p = doc.berlakuUntuk === "Semua" || doc.berlakuUntuk === userPegawai.statusPegawai;
            return { id: doc.id, namaDokumen: doc.namaDokumen, status: m ? m.statusValidasi : "Belum Upload", wajib: doc.wajib && p };
          }));
        } catch (err) {
          console.error("Rekap error:", err?.message || err);
          return res2.status(500).json({ error: "Gagal memuat rekap." });
        }
      });
      const distPath = path5.join(process.cwd(), "dist");
      app2.use(express.static(distPath));
      app2.get("*", (_req, res2) => res2.sendFile(path5.join(distPath, "index.html")));
      appInstance = app2;
    }
    return new Promise((resolve2, reject) => {
      res.on("finish", resolve2);
      res.on("error", reject);
      appInstance(req, res);
    });
  } catch (err) {
    console.error("Handler error:", err?.stack || err?.message);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Terjadi kesalahan server.", detail: err?.message || "unknown" }));
  }
}
export {
  handler as default
};
