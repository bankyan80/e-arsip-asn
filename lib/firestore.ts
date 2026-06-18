import * as fs from 'fs';
import * as path from 'path';
import { db, isFirebaseConfigured } from './firebaseAdmin';
import { Instansi, Pegawai, KategoriArsip, JenisDokumen, Arsip, Log, Setting } from '../src/types';
import { STATIC_KATEGORI, STATIC_JENIS_DOKUMEN } from './constants';

const LOCAL_DB_PATH = process.env.VERCEL === '1'
  ? path.join('/tmp', 'local-db.json')
  : path.join(process.cwd(), 'local-db.json');

// Interface for local JSON database structure
interface LocalDB {
  instansi: Instansi[];
  pegawai: Pegawai[];
  arsip: Arsip[];
  logs: Log[];
  settings: Setting[];
  kategoriArsip: KategoriArsip[];
  jenisDokumen: JenisDokumen[];
}

// -----------------------------------------
// LOCAL DB HELPER METHODS
// -----------------------------------------
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
    const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading local database JSON:', err);
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

export function writeLocalDb(data: LocalDB) {
  try {
    fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local database JSON:', err);
  }
}

// -----------------------------------------
// SEEDING UTILITIES
// -----------------------------------------
export async function seedInitialDb() {
  const defaultInstansi: Instansi[] = [
    {
      id: 'INST001',
      namaInstansi: 'SD Negeri 1 Lemahabang',
      alamat: 'Jl. Raya Lemahabang',
      kecamatan: 'Lemahabang',
      kabupaten: 'Cirebon',
      statusAktif: true
    },
    {
      id: 'INST002',
      namaInstansi: 'Kantor Kepegawaian Daerah Cirebon',
      alamat: 'Jl. Pemuda No. 12',
      kecamatan: 'Kesambi',
      kabupaten: 'Cirebon',
      statusAktif: true
    }
  ];

  const defaultPegawai: Pegawai[] = [
    {
      id: 'PGW001',
      instansiId: 'INST001',
      namaInstansi: 'SD Negeri 1 Lemahabang',
      namaPegawai: 'Ahmad Hidayat',
      nip: '198705122010012003',
      nik: '3209123456780001',
      tanggalLahir: '1987-05-12',
      jenisKelamin: 'Laki-laki',
      jabatan: 'Guru Kelas',
      statusPegawai: 'PNS',
      pangkatGolongan: 'Penata / III.c',
      pendidikanTerakhir: 'S1',
      nomorHp: '081234567890',
      email: 'ahmad.hidayat@asn.id',
      alamat: 'Jl. Merdeka No. 4, Lemahabang, Cirebon',
      role: 'pegawai',
      statusAktif: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'PGW002',
      instansiId: 'INST001',
      namaInstansi: 'SD Negeri 1 Lemahabang',
      namaPegawai: 'Budi Santoso',
      nip: '198501012008011002',
      nik: '3209123456780002',
      tanggalLahir: '1985-01-01',
      jenisKelamin: 'Laki-laki',
      jabatan: 'Kepala Sekolah',
      statusPegawai: 'PNS',
      pangkatGolongan: 'Penata Tk. I / III.d',
      pendidikanTerakhir: 'S2',
      nomorHp: '081398765432',
      email: 'budi.santoso@asn.id',
      alamat: 'Kompleks Gria Indah Blok C5, Cirebon',
      role: 'admin_instansi',
      statusAktif: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'PGW003',
      instansiId: 'INST002',
      namaInstansi: 'Kantor Kepegawaian Daerah Cirebon',
      namaPegawai: 'Citra Dewi Lestari',
      nip: '199003102014022001',
      nik: '3209876543210001',
      tanggalLahir: '1990-03-10',
      jenisKelamin: 'Perempuan',
      jabatan: 'Analis Kepegawaian',
      statusPegawai: 'PNS',
      pangkatGolongan: 'Penata Muda Tk. I / III.b',
      pendidikanTerakhir: 'S1',
      nomorHp: '082134567891',
      email: 'citra.dewi@asn.id',
      alamat: 'Jl. Diponegoro No. 23, Kesambi, Cirebon',
      role: 'admin_instansi',
      statusAktif: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const defaultSettings: Setting[] = [
    { key: 'allowDeleteValid', value: 'false', keterangan: 'Mengizinkan pegawai mendelete dokumen yang sudah divalidasi' },
    { key: 'limitSizeMB', value: '10', keterangan: 'Ukuran file maks dalam satuan MB' }
  ];

  if (isFirebaseConfigured && db) {
    try {
      // Check if seeded
      const instSnapshot = await db.collection('instansi').limit(1).get();
      if (instSnapshot.empty) {
        console.log('Seeding real Firestore database...');
        // Seed Instansi
        for (const i of defaultInstansi) {
          await db.collection('instansi').doc(i.id).set(i);
        }
        // Seed Pegawai
        for (const p of defaultPegawai) {
          await db.collection('pegawai').doc(p.id).set(p);
          // Also set user mapping for easy lookup
          await db.collection('users').doc(p.id).set({
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
        // Seed Categories
        for (const c of STATIC_KATEGORI) {
          await db.collection('kategoriArsip').doc(c.id).set(c);
        }
        // Seed Jenis Dokumen
        for (const jd of STATIC_JENIS_DOKUMEN) {
          await db.collection('jenisDokumen').doc(jd.id).set(jd);
        }
        // Seed Settings
        for (const s of defaultSettings) {
          await db.collection('settings').doc(s.key).set(s);
        }
        console.log('Real Firestore seed completed successfully.');
      }
    } catch (err) {
      console.error('Error seeding Firestore database:', err);
    }
  }

  // Always keep local DB synced or fallback pre-seeded
  const local = readLocalDb();
  if (local.instansi.length === 0) {
    console.log('Seeding local storage fallback DB...');
    local.instansi = defaultInstansi;
    local.pegawai = defaultPegawai;
    local.kategoriArsip = STATIC_KATEGORI;
    local.jenisDokumen = STATIC_JENIS_DOKUMEN;
    local.settings = defaultSettings;
    local.logs = [
      {
        id: 'L0',
        tanggal: new Date().toISOString(),
        userId: 'SYSTEM',
        pegawaiId: 'SYSTEM',
        nip: '000000',
        namaPegawai: 'System Seeder',
        role: 'admin_instansi',
        aksi: 'SEED_DATA',
        detail: 'Sistem berhasil melakukan seeding data awal.'
      }
    ];
    writeLocalDb(local);
  }
}

// -----------------------------------------
// DATABASE CONCRETE ACTIONS
// -----------------------------------------

// 1. INSTANSI ACTIONS
export async function getInstansiData(id: string): Promise<Instansi | null> {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection('instansi').doc(id).get();
    return doc.exists ? (doc.data() as Instansi) : null;
  }
  const local = readLocalDb();
  return local.instansi.find(item => item.id === id) || null;
}

export async function listAllInstansi(): Promise<Instansi[]> {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection('instansi').get();
    return qs.docs.map((doc: any) => doc.data() as Instansi);
  }
  return readLocalDb().instansi;
}

// 2. PEGAWAI ACTIONS
export async function getPegawaiData(id: string): Promise<Pegawai | null> {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection('pegawai').doc(id).get();
    return doc.exists ? (doc.data() as Pegawai) : null;
  }
  const local = readLocalDb();
  return local.pegawai.find(item => item.id === id) || null;
}

export async function findPegawaiByCredentials(
  identifier: string,
  type: 'NIP' | 'NIK' | 'BOTH',
  tanggalLahir: string
): Promise<Pegawai | null> {
  if (isFirebaseConfigured && db) {
    if (type === 'NIP' || type === 'BOTH') {
      const qs = await db.collection('pegawai')
        .where('nip', '==', identifier)
        .where('tanggalLahir', '==', tanggalLahir)
        .get();
      if (!qs.empty) return qs.docs[0].data() as Pegawai;
    }
    if (type === 'NIK' || type === 'BOTH') {
      const qs = await db.collection('pegawai')
        .where('nik', '==', identifier)
        .where('tanggalLahir', '==', tanggalLahir)
        .get();
      if (!qs.empty) return qs.docs[0].data() as Pegawai;
    }
    return null;
  }

  const local = readLocalDb();
  const found = local.pegawai.find(p => {
    let fieldMatch = false;
    if (type === 'NIP' || type === 'BOTH') {
      fieldMatch = fieldMatch || p.nip === identifier;
    }
    if (type === 'NIK' || type === 'BOTH') {
      fieldMatch = fieldMatch || p.nik === identifier;
    }
    return fieldMatch && p.tanggalLahir === tanggalLahir;
  });
  return found || null;
}

export async function updatePegawaiData(id: string, updates: Partial<Pegawai>): Promise<Pegawai | null> {
  if (isFirebaseConfigured && db) {
    await db.collection('pegawai').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    // Sync with users if present
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists) {
      await db.collection('users').doc(id).update({
        nama: updates.namaPegawai || userDoc.data()?.nama,
        updatedAt: new Date().toISOString()
      });
    }
    return getPegawaiData(id);
  }

  const local = readLocalDb();
  const list = local.pegawai;
  const index = list.findIndex(p => p.id === id);
  if (index === -1) return null;

  const updatedPegawai = {
    ...list[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  list[index] = updatedPegawai;
  writeLocalDb(local);
  return updatedPegawai;
}

export async function listAllPegawai(instansiId?: string): Promise<Pegawai[]> {
  if (isFirebaseConfigured && db) {
    let q: any = db.collection('pegawai');
    if (instansiId) {
      q = q.where('instansiId', '==', instansiId);
    }
    const qs = await q.get();
    return qs.docs.map((doc: any) => doc.data() as Pegawai);
  }

  const local = readLocalDb();
  if (instansiId) {
    return local.pegawai.filter(p => p.instansiId === instansiId);
  }
  return local.pegawai;
}

export async function adminCreatePegawai(newPegawai: Pegawai): Promise<Pegawai> {
  if (isFirebaseConfigured && db) {
    await db.collection('pegawai').doc(newPegawai.id).set(newPegawai);
    await db.collection('users').doc(newPegawai.id).set({
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

// 3. KATEGORI & JENIS DOKUMEN ACTIONS
export async function getKategoriList(): Promise<KategoriArsip[]> {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection('kategoriArsip').orderBy('urutan', 'asc').get();
    return qs.docs.map((doc: any) => doc.data() as KategoriArsip);
  }
  return readLocalDb().kategoriArsip.sort((a, b) => a.urutan - b.urutan);
}

export async function getJenisDokumenList(): Promise<JenisDokumen[]> {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection('jenisDokumen').get();
    return qs.docs.map((doc: any) => doc.data() as JenisDokumen);
  }
  return readLocalDb().jenisDokumen;
}

// 4. ARSIP ACTIONS
export async function listArsipByPegawai(pegawaiId: string): Promise<Arsip[]> {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection('arsip')
      .where('pegawaiId', '==', pegawaiId)
      .where('deleted', '==', false)
      .get();
    return qs.docs.map((doc: any) => doc.data() as Arsip);
  }
  const local = readLocalDb();
  return local.arsip.filter(a => a.pegawaiId === pegawaiId && !a.deleted);
}

export async function getArsipData(id: string): Promise<Arsip | null> {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection('arsip').doc(id).get();
    return doc.exists ? (doc.data() as Arsip) : null;
  }
  const local = readLocalDb();
  return local.arsip.find(item => item.id === id) || null;
}

export async function createArsipData(newArsip: Arsip): Promise<Arsip> {
  if (isFirebaseConfigured && db) {
    await db.collection('arsip').doc(newArsip.id).set(newArsip);
    return newArsip;
  }

  const local = readLocalDb();
  local.arsip.push(newArsip);
  writeLocalDb(local);
  return newArsip;
}

export async function updateArsipData(id: string, updates: Partial<Arsip>): Promise<Arsip | null> {
  if (isFirebaseConfigured && db) {
    await db.collection('arsip').doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return getArsipData(id);
  }

  const local = readLocalDb();
  const index = local.arsip.findIndex(item => item.id === id);
  if (index === -1) return null;

  const updatedArsip = {
    ...local.arsip[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  local.arsip[index] = updatedArsip;
  writeLocalDb(local);
  return updatedArsip;
}

export async function listAllArsipAdmin(instansiId?: string): Promise<Arsip[]> {
  if (isFirebaseConfigured && db) {
    let q: any = db.collection('arsip').where('deleted', '==', false);
    if (instansiId) {
      q = q.where('instansiId', '==', instansiId);
    }
    const qs = await q.get();
    return qs.docs.map((doc: any) => doc.data() as Arsip);
  }

  const local = readLocalDb();
  let list = local.arsip.filter(item => !item.deleted);
  if (instansiId) {
    list = list.filter(item => item.instansiId === instansiId);
  }
  return list;
}

// 5. LOG ACTIONS
export async function createLogEntry(log: Log): Promise<Log> {
  if (isFirebaseConfigured && db) {
    await db.collection('logs').doc(log.id).set(log);
    return log;
  }

  const local = readLocalDb();
  local.logs.unshift(log);
  // Cap at 1000 logs inside local storage JSON
  if (local.logs.length > 1000) {
    local.logs = local.logs.slice(0, 1000);
  }
  writeLocalDb(local);
  return log;
}

export async function getLogsData(): Promise<Log[]> {
  if (isFirebaseConfigured && db) {
    const qs = await db.collection('logs').orderBy('tanggal', 'desc').limit(200).get();
    return qs.docs.map((doc: any) => doc.data() as Log);
  }
  return readLocalDb().logs;
}

// 6. SETTINGS ACTIONS
export async function getSettingValue(key: string, defaultValue: string = ''): Promise<string> {
  if (isFirebaseConfigured && db) {
    const doc = await db.collection('settings').doc(key).get();
    if (doc.exists) {
      return doc.data()?.value || defaultValue;
    }
    return defaultValue;
  }
  const local = readLocalDb();
  const match = local.settings.find(s => s.key === key);
  return match ? match.value : defaultValue;
}

export async function updateSettingValue(key: string, value: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    await db.collection('settings').doc(key).set({
      key,
      value,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return;
  }
  const local = readLocalDb();
  const index = local.settings.findIndex(s => s.key === key);
  if (index !== -1) {
    local.settings[index].value = value;
  } else {
    local.settings.push({ key, value, keterangan: '' });
  }
  writeLocalDb(local);
}
