import { supabase } from './supabase';
import type { Pegawai, Dokumen, Notifikasi, AppConfig } from './types';

// ========================================
// PEGAWAI
// ========================================

function mapPegawaiFromDB(row: Record<string, unknown>): Pegawai {
  return {
    id: row.id as number,
    nip: (row.nip as string) || '',
    nama: (row.nama as string) || '',
    jenisASN: (row.jenisASN as string) || 'PNS',
    golongan: (row.golongan as string) || '',
    jabatan: (row.jabatan as string) || '',
    unitKerja: (row.unitKerja as string) || '',
    tempatLahir: (row.tempatLahir as string) || '',
    tanggalLahir: (row.tanggalLahir as string) || '',
    jenisKelamin: (row.jenisKelamin as string) || '',
    agama: (row.agama as string) || '',
    email: (row.email as string) || '',
    hp: (row.hp as string) || '',
    alamat: (row.alamat as string) || '',
    pendidikanTerakhir: (row.pendidikanTerakhir as string) || '',
    status: (row.status as string) || 'Aktif',
    masaBerlaku: (row.masaBerlaku as string) || '',
  };
}

export async function fetchPegawai(): Promise<Pegawai[]> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .order('nama', { ascending: true });
  if (error) { console.error('fetchPegawai:', error); return []; }
  return (data || []).map(mapPegawaiFromDB);
}

export async function fetchPegawaiByNIP(nip: string): Promise<Pegawai | null> {
  const { data, error } = await supabase
    .from('pegawai')
    .select('*')
    .eq('nip', nip)
    .single();
  if (error || !data) return null;
  return mapPegawaiFromDB(data);
}

export async function addPegawai(p: Pegawai): Promise<Pegawai | null> {
  const row: Record<string, unknown> = {
    nip: p.nip, nama: p.nama, jenisASN: p.jenisASN,
    golongan: p.golongan, jabatan: p.jabatan, unitKerja: p.unitKerja,
    tempatLahir: p.tempatLahir, tanggalLahir: p.tanggalLahir,
    jenisKelamin: p.jenisKelamin, agama: p.agama,
    email: p.email, hp: p.hp, alamat: p.alamat,
    pendidikanTerakhir: p.pendidikanTerakhir,
    status: p.status, masaBerlaku: p.masaBerlaku,
  };
  const { data, error } = await supabase
    .from('pegawai').insert(row).select().single();
  if (error) { console.error('addPegawai:', error); return null; }
  return mapPegawaiFromDB(data);
}

export async function updatePegawai(id: number, data: Partial<Pegawai>): Promise<Pegawai | null> {
  const { data: result, error } = await supabase
    .from('pegawai').update(data as Record<string, unknown>).eq('id', id).select().single();
  if (error) { console.error('updatePegawai:', error); return null; }
  return mapPegawaiFromDB(result);
}

export async function deletePegawai(id: number): Promise<boolean> {
  const { data: docs } = await supabase
    .from('dokumen').select('filePath').eq('pegawaiId', id);
  if (docs) {
    const paths = docs.map((d: { filePath: string }) => d.filePath).filter(Boolean);
    if (paths.length > 0) await supabase.storage.from('dokumen').remove(paths);
  }
  const { error } = await supabase.from('pegawai').delete().eq('id', id);
  if (error) { console.error('deletePegawai:', error); return false; }
  return true;
}

// ========================================
// DOKUMEN
// ========================================

function mapDokumenFromDB(row: Record<string, unknown>): Dokumen {
  let url = '';
  const filePath = (row.filePath as string) || '';
  if (filePath) {
    const { data: pub } = supabase.storage.from('dokumen').getPublicUrl(filePath);
    url = pub?.publicUrl || '';
  }
  return {
    id: row.id as number,
    pegawaiId: row.pegawaiId as number,
    pegawaiNama: (row.pegawaiNama as string) || '',
    nip: (row.nip as string) || '',
    jenisASN: (row.jenisASN as string) || '',
    jenisDokumen: (row.jenisDokumen as string) || '',
    tanggal: (row.tanggal as string) || '',
    status: (row.status as string) || 'Pending',
    url,
    fileName: (row.fileName as string) || '',
    expiry: (row.expiry as string) || '',
    keterangan: (row.keterangan as string) || '',
    periode: (row.periode as string) || '',
    tmtAwal: (row.tmtAwal as string) || '',
    tmtAkhir: (row.tmtAkhir as string) || '',
    filePath,
    fileSize: (row.fileSize as number) || 0,
  };
}

export async function fetchDokumen(): Promise<Dokumen[]> {
  const { data, error } = await supabase
    .from('dokumen').select('*').order('tanggal', { ascending: false });
  if (error) { console.error('fetchDokumen:', error); return []; }
  return (data || []).map(mapDokumenFromDB);
}

export async function fetchDokumenByPegawaiId(pegawaiId: number): Promise<Dokumen[]> {
  const { data, error } = await supabase
    .from('dokumen').select('*')
    .eq('pegawaiId', pegawaiId)
    .order('tanggal', { ascending: false });
  if (error) { console.error('fetchDokumenByPegawaiId:', error); return []; }
  return (data || []).map(mapDokumenFromDB);
}

export async function uploadFileAndGetUrl(file: File): Promise<{ path: string; url: string } | null> {
  const ext = file.name.split('.').pop() || 'pdf';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage
    .from('dokumen').upload(fileName, file, { contentType: file.type, cacheControl: '3600' });
  if (error) { console.error('uploadFile:', error); return null; }
  const { data: pub } = supabase.storage.from('dokumen').getPublicUrl(data.path);
  return { path: data.path, url: pub?.publicUrl || '' };
}

export async function addDokumenToDB(doc: Record<string, unknown>): Promise<Dokumen | null> {
  const { data, error } = await supabase
    .from('dokumen').insert(doc).select().single();
  if (error) { console.error('addDokumen:', error); return null; }
  return mapDokumenFromDB(data);
}

export async function updateDokumenStatus(id: number, status: string): Promise<boolean> {
  const { error } = await supabase.from('dokumen').update({ status }).eq('id', id);
  if (error) { console.error('updateDokumenStatus:', error); return false; }
  return true;
}

export async function updateDokumenKeterangan(id: number, keterangan: string): Promise<boolean> {
  const { error } = await supabase.from('dokumen').update({ keterangan }).eq('id', id);
  if (error) { console.error('updateDokumenKeterangan:', error); return false; }
  return true;
}

export async function deleteDokumen(id: number): Promise<boolean> {
  const { data: doc } = await supabase
    .from('dokumen').select('filePath').eq('id', id).single();
  if (doc?.filePath) {
    await supabase.storage.from('dokumen').remove([doc.filePath]);
  }
  const { error } = await supabase.from('dokumen').delete().eq('id', id);
  if (error) { console.error('deleteDokumen:', error); return false; }
  return true;
}

// ========================================
// NOTIFIKASI
// ========================================

export async function fetchNotifikasi(): Promise<Notifikasi[]> {
  const { data, error } = await supabase
    .from('notifikasi').select('*').order('id', { ascending: false });
  if (error) { console.error('fetchNotifikasi:', error); return []; }
  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as number,
    pesan: (row.pesan as string) || '',
    tipe: (row.tipe as string) || 'info',
    dibaca: (row.dibaca as boolean) || false,
    tanggal: (row.tanggal as string) || '',
  }));
}

export async function addNotifikasi(pesan: string, tipe: string): Promise<Notifikasi | null> {
  const { data, error } = await supabase
    .from('notifikasi')
    .insert({ pesan, tipe, dibaca: false, tanggal: new Date().toISOString() })
    .select().single();
  if (error) { console.error('addNotifikasi:', error); return null; }
  return { id: data.id, pesan: data.pesan, tipe: data.tipe, dibaca: data.dibaca, tanggal: data.tanggal };
}

export async function markNotifikasiRead(id: number): Promise<void> {
  await supabase.from('notifikasi').update({ dibaca: true }).eq('id', id);
}

export async function markAllNotifikasiRead(): Promise<void> {
  await supabase.from('notifikasi').update({ dibaca: true }).eq('dibaca', false);
}

// ========================================
// APP CONFIG
// ========================================

export async function fetchAppConfig(): Promise<AppConfig | null> {
  const { data, error } = await supabase.from('app_config').select('*');
  if (error || !data || data.length === 0) return null;
  const config: AppConfig = {
    namaInstansi: 'Dinas Pendidikan Kabupaten',
    alamatInstansi: '', teleponInstansi: '', emailInstansi: '',
    maxFileUpload: 5, blurThreshold: 80, autoApprove: false, retentionDays: 365,
  };
  for (const row of data) {
    const key = row.key as string;
    const val = row.value as string;
    if (key === 'namaInstansi') config.namaInstansi = val;
    else if (key === 'alamatInstansi') config.alamatInstansi = val;
    else if (key === 'teleponInstansi') config.teleponInstansi = val;
    else if (key === 'emailInstansi') config.emailInstansi = val;
    else if (key === 'maxFileUpload') config.maxFileUpload = Number(val) || 5;
    else if (key === 'blurThreshold') config.blurThreshold = Number(val) || 80;
    else if (key === 'autoApprove') config.autoApprove = val === 'true';
    else if (key === 'retentionDays') config.retentionDays = Number(val) || 365;
  }
  return config;
}

export async function updateAppConfig(config: AppConfig): Promise<boolean> {
  const rows = [
    { key: 'namaInstansi', value: config.namaInstansi },
    { key: 'alamatInstansi', value: config.alamatInstansi },
    { key: 'teleponInstansi', value: config.teleponInstansi },
    { key: 'emailInstansi', value: config.emailInstansi },
    { key: 'maxFileUpload', value: String(config.maxFileUpload) },
    { key: 'blurThreshold', value: String(config.blurThreshold) },
    { key: 'autoApprove', value: String(config.autoApprove) },
    { key: 'retentionDays', value: String(config.retentionDays) },
  ];
  for (const row of rows) {
    await supabase.from('app_config').upsert(row, { onConflict: 'key' });
  }
  return true;
}