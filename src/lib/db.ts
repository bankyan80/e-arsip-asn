import { supabase } from './supabase';
import type { Pegawai, Dokumen, Notifikasi } from './types';

// ===== PEGAWAI =====

export async function fetchPegawai(): Promise<Pegawai[]> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .order('nama', { ascending: true });

  if (error) {
    console.error('Error fetching pegawai:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    nip: row.nip || '',
    nama: row.nama || '',
    jenisASN: row.jenis_asn || '',
    jabatan: row.jabatan || '',
    golongan: row.golongan || '',
    unitKerja: row.unit_kerja || '',
    email: row.email || '',
    hp: row.hp || '',
    tanggalLahir: row.tanggal_lahir || '',
    status: row.status || 'Aktif',
  }));
}

export async function fetchPegawaiByNIP(nip: string): Promise<Pegawai | undefined> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .eq('nip', nip)
    .single();

  if (error || !data) return undefined;

  return {
    id: data.id,
    nip: data.nip || '',
    nama: data.nama || '',
    jenisASN: data.jenis_asn || '',
    jabatan: data.jabatan || '',
    golongan: data.golongan || '',
    unitKerja: data.unit_kerja || '',
    email: data.email || '',
    hp: data.hp || '',
    tanggalLahir: data.tanggal_lahir || '',
    status: data.status || 'Aktif',
  };
}

export async function addPegawaiToDB(pg: Pegawai): Promise<Pegawai | null> {
  const { data, error } = await supabase
    .from('pegawai')
    .insert({
      nip: pg.nip,
      nama: pg.nama,
      jenis_asn: pg.jenisASN,
      jabatan: pg.jabatan,
      golongan: pg.golongan,
      unit_kerja: pg.unitKerja,
      email: pg.email,
      hp: pg.hp,
      tanggal_lahir: pg.tanggalLahir,
      status: pg.status,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding pegawai:', error);
    return null;
  }

  return {
    id: data.id,
    nip: data.nip || '',
    nama: data.nama || '',
    jenisASN: data.jenis_asn || '',
    jabatan: data.jabatan || '',
    golongan: data.golongan || '',
    unitKerja: data.unit_kerja || '',
    email: data.email || '',
    hp: data.hp || '',
    tanggalLahir: data.tanggal_lahir || '',
    status: data.status || 'Aktif',
  };
}

export async function updatePegawaiInDB(id: number, pg: Partial<Pegawai>): Promise<boolean> {
  const row: Record<string, unknown> = {};
  if (pg.nip !== undefined) row.nip = pg.nip;
  if (pg.nama !== undefined) row.nama = pg.nama;
  if (pg.jenisASN !== undefined) row.jenis_asn = pg.jenisASN;
  if (pg.jabatan !== undefined) row.jabatan = pg.jabatan;
  if (pg.golongan !== undefined) row.golongan = pg.golongan;
  if (pg.unitKerja !== undefined) row.unit_kerja = pg.unitKerja;
  if (pg.email !== undefined) row.email = pg.email;
  if (pg.hp !== undefined) row.hp = pg.hp;
  if (pg.tanggalLahir !== undefined) row.tanggal_lahir = pg.tanggalLahir;
  if (pg.status !== undefined) row.status = pg.status;

  const { error } = await supabase
    .from('pegawai')
    .update(row)
    .eq('id', id);

  if (error) {
    console.error('Error updating pegawai:', error);
    return false;
  }
  return true;
}

export async function deletePegawaiFromDB(id: number): Promise<boolean> {
  const { data: docs } = await supabase
    .from('dokumen')
    .select('file_path')
    .eq('pegawai_id', id);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.file_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await supabase.storage.from('dokumen').remove(paths);
    }
  }

  const { error } = await supabase
    .from('pegawai')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting pegawai:', error);
    return false;
  }
  return true;
}

// ===== DOKUMEN =====

export async function fetchDokumen(): Promise<Dokumen[]> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('*')
    .order('tanggal', { ascending: false });

  if (error) {
    console.error('Error fetching dokumen:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    pegawaiId: row.pegawai_id,
    pegawaiNama: row.pegawai_nama || '',
    nip: row.nip || '',
    jenisASN: row.jenis_asn || '',
    jenisDokumen: row.jenis_dokumen || '',
    tanggal: row.tanggal || '',
    status: row.status || 'Pending',
    url: row.url || '',
    expiry: row.expiry || '',
    fileName: row.file_name || '',
    keterangan: row.keterangan || '',
    periode: row.periode || '',
    tmtAwal: row.tmt_awal || '',
    tmtAkhir: row.tmt_akhir || '',
    filePath: row.file_path || '',
    fileSize: row.file_size || 0,
  }));
}

export async function fetchDokumenByPegawaiId(pegawaiId: number): Promise<Dokumen[]> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('*')
    .eq('pegawai_id', pegawaiId)
    .order('tanggal', { ascending: false });

  if (error) {
    console.error('Error fetching dokumen for pegawai:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    pegawaiId: row.pegawai_id,
    pegawaiNama: row.pegawai_nama || '',
    nip: row.nip || '',
    jenisASN: row.jenis_asn || '',
    jenisDokumen: row.jenis_dokumen || '',
    tanggal: row.tanggal || '',
    status: row.status || 'Pending',
    url: row.url || '',
    expiry: row.expiry || '',
    fileName: row.file_name || '',
    keterangan: row.keterangan || '',
    periode: row.periode || '',
    tmtAwal: row.tmt_awal || '',
    tmtAkhir: row.tmt_akhir || '',
    filePath: row.file_path || '',
    fileSize: row.file_size || 0,
  }));
}

export async function uploadFileAndGetUrl(file: File, pegawaiId: number): Promise<{ url: string; filePath: string } | null> {
  const ext = file.name.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const safeFileName = `${pegawaiId}_${timestamp}.${ext}`;

  console.log('[DB] Uploading file to storage bucket "dokumen":', safeFileName, 'size:', file.size);

  const { data, error } = await supabase.storage
    .from('dokumen')
    .upload(safeFileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[DB] Storage upload FAILED:', error.message, 'code:', error.name);
    return null;
  }

  console.log('[DB] Storage upload SUCCESS, path:', data.path);

  const { data: urlData } = supabase.storage
    .from('dokumen')
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    filePath: data.path,
  };
}

export async function addDokumenToDB(doc: Omit<Dokumen, 'id'>): Promise<Dokumen | null> {
  const row: Record<string, unknown> = {
    pegawai_id: doc.pegawaiId,
    pegawai_nama: doc.pegawaiNama,
    nip: doc.nip,
    jenis_asn: doc.jenisASN,
    jenis_dokumen: doc.jenisDokumen,
    tanggal: doc.tanggal,
    status: doc.status,
    url: doc.url,
    expiry: doc.expiry,
    file_name: doc.fileName,
    keterangan: doc.keterangan,
  };

  if (doc.periode) row.periode = doc.periode;
  if (doc.tmtAwal) row.tmt_awal = doc.tmtAwal;
  if (doc.tmtAkhir) row.tmt_akhir = doc.tmtAkhir;
  if (doc.filePath) row.file_path = doc.filePath;
  if (doc.fileSize) row.file_size = doc.fileSize;

  const { data, error } = await supabase
    .from('dokumen')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[DB] addDokumenToDB FAILED:', error.message, 'code:', error.code, 'details:', error.details);
    return null;
  }

  console.log('[DB] addDokumenToDB SUCCESS, id:', data.id);

  return {
    id: data.id,
    pegawaiId: data.pegawai_id,
    pegawaiNama: data.pegawai_nama || '',
    nip: data.nip || '',
    jenisASN: data.jenis_asn || '',
    jenisDokumen: data.jenis_dokumen || '',
    tanggal: data.tanggal || '',
    status: data.status || 'Pending',
    url: data.url || '',
    expiry: data.expiry || '',
    fileName: data.file_name || '',
    keterangan: data.keterangan || '',
    periode: data.periode || '',
    tmtAwal: data.tmt_awal || '',
    tmtAkhir: data.tmt_akhir || '',
    filePath: data.file_path || '',
    fileSize: data.file_size || 0,
  };
}

export async function updateDokumenStatusInDB(id: number, status: 'Pending' | 'Approved' | 'Rejected'): Promise<boolean> {
  const { error } = await supabase
    .from('dokumen')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating dokumen status:', error);
    return false;
  }
  return true;
}

export async function updateDokumenKeteranganInDB(id: number, keterangan: string): Promise<boolean> {
  const { error } = await supabase
    .from('dokumen')
    .update({ keterangan })
    .eq('id', id);

  if (error) {
    console.error('Error updating dokumen keterangan:', error);
    return false;
  }
  return true;
}

export async function deleteDokumenFromDB(id: number, filePath?: string): Promise<boolean> {
  if (filePath) {
    await supabase.storage.from('dokumen').remove([filePath]);
  }

  const { error } = await supabase
    .from('dokumen')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting dokumen:', error);
    return false;
  }
  return true;
}

// ===== NOTIFIKASI =====

export async function fetchNotifikasi(): Promise<Notifikasi[]> {
  const { data, error } = await supabase
    .from('notifikasi')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifikasi:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    message: row.message || '',
    type: row.type || 'info',
    read: row.read || false,
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function addNotifikasiToDB(message: string, type: Notifikasi['type']): Promise<Notifikasi | null> {
  const { data, error } = await supabase
    .from('notifikasi')
    .insert({ message, type })
    .select()
    .single();

  if (error) {
    console.error('Error adding notifikasi:', error);
    return null;
  }

  return {
    id: data.id,
    message: data.message || '',
    type: data.type || 'info',
    read: data.read || false,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function markNotifikasiReadInDB(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('notifikasi')
    .update({ read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking notifikasi read:', error);
    return false;
  }
  return true;
}

export async function markAllNotifikasiReadInDB(): Promise<boolean> {
  const { error } = await supabase
    .from('notifikasi')
    .update({ read: true })
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifikasi read:', error);
    return false;
  }
  return true;
}

export async function clearNotifikasiInDB(): Promise<boolean> {
  const { error } = await supabase
    .from('notifikasi')
    .delete()
    .neq('id', 0);

  if (error) {
    console.error('Error clearing notifikasi:', error);
    return false;
  }
  return true;
}