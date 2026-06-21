import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { Instansi, Pegawai, KategoriArsip, JenisDokumen, Arsip, Log, Setting } from '../src/types';
import { STATIC_KATEGORI, STATIC_JENIS_DOKUMEN } from './constants';
import { isVercelBlobConfigured, storeJsonToBlob, fetchJsonFromBlob } from './vercelBlob';

const LOCAL_DB_PATH = process.env.VERCEL === '1'
  ? path.join('/tmp', 'local-db.json')
  : path.join(process.cwd(), 'local-db.json');

interface LocalDB {
  instansi: Instansi[];
  pegawai: Pegawai[];
  arsip: Arsip[];
  logs: Log[];
  settings: Setting[];
  kategoriArsip: KategoriArsip[];
  jenisDokumen: JenisDokumen[];
}

export function readLocalDb(): LocalDB {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    const projectPath = path.join(process.cwd(), 'local-db.json');
    if (process.env.VERCEL === '1' && fs.existsSync(projectPath)) {
      try {
        fs.cpSync(projectPath, LOCAL_DB_PATH);
        const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
        return JSON.parse(content);
      } catch { }
    }
    const fresh: LocalDB = {
      instansi: [], pegawai: [], arsip: [], logs: [], settings: [], kategoriArsip: [], jenisDokumen: []
    };
    writeLocalDb(fresh);
    return fresh;
  }
  try {
    const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { instansi: [], pegawai: [], arsip: [], logs: [], settings: [], kategoriArsip: [], jenisDokumen: [] };
  }
}

export function writeLocalDb(data: LocalDB) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local database JSON:', err);
  }
  if (isVercelBlobConfigured) {
    storeJsonToBlob('local-db', data).catch(() => {});
  }
}

export async function readLocalDbAsync(): Promise<LocalDB> {
  const local = readLocalDb();
  if (local.instansi.length > 0) return local;
  if (isVercelBlobConfigured) {
    try {
      const blobData = await fetchJsonFromBlob('local-db');
      if (blobData && blobData.instansi?.length > 0) {
        writeLocalDb(blobData);
        return blobData;
      }
    } catch {}
  }
  return local;
}

export async function seedInitialDb() {
  const defaultInstansi: Instansi[] = [
    { id: 'INST001', namaInstansi: 'SD Negeri 1 Lemahabang', alamat: 'Jl. Raya Lemahabang', kecamatan: 'Lemahabang', kabupaten: 'Cirebon', statusAktif: true },
    { id: 'INST002', namaInstansi: 'Kantor Kepegawaian Daerah Cirebon', alamat: 'Jl. Pemuda No. 12', kecamatan: 'Kesambi', kabupaten: 'Cirebon', statusAktif: true },
  ];

  const defaultPegawai: Pegawai[] = [
    { id: 'PGW001', instansiId: 'INST001', namaInstansi: 'SD Negeri 1 Lemahabang', namaPegawai: 'Ahmad Hidayat', nip: '198705122010012003', nik: '3209123456780001', tanggalLahir: '1987-05-12', jenisKelamin: 'Laki-laki', jabatan: 'Guru Kelas', statusPegawai: 'PNS', pangkatGolongan: 'Penata / III.c', pendidikanTerakhir: 'S1', nomorHp: '081234567890', email: 'ahmad.hidayat@asn.id', alamat: 'Jl. Merdeka No. 4, Lemahabang, Cirebon', role: 'pegawai', statusAktif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'PGW002', instansiId: 'INST001', namaInstansi: 'SD Negeri 1 Lemahabang', namaPegawai: 'Budi Santoso', nip: '198501012008011002', nik: '3209123456780002', tanggalLahir: '1985-01-01', jenisKelamin: 'Laki-laki', jabatan: 'Kepala Sekolah', statusPegawai: 'PNS', pangkatGolongan: 'Penata Tk. I / III.d', pendidikanTerakhir: 'S2', nomorHp: '081398765432', email: 'budi.santoso@asn.id', alamat: 'Kompleks Gria Indah Blok C5, Cirebon', role: 'admin_instansi', statusAktif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'PGW003', instansiId: 'INST002', namaInstansi: 'Kantor Kepegawaian Daerah Cirebon', namaPegawai: 'Citra Dewi Lestari', nip: '199003102014022001', nik: '3209876543210001', tanggalLahir: '1990-03-10', jenisKelamin: 'Perempuan', jabatan: 'Analis Kepegawaian', statusPegawai: 'PNS', pangkatGolongan: 'Penata Muda Tk. I / III.b', pendidikanTerakhir: 'S1', nomorHp: '082134567891', email: 'citra.dewi@asn.id', alamat: 'Jl. Diponegoro No. 23, Kesambi, Cirebon', role: 'admin_instansi', statusAktif: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];

  const defaultSettings: Setting[] = [
    { key: 'allowDeleteValid', value: 'false', keterangan: 'Mengizinkan pegawai mendelete dokumen yang sudah divalidasi' },
    { key: 'limitSizeMB', value: '10', keterangan: 'Ukuran file maks dalam satuan MB' },
  ];

  const local = await readLocalDbAsync();
  if (local.instansi.length === 0) {
    console.log('Seeding local storage DB...');
    const pegawaiWithPass = await Promise.all(defaultPegawai.map(async (p) => {
      const pass = p.nip.slice(-6);
      const hashed = await bcrypt.hash(pass, 10);
      return { ...p, password: hashed };
    }));
    local.instansi = defaultInstansi;
    local.pegawai = pegawaiWithPass;
    local.kategoriArsip = STATIC_KATEGORI;
    local.jenisDokumen = STATIC_JENIS_DOKUMEN;
    local.settings = defaultSettings;
    local.logs = [{
      id: 'L0', tanggal: new Date().toISOString(), userId: 'SYSTEM', pegawaiId: 'SYSTEM', nip: '000000',
      namaPegawai: 'System Seeder', role: 'admin_instansi', aksi: 'SEED_DATA',
      detail: 'Sistem berhasil melakukan seeding data awal.'
    }];
    writeLocalDb(local);
  }
}

export async function getInstansiData(id: string): Promise<Instansi | null> {
  const local = readLocalDb();
  return local.instansi.find(item => item.id === id) || null;
}

export async function listAllInstansi(): Promise<Instansi[]> {
  return readLocalDb().instansi;
}

export async function getPegawaiData(id: string): Promise<Pegawai | null> {
  const local = readLocalDb();
  return local.pegawai.find(item => item.id === id) || null;
}

export async function findPegawaiByCredentials(
  identifier: string, type: 'NIP' | 'NIK' | 'BOTH'
): Promise<any> {
  const local = readLocalDb();
  return local.pegawai.find(p => {
    if (type === 'NIP' || type === 'BOTH') { if (p.nip === identifier) return true; }
    if (type === 'NIK' || type === 'BOTH') { if (p.nik === identifier) return true; }
    return false;
  }) || null;
}

export async function updatePegawaiData(id: string, updates: Partial<Pegawai>): Promise<Pegawai | null> {
  const local = readLocalDb();
  const index = local.pegawai.findIndex(p => p.id === id);
  if (index === -1) return null;
  const updated = { ...local.pegawai[index], ...updates, updatedAt: new Date().toISOString() };
  local.pegawai[index] = updated;
  writeLocalDb(local);
  return updated;
}

export async function deletePegawaiData(id: string): Promise<void> {
  const local = readLocalDb();
  const idx = local.pegawai.findIndex(p => p.id === id);
  if (idx !== -1) {
    local.pegawai[idx].statusAktif = false;
    local.pegawai[idx].updatedAt = new Date().toISOString();
    writeLocalDb(local);
  }
}

export async function listAllPegawai(instansiId?: string): Promise<Pegawai[]> {
  const local = readLocalDb();
  return instansiId ? local.pegawai.filter(p => p.instansiId === instansiId) : local.pegawai;
}

export async function adminCreatePegawai(newPegawai: Pegawai): Promise<Pegawai> {
  const local = readLocalDb();
  local.pegawai.push(newPegawai);
  writeLocalDb(local);
  return newPegawai;
}

export async function getKategoriList(): Promise<KategoriArsip[]> {
  return readLocalDb().kategoriArsip.sort((a, b) => a.urutan - b.urutan);
}

export async function getJenisDokumenList(): Promise<JenisDokumen[]> {
  return readLocalDb().jenisDokumen;
}

export async function listArsipByPegawai(pegawaiId: string): Promise<Arsip[]> {
  const local = readLocalDb();
  return local.arsip.filter(a => a.pegawaiId === pegawaiId && !a.deleted);
}

export async function getArsipData(id: string): Promise<Arsip | null> {
  const local = readLocalDb();
  return local.arsip.find(item => item.id === id) || null;
}

export async function createArsipData(newArsip: Arsip): Promise<Arsip> {
  const local = readLocalDb();
  local.arsip.push(newArsip);
  writeLocalDb(local);
  return newArsip;
}

export async function updateArsipData(id: string, updates: Partial<Arsip>): Promise<Arsip | null> {
  const local = readLocalDb();
  const index = local.arsip.findIndex(item => item.id === id);
  if (index === -1) return null;
  const updated = { ...local.arsip[index], ...updates, updatedAt: new Date().toISOString() };
  local.arsip[index] = updated;
  writeLocalDb(local);
  return updated;
}

export async function listAllArsipAdmin(instansiId?: string): Promise<Arsip[]> {
  const local = readLocalDb();
  let list = local.arsip.filter(item => !item.deleted);
  if (instansiId) list = list.filter(item => item.instansiId === instansiId);
  return list;
}

export async function createLogEntry(log: Log): Promise<Log> {
  const local = readLocalDb();
  local.logs.unshift(log);
  if (local.logs.length > 1000) local.logs = local.logs.slice(0, 1000);
  writeLocalDb(local);
  return log;
}

export async function getLogsData(): Promise<Log[]> {
  return readLocalDb().logs;
}

export async function getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
  const local = readLocalDb();
  const match = local.settings.find(s => s.key === key);
  return match ? match.value : defaultValue;
}

export async function updateSettingValue(key: string, value: string): Promise<void> {
  const local = readLocalDb();
  const index = local.settings.findIndex(s => s.key === key);
  if (index !== -1) {
    local.settings[index].value = value;
  } else {
    local.settings.push({ key, value, keterangan: '' });
  }
  writeLocalDb(local);
}

export async function bulkValidasiArsip(instansiId?: string, statusValidasi: string = 'Valid', updatedBy: string = 'system'): Promise<boolean> {
  const local = readLocalDb();
  let list = local.arsip.filter(a => !a.deleted);
  if (instansiId) list = list.filter(a => a.instansiId === instansiId);
  for (const a of list) {
    a.statusValidasi = statusValidasi as any;
    a.updatedAt = new Date().toISOString();
    a.updatedBy = updatedBy;
  }
  writeLocalDb(local);
  return true;
}
