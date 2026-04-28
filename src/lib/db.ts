import { supabase } from './supabase';
import type { Pegawai, Dokumen, Notifikasi } from './types';

// ============================================================
// Mapping Helpers: snake_case (DB) ↔ camelCase (App)
// ============================================================

function mapDbToPegawai(row: Record<string, any>): Pegawai {
  return {
    id: row.id,
    nip: row.nip ?? '',
    nama: row.nama ?? '',
    jenisASN: row.jenis_asn ?? '',
    jabatan: row.jabatan ?? '',
    golongan: row.golongan ?? '',
    kecamatan: row.kecamatan ?? '',
    unitKerja: row.unit_kerja ?? '',
    email: row.email ?? '',
    hp: row.hp ?? '',
    tanggalLahir: row.tanggal_lahir ?? '',
    tempatLahir: row.tempat_lahir ?? '',
    jenisKelamin: row.jenis_kelamin ?? '',
    agama: row.agama ?? '',
    alamat: row.alamat ?? '',
    pendidikanTerakhir: row.pendidikan_terakhir ?? '',
    status: row.status ?? 'Aktif',
    tglPensiun: row.tgl_pensiun ?? '',
    fotoUrl: row.foto_url ?? '',
  };
}

function mapPegawaiToDb(p: Partial<Pegawai>): Record<string, any> {
  const obj: Record<string, any> = {};
  if (p.nip !== undefined) obj.nip = p.nip;
  if (p.nama !== undefined) obj.nama = p.nama;
  if (p.jenisASN !== undefined) obj.jenis_asn = p.jenisASN;
  if (p.jabatan !== undefined) obj.jabatan = p.jabatan;
  if (p.golongan !== undefined) obj.golongan = p.golongan;
  if (p.kecamatan !== undefined) obj.kecamatan = p.kecamatan;
  if (p.unitKerja !== undefined) obj.unit_kerja = p.unitKerja;
  if (p.email !== undefined) obj.email = p.email;
  if (p.hp !== undefined) obj.hp = p.hp;
  if (p.tanggalLahir !== undefined) obj.tanggal_lahir = p.tanggalLahir || null;
  if (p.tempatLahir !== undefined) obj.tempat_lahir = p.tempatLahir;
  if (p.jenisKelamin !== undefined) obj.jenis_kelamin = p.jenisKelamin;
  if (p.agama !== undefined) obj.agama = p.agama;
  if (p.alamat !== undefined) obj.alamat = p.alamat;
  if (p.pendidikanTerakhir !== undefined) obj.pendidikan_terakhir = p.pendidikanTerakhir;
  if (p.status !== undefined) obj.status = p.status;
  if (p.fotoUrl !== undefined) obj.foto_url = p.fotoUrl;
  // tgl_pensiun: auto-hitung dari tanggal_lahir + 60 tahun, TMT tanggal 1 bulan berikutnya
  if (p.tglPensiun !== undefined) {
    obj.tgl_pensiun = p.tglPensiun || null;
  } else if (p.tanggalLahir) {
    const lahir = new Date(p.tanggalLahir + 'T00:00:00'); // hindari timezone shift
    if (!isNaN(lahir.getTime())) {
      // Bulan berikutnya setelah ultah ke-60, tanggal 1
      const tahunPensiun = lahir.getFullYear() + 60;
      const bulanPensiun = lahir.getMonth() + 1; // 0-indexed, +1 = bulan berikutnya
      const tmt = new Date(tahunPensiun, bulanPensiun, 1);
      // Format YYYY-MM-DD lokal
      const yyyy = tmt.getFullYear();
      const mm = String(tmt.getMonth() + 1).padStart(2, '0');
      const dd = String(tmt.getDate()).padStart(2, '0');
      obj.tgl_pensiun = `${yyyy}-${mm}-${dd}`;
    }
  }
  return obj;
}

function mapDbToDokumen(row: Record<string, any>): Dokumen {
  return {
    id: row.id,
    pegawaiId: row.pegawai_id,
    pegawaiNama: row.pegawai_nama ?? '',
    nip: row.nip ?? '',
    jenisASN: row.jenis_asn ?? '',
    jenisDokumen: row.jenis_dokumen ?? '',
    tanggal: row.tanggal ?? '',
    status: row.status ?? 'Pending',
    url: row.url ?? '',
    expiry: row.expiry ?? '',
    fileName: row.file_name ?? '',
    keterangan: row.keterangan ?? '',
    periode: row.periode ?? '',
    tmtAwal: row.tmt_awal ?? '',
    tmtAkhir: row.tmt_akhir ?? '',
  };
}

function mapDokumenToDb(d: Partial<Dokumen>): Record<string, any> {
  const obj: Record<string, any> = {};
  if (d.pegawaiId !== undefined) obj.pegawai_id = d.pegawaiId;
  if (d.pegawaiNama !== undefined) obj.pegawai_nama = d.pegawaiNama;
  if (d.nip !== undefined) obj.nip = d.nip;
  if (d.jenisASN !== undefined) obj.jenis_asn = d.jenisASN;
  if (d.jenisDokumen !== undefined) obj.jenis_dokumen = d.jenisDokumen;
  if (d.tanggal !== undefined) obj.tanggal = d.tanggal || null;
  if (d.status !== undefined) obj.status = d.status;
  if (d.url !== undefined) obj.url = d.url;
  if (d.expiry !== undefined) obj.expiry = d.expiry || null;
  if (d.fileName !== undefined) obj.file_name = d.fileName;
  if (d.keterangan !== undefined) obj.keterangan = d.keterangan;
  if (d.periode !== undefined) obj.periode = d.periode;
  if (d.tmtAwal !== undefined) obj.tmt_awal = d.tmtAwal || null;
  if (d.tmtAkhir !== undefined) obj.tmt_akhir = d.tmtAkhir || null;
  return obj;
}

function mapDbToNotifikasi(row: Record<string, any>): Notifikasi {
  return {
    id: row.id,
    message: row.message ?? '',
    type: row.type ?? 'info',
    read: row.read ?? false,
    createdAt: row.created_at ?? '',
  };
}

// ============================================================
// Pegawai CRUD
// ============================================================

export async function fetchAllPegawai(): Promise<Pegawai[]> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapDbToPegawai);
}

export async function fetchPegawaiByNIP(nip: string): Promise<Pegawai | null> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .eq('nip', nip)
    .single();
  if (error || !data) return null;
  return mapDbToPegawai(data);
}

export async function fetchPegawaiById(id: number): Promise<Pegawai | null> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return mapDbToPegawai(data);
}

export async function insertPegawai(p: Partial<Pegawai>): Promise<Pegawai> {
  const dbData = mapPegawaiToDb(p);
  const { data, error } = await supabase
    .from('pegawai')
    .insert(dbData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbToPegawai(data);
}

export async function updatePegawaiInDB(id: number, data: Partial<Pegawai>): Promise<void> {
  const dbData = mapPegawaiToDb(data);
  const { error } = await supabase
    .from('pegawai')
    .update(dbData)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePegawaiFromDB(id: number): Promise<void> {
  const { error } = await supabase
    .from('pegawai')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// BUP (Batas Usia Pensiun) Queries
// ============================================================

/** Ambil pegawai yang sudah atau akan pensiun dalam N tahun ke depan */
export async function fetchPegawaiMenujuPensiun(tahun: number = 5): Promise<Pegawai[]> {
  const today = new Date();
  const batas = new Date();
  batas.setFullYear(today.getFullYear() + tahun);

  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .lte('tgl_pensiun', batas.toISOString().split('T')[0])
    .order('tgl_pensiun', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(mapDbToPegawai);
}

// ============================================================
// Dokumen CRUD
// ============================================================

export async function fetchAllDokumen(
  page = 1,
  limit = 20
): Promise<{ data: Dokumen[]; total: number; page: number; limit: number }> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('dokumen')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    data: (data || []).map(mapDbToDokumen),
    total: count || 0,
    page,
    limit,
  };
}

export async function fetchDokumenByPegawaiId(pegawaiId: number): Promise<Dokumen[]> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('*')
    .eq('pegawai_id', pegawaiId)
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(mapDbToDokumen);
}

export async function insertDokumen(d: Partial<Dokumen>): Promise<Dokumen> {
  const dbData = mapDokumenToDb(d);
  const { data, error } = await supabase
    .from('dokumen')
    .insert(dbData)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbToDokumen(data);
}

export async function updateDokumenStatusInDB(id: number, status: string): Promise<void> {
  const { error } = await supabase
    .from('dokumen')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDokumenFromDB(id: number): Promise<void> {
  const { error } = await supabase
    .from('dokumen')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ============================================================
// Notifikasi CRUD
// ============================================================

export async function fetchAllNotifikasi(): Promise<Notifikasi[]> {
  const { data, error } = await supabase
    .from('notifikasi')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []).map(mapDbToNotifikasi);
}

export async function insertNotifikasi(message: string, type: string): Promise<Notifikasi> {
  const { data, error } = await supabase
    .from('notifikasi')
    .insert({ message, type })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDbToNotifikasi(data);
}

export async function markNotifikasiRead(id: number): Promise<void> {
  const { error } = await supabase
    .from('notifikasi')
    .update({ read: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function clearAllNotifikasi(): Promise<void> {
  const { error } = await supabase
    .from('notifikasi')
    .delete()
    .neq('id', 0);
  if (error) throw new Error(error.message);
}

// ============================================================
// Reset All Data
// ============================================================

export async function resetAllData(): Promise<void> {
  const { error: e1 } = await supabase.from('dokumen').delete().neq('id', 0);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from('notifikasi').delete().neq('id', 0);
  if (e2) throw new Error(e2.message);
  const { error: e3 } = await supabase.from('pegawai').delete().neq('id', 0);
  if (e3) throw new Error(e3.message);
}

// ============================================================
// File Upload (base64 in url field)
// ============================================================

export async function uploadFileAndGetUrl(
  file: File,
  _pegawaiId: number
): Promise<{ url: string; filePath: string } | null> {
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const fileName = `${_pegawaiId}/${Date.now()}_${file.name}`;
    return { url: base64, filePath: fileName };
  } catch (err) {
    console.error('Upload error:', err);
    return null;
  }
}

// ============================================================
// Compatibility exports for share page (src/app/u/[id])
// ============================================================

export async function fetchPegawai(id: number): Promise<Pegawai | null> {
  return fetchPegawaiById(id);
}

export async function addPegawaiToDB(pegawai: Pegawai): Promise<Pegawai | null> {
  try {
    const dbData = mapPegawaiToDb(pegawai);
    const { data, error } = await supabase
      .from('pegawai')
      .insert(dbData)
      .select()
      .single();
    if (error) throw error;
    return mapDbToPegawai(data);
  } catch {
    return null;
  }
}

export async function addDokumenToDB(doc: Omit<Dokumen, 'id'>): Promise<Dokumen | null> {
  try {
    const dbData = mapDokumenToDb(doc);
    const { data, error } = await supabase
      .from('dokumen')
      .insert(dbData)
      .select()
      .single();
    if (error) throw error;
    return mapDbToDokumen(data);
  } catch {
    return null;
  }
}

export async function addNotifikasiToDB(message: string, type: string): Promise<boolean> {
  try {
    await insertNotifikasi(message, type);
    return true;
  } catch {
    return false;
  }
}