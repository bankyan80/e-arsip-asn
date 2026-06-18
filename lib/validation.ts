import { z } from 'zod';

export const loginSchema = z.object({
  loginType: z.enum(['NIP', 'NIK', 'BOTH']),
  identifier: z.string().min(1, 'NIP/NIK wajib diisi.'),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi.')
});

export const profileUpdateSchema = z.object({
  nomorHp: z.string().optional(),
  email: z.string().email('Format email tidak valid.').optional().or(z.literal('')),
  alamat: z.string().optional()
});

export const arsipUploadSchema = z.object({
  kelompokArsip: z.string().min(1),
  jenisDokumen: z.string().min(1),
  namaDokumen: z.string().min(1),
  nomorDokumen: z.string().min(1),
  tanggalDokumen: z.string().min(1),
  tahun: z.string().min(4).max(4)
});

export const validasiSchema = z.object({
  statusValidasi: z.enum(['Valid', 'Perlu Perbaikan', 'Ditolak', 'Menunggu Validasi']),
  catatanAdmin: z.string().optional()
});

export const createPegawaiSchema = z.object({
  namaPegawai: z.string().min(1, 'Nama pegawai wajib diisi.'),
  nip: z.string().min(1, 'NIP wajib diisi.'),
  nik: z.string().min(1, 'NIK wajib diisi.'),
  tanggalLahir: z.string().min(1, 'Tanggal lahir wajib diisi.'),
  statusPegawai: z.string().min(1, 'Status pegawai wajib diisi.'),
  jenisKelamin: z.string().optional(),
  jabatan: z.string().optional(),
  pangkatGolongan: z.string().optional(),
  pendidikanTerakhir: z.string().optional(),
  nomorHp: z.string().optional(),
  email: z.string().optional(),
  alamat: z.string().optional(),
  role: z.enum(['pegawai', 'admin_instansi', 'super_admin']).optional(),
  instansiId: z.string().optional(),
  statusAktif: z.boolean().optional()
});

export const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(0)
});
