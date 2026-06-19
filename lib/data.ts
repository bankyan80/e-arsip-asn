import { isTursoConfigured, initSchema } from './turso';
import * as turso from './turso';
import * as firestore from './firestore';

async function seedTurso() {
  await initSchema();
  console.log('Seeding Turso database...');
  const defaultInstansi = [
    { id: 'INST001', namaInstansi: 'SD Negeri 1 Lemahabang', alamat: 'Jl. Raya Lemahabang', kecamatan: 'Lemahabang', kabupaten: 'Cirebon', statusAktif: true },
    { id: 'INST002', namaInstansi: 'Kantor Kepegawaian Daerah Cirebon', alamat: 'Jl. Pemuda No. 12', kecamatan: 'Kesambi', kabupaten: 'Cirebon', statusAktif: true },
  ];
  for (const i of defaultInstansi) {
    try { await turso.createInstansi(i); } catch (e: any) { console.error('Seed instansi error:', i.id, e?.message); }
  }
  console.log('Instansi seeded');

  const now = new Date().toISOString();
  const defaultPegawai = [
    { id: 'PGW001', instansiId: 'INST001', namaInstansi: 'SD Negeri 1 Lemahabang', namaPegawai: 'Ahmad Hidayat', nip: '198705122010012003', nik: '3209123456780001', tanggalLahir: '1987-05-12', jenisKelamin: 'Laki-laki', jabatan: 'Guru Kelas', statusPegawai: 'PNS', pangkatGolongan: 'Penata / III.c', pendidikanTerakhir: 'S1', nomorHp: '081234567890', email: 'ahmad.hidayat@asn.id', alamat: 'Jl. Merdeka No. 4, Lemahabang, Cirebon', role: 'pegawai', statusAktif: true, createdAt: now, updatedAt: now },
    { id: 'PGW002', instansiId: 'INST001', namaInstansi: 'SD Negeri 1 Lemahabang', namaPegawai: 'Budi Santoso', nip: '198501012008011002', nik: '3209123456780002', tanggalLahir: '1985-01-01', jenisKelamin: 'Laki-laki', jabatan: 'Kepala Sekolah', statusPegawai: 'PNS', pangkatGolongan: 'Penata Tk. I / III.d', pendidikanTerakhir: 'S2', nomorHp: '081398765432', email: 'budi.santoso@asn.id', alamat: 'Kompleks Gria Indah Blok C5, Cirebon', role: 'admin_instansi', statusAktif: true, createdAt: now, updatedAt: now },
    { id: 'PGW003', instansiId: 'INST002', namaInstansi: 'Kantor Kepegawaian Daerah Cirebon', namaPegawai: 'Citra Dewi Lestari', nip: '199003102014022001', nik: '3209876543210001', tanggalLahir: '1990-03-10', jenisKelamin: 'Perempuan', jabatan: 'Analis Kepegawaian', statusPegawai: 'PNS', pangkatGolongan: 'Penata Muda Tk. I / III.b', pendidikanTerakhir: 'S1', nomorHp: '082134567891', email: 'citra.dewi@asn.id', alamat: 'Jl. Diponegoro No. 23, Kesambi, Cirebon', role: 'admin_instansi', statusAktif: true, createdAt: now, updatedAt: now },
    { id: 'PGW004', instansiId: 'INST002', namaInstansi: 'Kantor Kepegawaian Daerah Cirebon', namaPegawai: 'Doni Prasetyo', nip: '198001292025211035', nik: '3209876543210002', tanggalLahir: '1992-08-15', jenisKelamin: 'Laki-laki', jabatan: 'Admin Database', statusPegawai: 'PNS', pangkatGolongan: 'Penata Muda / III.a', pendidikanTerakhir: 'D3', nomorHp: '085678912345', email: 'doni.prasetyo@asn.id', alamat: 'Perum Cipta Asri No. 7, Kesambi, Cirebon', role: 'super_admin', statusAktif: true, createdAt: now, updatedAt: now },
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
  return firestore.seedInitialDb();
}

export const getInstansiData: typeof firestore.getInstansiData = isTursoConfigured
  ? async (id: string) => { const d = await turso.getInstansi(id); return d as any; }
  : firestore.getInstansiData;

export const listAllInstansi = isTursoConfigured
  ? () => turso.listInstansi()
  : firestore.listAllInstansi;

export const getPegawaiData: typeof firestore.getPegawaiData = isTursoConfigured
  ? async (id: string) => { const d = await turso.getPegawai(id); return d as any; }
  : firestore.getPegawaiData;

export const findPegawaiByCredentials = isTursoConfigured
  ? async (identifier: string, type: 'NIP' | 'NIK' | 'BOTH') => {
      if (type === 'NIP' || type === 'BOTH') { const d = await turso.findPegawaiByNipNikWithPassword(identifier, 'NIP'); if (d) return d as any; }
      if (type === 'NIK' || type === 'BOTH') { const d = await turso.findPegawaiByNipNikWithPassword(identifier, 'NIK'); if (d) return d as any; }
      return null;
    }
  : firestore.findPegawaiByCredentials;

export const updatePegawaiData: typeof firestore.updatePegawaiData = isTursoConfigured
  ? async (id, updates) => { await turso.updatePegawai(id, updates); return turso.getPegawai(id) as any; }
  : firestore.updatePegawaiData;

export const deletePegawaiData = isTursoConfigured
  ? async (id: string) => turso.deletePegawai(id)
  : async (_id: string) => {};

export const listAllPegawai: typeof firestore.listAllPegawai = isTursoConfigured
  ? async (instansiId?: string) => turso.listPegawai(instansiId) as any
  : firestore.listAllPegawai;

export const adminCreatePegawai: typeof firestore.adminCreatePegawai = isTursoConfigured
  ? async (data: any) => turso.createPegawai(data) as any
  : firestore.adminCreatePegawai;

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

export const listArsipByPegawai: typeof firestore.listArsipByPegawai = isTursoConfigured
  ? async (pegawaiId: string) => turso.listArsipByPegawai(pegawaiId) as any
  : firestore.listArsipByPegawai;

export const getArsipData: typeof firestore.getArsipData = isTursoConfigured
  ? async (id: string) => turso.getArsip(id) as any
  : firestore.getArsipData;

export const createArsipData: typeof firestore.createArsipData = isTursoConfigured
  ? async (data: any) => turso.createArsip(data) as any
  : firestore.createArsipData;

export const updateArsipData: typeof firestore.updateArsipData = isTursoConfigured
  ? async (id: string, updates: any) => { await turso.updateArsip(id, updates); return turso.getArsip(id) as any; }
  : firestore.updateArsipData;

export const listAllArsipAdmin: typeof firestore.listAllArsipAdmin = isTursoConfigured
  ? async (instansiId?: string) => turso.listArsipAdmin(instansiId) as any
  : firestore.listAllArsipAdmin;

export const createLogEntry: typeof firestore.createLogEntry = isTursoConfigured
  ? async (data: any) => turso.createLog(data) as any
  : firestore.createLogEntry;

export const getLogsData: typeof firestore.getLogsData = isTursoConfigured
  ? async () => turso.listLogs() as any
  : firestore.getLogsData;

export const getSettingValue: typeof firestore.getSettingValue = isTursoConfigured
  ? async (key: string, defaultValue?: string) => { const v = await turso.getSetting(key); return v !== null ? v : (defaultValue || ''); }
  : firestore.getSettingValue;

export const updateSettingValue: typeof firestore.updateSettingValue = isTursoConfigured
  ? async (key: string, value: string) => turso.setSetting(key, value)
  : firestore.updateSettingValue;

export const getKategoriList: typeof firestore.getKategoriList = isTursoConfigured
  ? async () => turso.listKategori() as any
  : firestore.getKategoriList;

export const createKategori = isTursoConfigured
  ? async (data: any) => turso.createKategori(data) as any
  : async (data: any) => { console.warn('createKategori not available (Firestore fallback)'); return data; };

export const updateKategori = isTursoConfigured
  ? async (id: string, data: any) => turso.updateKategori(id, data) as any
  : async (_id: string, _data: any) => { console.warn('updateKategori not available (Firestore fallback)'); };

export const deleteKategori = isTursoConfigured
  ? async (id: string) => turso.deleteKategori(id)
  : async (_id: string) => { console.warn('deleteKategori not available (Firestore fallback)'); };

export const getJenisDokumenList: typeof firestore.getJenisDokumenList = isTursoConfigured
  ? async () => turso.listJenisDokumen() as any
  : firestore.getJenisDokumenList;

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
  : async (_instansiId?: string, _statusValidasi?: string, _updatedBy?: string) => { console.warn('bulkValidasiArsip not available (Firestore fallback)'); return false; };

export const remapArsipJenisDokumen = isTursoConfigured
  ? async () => turso.remapArsipJenisDokumen()
  : async () => { console.warn('remapArsipJenisDokumen not available (Firestore fallback)'); return false; };

export const dedupArsip = isTursoConfigured
  ? async () => turso.dedupArsip()
  : async () => { console.warn('dedupArsip not available (Firestore fallback)'); return false; };

export const setPegawaiPassword = isTursoConfigured
  ? async (id: string, hashed: string) => turso.setPegawaiPassword(id, hashed)
  : async (_id: string, _hashed: string) => { console.warn('setPegawaiPassword not available (Firestore fallback)'); };

export const readLocalDb = firestore.readLocalDb;
export const writeLocalDb = firestore.writeLocalDb;
