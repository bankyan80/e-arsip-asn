import { isTursoConfigured, initSchema } from './turso';
import * as turso from './turso';
import * as localdb from './localdb';

async function seedTurso() {
  await initSchema();
  console.log('Seeding Turso database...');
  const defaultInstansi = [
    { id: 'INST_DINDIK', namaInstansi: 'Dinas Pendidikan Kabupaten Cirebon', alamat: 'Jl. Siliwangi No. 4, Cirebon', kecamatan: 'Kesambi', kabupaten: 'Cirebon', statusAktif: true },
  ];
  for (const i of defaultInstansi) {
    try { await turso.createInstansi(i); } catch (e: any) { console.error('Seed instansi error:', i.id, e?.message); }
  }
  console.log('Instansi seeded');

  const now = new Date().toISOString();
  const defaultPegawai = [
    { id: 'PGW001', instansiId: 'INST_DINDIK', namaInstansi: 'Dinas Pendidikan Kabupaten Cirebon', namaPegawai: 'Ahmad Hidayat', nip: '198705122010012003', nik: '3209123456780001', tanggalLahir: '1987-05-12', jenisKelamin: 'Laki-laki', jabatan: 'Guru Kelas', statusPegawai: 'PNS', pangkatGolongan: 'Penata / III.c', pendidikanTerakhir: 'S1', nomorHp: '081234567890', email: 'ahmad.hidayat@asn.id', alamat: 'Jl. Merdeka No. 4, Lemahabang, Cirebon', role: 'pegawai', statusAktif: true, createdAt: now, updatedAt: now },
    { id: 'PGW002', instansiId: 'INST_DINDIK', namaInstansi: 'Dinas Pendidikan Kabupaten Cirebon', namaPegawai: 'Budi Santoso', nip: '198501012008011002', nik: '3209123456780002', tanggalLahir: '1985-01-01', jenisKelamin: 'Laki-laki', jabatan: 'Kepala Sekolah', statusPegawai: 'PNS', pangkatGolongan: 'Penata Tk. I / III.d', pendidikanTerakhir: 'S2', nomorHp: '081398765432', email: 'budi.santoso@asn.id', alamat: 'Kompleks Gria Indah Blok C5, Cirebon', role: 'admin_instansi', statusAktif: true, createdAt: now, updatedAt: now },
    { id: 'PGW003', instansiId: 'INST_DINDIK', namaInstansi: 'Dinas Pendidikan Kabupaten Cirebon', namaPegawai: 'Citra Dewi Lestari', nip: '199003102014022001', nik: '3209876543210001', tanggalLahir: '1990-03-10', jenisKelamin: 'Perempuan', jabatan: 'Analis Kepegawaian', statusPegawai: 'PNS', pangkatGolongan: 'Penata Muda Tk. I / III.b', pendidikanTerakhir: 'S1', nomorHp: '082134567891', email: 'citra.dewi@asn.id', alamat: 'Jl. Diponegoro No. 23, Kesambi, Cirebon', role: 'admin_instansi', statusAktif: true, createdAt: now, updatedAt: now },
    { id: 'PGW004', instansiId: 'INST_DINDIK', namaInstansi: 'Dinas Pendidikan Kabupaten Cirebon', namaPegawai: 'Doni Prasetyo', nip: '198001292025211035', nik: '3209876543210002', tanggalLahir: '1992-08-15', jenisKelamin: 'Laki-laki', jabatan: 'Admin Database', statusPegawai: 'PNS', pangkatGolongan: 'Penata Muda / III.a', pendidikanTerakhir: 'D3', nomorHp: '085678912345', email: 'doni.prasetyo@asn.id', alamat: 'Perum Cipta Asri No. 7, Kesambi, Cirebon', role: 'super_admin', statusAktif: true, createdAt: now, updatedAt: now },
  ];
  for (const p of defaultPegawai) {
    try { await turso.createPegawai(p); } catch (e: any) { console.error('Seed pegawai error:', p.id, e?.message); }
  }
  console.log('Pegawai seeded');
  try { await turso.ensureSuperAdmin(); } catch (e: any) { console.error('Seed super_admin error:', e?.message); }

  await turso.setSetting('app_nama', 'Arsip Digital ASN');
  await turso.setSetting('app_instansi', 'Pemerintah Kabupaten Cirebon');
  await turso.seedDefaultPasswords();
  await turso.seedKategoriDanJenis();
  console.log('Seeding complete');
}

export async function seedInitialDb() {
  if (isTursoConfigured) {
    await seedTurso();
    return;
  }
  return localdb.seedInitialDb();
}

export const getInstansiData: typeof localdb.getInstansiData = isTursoConfigured
  ? async (id: string) => { const d = await turso.getInstansi(id); return d as any; }
  : localdb.getInstansiData;

export const listAllInstansi = isTursoConfigured
  ? () => turso.listInstansi()
  : localdb.listAllInstansi;

export const getPegawaiData: typeof localdb.getPegawaiData = isTursoConfigured
  ? async (id: string) => { const d = await turso.getPegawai(id); return d as any; }
  : localdb.getPegawaiData;

export const findPegawaiByCredentials = isTursoConfigured
  ? async (identifier: string, type: 'NIP' | 'NIK' | 'BOTH') => {
      if (type === 'NIP' || type === 'BOTH') { const d = await turso.findPegawaiByNipNikWithPassword(identifier, 'NIP'); if (d) return d as any; }
      if (type === 'NIK' || type === 'BOTH') { const d = await turso.findPegawaiByNipNikWithPassword(identifier, 'NIK'); if (d) return d as any; }
      return null;
    }
  : localdb.findPegawaiByCredentials;

export const updatePegawaiData: typeof localdb.updatePegawaiData = isTursoConfigured
  ? async (id, updates) => { await turso.updatePegawai(id, updates); return turso.getPegawai(id) as any; }
  : localdb.updatePegawaiData;

export const deletePegawaiData = isTursoConfigured
  ? async (id: string) => turso.deletePegawai(id)
  : async (id: string) => { await localdb.updatePegawaiData(id, { statusAktif: false } as any); };

export const listAllPegawai: typeof localdb.listAllPegawai = isTursoConfigured
  ? async (instansiId?: string) => turso.listPegawai(instansiId) as any
  : localdb.listAllPegawai;

export const adminCreatePegawai: typeof localdb.adminCreatePegawai = isTursoConfigured
  ? async (data: any) => turso.createPegawai(data) as any
  : localdb.adminCreatePegawai;

export const bulkImportPegawai = isTursoConfigured
  ? async (list: any[]) => turso.bulkCreatePegawai(list)
  : async (_list: any[]) => { console.warn('bulkImportPegawai not available (Firestore fallback)'); };

export const clearPegawai = isTursoConfigured
  ? async () => turso.clearPegawaiExceptSuperAdmin()
  : async () => { console.warn('clearPegawai not available (Firestore fallback)'); };

export const updateAllInstansiName = isTursoConfigured
  ? async (namaInstansi: string) => turso.updateAllInstansiName(namaInstansi)
  : async (_namaInstansi: string) => { console.warn('updateAllInstansiName not available (Firestore fallback)'); };

export const bulkDeleteArsipByUploader = isTursoConfigured
  ? async (uploadedBy: string) => turso.bulkDeleteArsipByUploader(uploadedBy)
  : async (_uploadedBy: string) => { console.warn('bulkDeleteArsipByUploader not available (Firestore fallback)'); };

export const listArsipByPegawai: typeof localdb.listArsipByPegawai = isTursoConfigured
  ? async (pegawaiId: string) => turso.listArsipByPegawai(pegawaiId) as any
  : localdb.listArsipByPegawai;

export const getArsipData: typeof localdb.getArsipData = isTursoConfigured
  ? async (id: string) => turso.getArsip(id) as any
  : localdb.getArsipData;

export const createArsipData: typeof localdb.createArsipData = isTursoConfigured
  ? async (data: any) => turso.createArsip(data) as any
  : localdb.createArsipData;

export const updateArsipData: typeof localdb.updateArsipData = isTursoConfigured
  ? async (id: string, updates: any) => { await turso.updateArsip(id, updates); return turso.getArsip(id) as any; }
  : localdb.updateArsipData;

export const listAllArsipAdmin: typeof localdb.listAllArsipAdmin = isTursoConfigured
  ? async (instansiId?: string) => turso.listArsipAdmin(instansiId) as any
  : localdb.listAllArsipAdmin;

export const createLogEntry: typeof localdb.createLogEntry = isTursoConfigured
  ? async (data: any) => turso.createLog(data) as any
  : localdb.createLogEntry;

export const getLogsData: typeof localdb.getLogsData = isTursoConfigured
  ? async () => turso.listLogs() as any
  : localdb.getLogsData;

export const getSettingValue: typeof localdb.getSettingValue = isTursoConfigured
  ? async (key: string, defaultValue?: string) => { const v = await turso.getSetting(key); return v !== null ? v : (defaultValue || ''); }
  : localdb.getSettingValue;

export const updateSettingValue: typeof localdb.updateSettingValue = isTursoConfigured
  ? async (key: string, value: string) => turso.setSetting(key, value)
  : localdb.updateSettingValue;

export const getKategoriList: typeof localdb.getKategoriList = isTursoConfigured
  ? async () => turso.listKategori() as any
  : localdb.getKategoriList;

export const createKategori = isTursoConfigured
  ? async (data: any) => turso.createKategori(data) as any
  : async (data: any) => { console.warn('createKategori not available (Firestore fallback)'); return data; };

export const updateKategori = isTursoConfigured
  ? async (id: string, data: any) => turso.updateKategori(id, data) as any
  : async (_id: string, _data: any) => { console.warn('updateKategori not available (Firestore fallback)'); };

export const deleteKategori = isTursoConfigured
  ? async (id: string) => turso.deleteKategori(id)
  : async (_id: string) => { console.warn('deleteKategori not available (Firestore fallback)'); };

export const getJenisDokumenList: typeof localdb.getJenisDokumenList = isTursoConfigured
  ? async () => turso.listJenisDokumen() as any
  : localdb.getJenisDokumenList;

export const createJenisDokumen = isTursoConfigured
  ? async (data: any) => turso.createJenisDokumen(data) as any
  : async (data: any) => { console.warn('createJenisDokumen not available (Firestore fallback)'); return data; };

export const updateJenisDokumen = isTursoConfigured
  ? async (id: string, data: any) => turso.updateJenisDokumen(id, data)
  : async (_id: string, _data: any) => { console.warn('updateJenisDokumen not available (Firestore fallback)'); };

export const deleteJenisDokumen = isTursoConfigured
  ? async (id: string) => turso.deleteJenisDokumen(id)
  : async (_id: string) => { console.warn('deleteJenisDokumen not available (Firestore fallback)'); };

export const bulkValidasiArsip = isTursoConfigured
  ? async (instansiId?: string, statusValidasi: string = 'Valid', updatedBy: string = 'system') => turso.bulkValidasiArsip(instansiId, statusValidasi, updatedBy)
  : localdb.bulkValidasiArsip;

export const remapArsipJenisDokumen = isTursoConfigured
  ? async () => turso.remapArsipJenisDokumen()
  : async () => { console.warn('remapArsipJenisDokumen not available (Firestore fallback)'); return false; };

export const dedupArsip = isTursoConfigured
  ? async () => turso.dedupArsip()
  : async () => { console.warn('dedupArsip not available (Firestore fallback)'); return false; };

export const setPegawaiPassword = isTursoConfigured
  ? async (id: string, hashed: string) => turso.setPegawaiPassword(id, hashed)
  : async (_id: string, _hashed: string) => { console.warn('setPegawaiPassword not available (Firestore fallback)'); };

export const readLocalDb = localdb.readLocalDb;
export const writeLocalDb = localdb.writeLocalDb;
export const readLocalDbAsync = localdb.readLocalDbAsync;
