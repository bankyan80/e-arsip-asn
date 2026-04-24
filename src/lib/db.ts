import { supabase } from './supabase';
import type { Pegawai, Dokumen, Notifikasi } from './types';

function rowToPegawai(row: Record<string, unknown>): Pegawai {
  return {
    id: row.id as number,
    nip: (row.nip as string) || '',
    nama: (row.nama as string) || '',
    jenisASN: (row.jenis_asn as string) || '',
    jabatan: (row.jabatan as string) || '',
    golongan: (row.golongan as string) || '',
    unitKerja: (row.unit_kerja as string) || '',
    email: (row.email as string) || '',
    hp: (row.hp as string) || '',
    tanggalLahir: (row.tanggal_lahir as string) || '',
    status: (row.status as Pegawai['status']) || 'Aktif',
  };
}

function rowToDokumen(row: Record<string, unknown>): Dokumen {
  return {
    id: row.id as number,
    pegawaiId: row.pegawai_id as number,
    pegawaiNama: (row.pegawai_nama as string) || '',
    nip: (row.nip as string) || '',
    jenisASN: (row.jenis_asn as string) || '',
    jenisDokumen: (row.jenis_dokumen as string) || '',
    tanggal: (row.tanggal as string) || '',
    status: (['Pending', 'Approved', 'Rejected'].includes(row.status as string) ? row.status : 'Pending') as Dokumen['status'],
    url: (row.url as string) || '',
    expiry: (row.expiry as string) || '',
    fileName: (row.file_name as string) || '',
    keterangan: (row.keterangan as string) || '',
    periode: (row.periode as string) || '',
    tmtAwal: (row.tmt_awal as string) || '',
    tmtAkhir: (row.tmt_akhir as string) || '',
    filePath: (row.file_path as string) || '',
    fileSize: (row.file_size as number) || 0,
  };
}

function rowToNotifikasi(row: Record<string, unknown>): Notifikasi {
  return {
    id: row.id as number,
    message: (row.message as string) || '',
    type: (['success', 'warning', 'error', 'info'].includes(row.type as string) ? row.type : 'info') as Notifikasi['type'],
    read: Boolean(row.read),
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

// ===== PEGAWAI =====

export async function fetchPegawai(): Promise<Pegawai[]> {
  try {
    const { data, error } = await supabase.from('pegawai').select('*').order('nama', { ascending: true });
    if (error) { console.error('[DB] Error fetching pegawai:', error.message); return []; }
    return (data || []).map((row) => rowToPegawai(row as Record<string, unknown>));
  } catch (err) { console.error('[DB] EXCEPTION fetching pegawai:', err); return []; }
}

export async function fetchPegawaiByNIP(nip: string): Promise<Pegawai | undefined> {
  try {
    const { data, error } = await supabase.from('pegawai').select('*').eq('nip', nip).single();
    if (error || !data) return undefined;
    return rowToPegawai(data as Record<string, unknown>);
  } catch (err) { console.error('[DB] EXCEPTION fetching pegawai by NIP:', err); return undefined; }
}

export async function addPegawaiToDB(pg: Pegawai): Promise<Pegawai | null> {
  try {
    const { data, error } = await supabase.from('pegawai').insert({
      nip: pg.nip, nama: pg.nama, jenis_asn: pg.jenisASN, jabatan: pg.jabatan,
      golongan: pg.golongan, unit_kerja: pg.unitKerja, email: pg.email,
      hp: pg.hp, tanggal_lahir: pg.tanggalLahir, status: pg.status,
    }).select().single();
    if (error) { console.error('[DB] Error adding pegawai:', error.message); return null; }
    return rowToPegawai(data as Record<string, unknown>);
  } catch (err) { console.error('[DB] EXCEPTION adding pegawai:', err); return null; }
}

export async function addPegawaiBatchToDB(list: Pegawai[]): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  try {
    const rows = list.map((pg) => ({
      nip: pg.nip, nama: pg.nama, jenis_asn: pg.jenisASN || '', jabatan: pg.jabatan || '',
      golongan: pg.golongan || '', unit_kerja: pg.unitKerja || '', email: pg.email || '',
      hp: pg.hp || '', tanggal_lahir: pg.tanggalLahir || '', status: pg.status || 'Aktif',
    }));
    const { data, error } = await supabase.from('pegawai').insert(rows).select();
    if (error) {
      console.warn('[DB] Batch insert failed, falling back to chunk:', error.message);
      const CHUNK = 50;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { data: chunkData, error: chunkError } = await supabase.from('pegawai').insert(chunk).select();
        if (chunkError) {
          for (let j = 0; j < chunk.length; j++) {
            const { error: singleError } = await supabase.from('pegawai').insert(chunk[j]);
            if (singleError) { errors.push(`NIP "${chunk[j].nip}": ${singleError.message}`); }
            else { inserted++; }
          }
        } else { inserted += (chunkData?.length || 0); }
      }
    } else { inserted = data?.length || 0; }
  } catch (err) { console.error('[DB] EXCEPTION batch adding pegawai:', err); errors.push('Kesalahan server saat batch insert'); }
  return { inserted, errors };
}

export async function updatePegawaiInDB(id: number, pg: Partial<Pegawai>): Promise<boolean> {
  try {
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
    const { error } = await supabase.from('pegawai').update(row).eq('id', id);
    if (error) { console.error('[DB] Error updating pegawai:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION updating pegawai:', err); return false; }
}

export async function deletePegawaiFromDB(id: number): Promise<boolean> {
  try {
    const { data: docs } = await supabase.from('dokumen').select('file_path').eq('pegawai_id', id);
    if (docs && docs.length > 0) {
      const paths = docs.map((d) => (d as Record<string, unknown>).file_path).filter(Boolean) as string[];
      if (paths.length > 0) await supabase.storage.from('dokumen').remove(paths);
    }
    const { error } = await supabase.from('pegawai').delete().eq('id', id);
    if (error) { console.error('[DB] Error deleting pegawai:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION deleting pegawai:', err); return false; }
}

// ===== DOKUMEN =====

export async function fetchDokumen(): Promise<Dokumen[]> {
  try {
    const { data, error } = await supabase.from('dokumen').select('*').order('tanggal', { ascending: false });
    if (error) { console.error('[DB] Error fetching dokumen:', error.message); return []; }
    return (data || []).map((row) => rowToDokumen(row as Record<string, unknown>));
  } catch (err) { console.error('[DB] EXCEPTION fetching dokumen:', err); return []; }
}

export async function fetchDokumenByPegawaiId(pegawaiId: number): Promise<Dokumen[]> {
  try {
    const { data, error } = await supabase.from('dokumen').select('*').eq('pegawai_id', pegawaiId).order('tanggal', { ascending: false });
    if (error) { console.error('[DB] Error fetching dokumen for pegawai:', error.message); return []; }
    return (data || []).map((row) => rowToDokumen(row as Record<string, unknown>));
  } catch (err) { console.error('[DB] EXCEPTION fetching dokumen for pegawai:', err); return []; }
}

export async function uploadFileAndGetUrl(file: File, pegawaiId: number): Promise<{ url: string; filePath: string } | null> {
  try {
    const ext = file.name.split('.').pop() || 'pdf';
    const safeFileName = `${pegawaiId}_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('dokumen').upload(safeFileName, file, { cacheControl: '3600', upsert: false });
    if (error) { console.error('[DB] Storage upload FAILED:', error.message); return null; }
    const { data: urlData } = supabase.storage.from('dokumen').getPublicUrl(data.path);
    return { url: urlData.publicUrl, filePath: data.path };
  } catch (err) { console.error('[DB] EXCEPTION uploading file:', err); return null; }
}

export async function addDokumenToDB(doc: Omit<Dokumen, 'id'>): Promise<Dokumen | null> {
  try {
    const row: Record<string, unknown> = {
      pegawai_id: doc.pegawaiId, pegawai_nama: doc.pegawaiNama, nip: doc.nip, jenis_asn: doc.jenisASN,
      jenis_dokumen: doc.jenisDokumen, tanggal: doc.tanggal, status: doc.status, url: doc.url,
      expiry: doc.expiry, file_name: doc.fileName, keterangan: doc.keterangan,
    };
    if (doc.periode) row.periode = doc.periode;
    if (doc.tmtAwal) row.tmt_awal = doc.tmtAwal;
    if (doc.tmtAkhir) row.tmt_akhir = doc.tmtAkhir;
    if (doc.filePath) row.file_path = doc.filePath;
    if (doc.fileSize) row.file_size = doc.fileSize;
    const { data, error } = await supabase.from('dokumen').insert(row).select().single();
    if (error) { console.error('[DB] addDokumenToDB FAILED:', error.message); return null; }
    return rowToDokumen(data as Record<string, unknown>);
  } catch (err) { console.error('[DB] EXCEPTION adding dokumen:', err); return null; }
}

export async function updateDokumenStatusInDB(id: number, status: 'Pending' | 'Approved' | 'Rejected'): Promise<boolean> {
  try {
    const { error } = await supabase.from('dokumen').update({ status }).eq('id', id);
    if (error) { console.error('[DB] Error updating dokumen status:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION updating dokumen status:', err); return false; }
}

export async function updateDokumenKeteranganInDB(id: number, keterangan: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('dokumen').update({ keterangan }).eq('id', id);
    if (error) { console.error('[DB] Error updating dokumen keterangan:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION updating dokumen keterangan:', err); return false; }
}

export async function deleteDokumenFromDB(id: number, filePath?: string): Promise<boolean> {
  try {
    if (filePath) await supabase.storage.from('dokumen').remove([filePath]);
    const { error } = await supabase.from('dokumen').delete().eq('id', id);
    if (error) { console.error('[DB] Error deleting dokumen:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION deleting dokumen:', err); return false; }
}

// ===== NOTIFIKASI =====

export async function fetchNotifikasi(): Promise<Notifikasi[]> {
  try {
    const { data, error } = await supabase.from('notifikasi').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) { console.error('[DB] Error fetching notifikasi:', error.message); return []; }
    return (data || []).map((row) => rowToNotifikasi(row as Record<string, unknown>));
  } catch (err) { console.error('[DB] EXCEPTION fetching notifikasi:', err); return []; }
}

export async function addNotifikasiToDB(message: string, type: Notifikasi['type']): Promise<Notifikasi | null> {
  try {
    const { data, error } = await supabase.from('notifikasi').insert({ message, type }).select().single();
    if (error) { console.error('[DB] Error adding notifikasi:', error.message); return null; }
    return rowToNotifikasi(data as Record<string, unknown>);
  } catch (err) { console.error('[DB] EXCEPTION adding notifikasi:', err); return null; }
}

export async function markNotifikasiReadInDB(id: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifikasi').update({ read: true }).eq('id', id);
    if (error) { console.error('[DB] Error marking notifikasi read:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION marking notifikasi read:', err); return false; }
}

export async function markAllNotifikasiReadInDB(): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifikasi').update({ read: true }).eq('read', false);
    if (error) { console.error('[DB] Error marking all notifikasi read:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION marking all notifikasi read:', err); return false; }
}

export async function clearNotifikasiInDB(): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifikasi').delete().neq('id', 0);
    if (error) { console.error('[DB] Error clearing notifikasi:', error.message); return false; }
    return true;
  } catch (err) { console.error('[DB] EXCEPTION clearing notifikasi:', err); return false; }
}