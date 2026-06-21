import { Router } from 'express';
import path from 'path';
import { listArsipByPegawai, getArsipData, createArsipData, updateArsipData, getSettingValue } from '../lib/data';
import { uploadFile, deleteFile } from '../lib/storage';
import { arsipUploadSchema } from '../lib/validation';
import { Arsip, DocumentVersion, SessionData } from '../src/types';

const MIME_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};
const ALLOWED_EXT = Object.keys(MIME_MAP);

function validateFile(reqFile: Express.Multer.File): string | null {
  const ext = path.extname(reqFile.originalname).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) return 'Format berkas tidak diizinkan.';
  const expectedMimes = MIME_MAP[ext];
  if (expectedMimes && !expectedMimes.includes(reqFile.mimetype)) {
    return `Tipe berkas "${reqFile.mimetype}" tidak sesuai dengan ekstensi "${ext}".`;
  }
  return null;
}

export function createArsipRouter(requireAuth: any, upload: any, logAction: any) {
  const router = Router();

  router.get('/me', requireAuth, async (req, res) => {
    const session = (req as any).session as SessionData;
    try {
      const list = await listArsipByPegawai(session.pegawaiId);
      return res.json(list);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil dokumen arsip Anda.' });
    }
  });

  router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    const session = (req as any).session as SessionData;
    if (!req.file) return res.status(400).json({ error: 'Berkas dokumen wajib diupload.' });
    if (req.file.size > 10 * 1024 * 1024) return res.status(400).json({ error: 'Ukuran file melebihi batas 10 MB.' });

    const parsed = arsipUploadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Semua metadata arsip wajib diisi.' });
    const { kelompokArsip, jenisDokumen, namaDokumen, nomorDokumen, tanggalDokumen, tahun } = parsed.data;

    const fileErr = validateFile(req.file);
    if (fileErr) return res.status(400).json({ error: fileErr });

    try {
      const uploadDetails = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, {
        instansiId: session.instansiId, pegawaiId: session.pegawaiId,
        kelompokArsip, tahun, jenisDokumen, namaPegawai: session.nama
      });

      const newArsip: Arsip = {
        id: 'ARS_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        pegawaiId: session.pegawaiId, nip: session.nip, nik: session.nik,
        namaPegawai: session.nama, instansiId: session.instansiId,
        namaInstansi: session.namaInstansi,
        kelompokArsip, jenisDokumen, namaDokumen, nomorDokumen, tanggalDokumen, tahun,
        fileName: req.file.originalname, fileType: req.file.mimetype, fileSize: req.file.size,
        storagePath: uploadDetails.storagePath, downloadUrl: uploadDetails.downloadUrl,
        statusValidasi: 'Menunggu Validasi', deleted: false,
        uploadedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        uploadedBy: session.id, updatedBy: session.id,
        versionHistory: [{ versionId: 'V1', fileName: req.file.originalname, fileSize: req.file.size,
          downloadUrl: uploadDetails.downloadUrl, updatedAt: new Date().toISOString(),
          updatedByNama: `${session.nama} (${session.role === 'pegawai' ? 'Pegawai' : 'Admin'})`,
          statusValidasi: 'Menunggu Validasi', nomorDokumen, tanggalDokumen, tahun,
          catatanAdmin: '', changeSummary: 'Unggah berkas pertama' }]
      };

      const result = await createArsipData(newArsip);
      await logAction(session, 'UPLOAD_ARSIP', `Berhasil mengunggah dokumen baru: ${jenisDokumen} (${namaDokumen})`, result.id, namaDokumen);
      return res.status(201).json({ message: 'Arsip berhasil disimpan.', arsip: result });
    } catch (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Gagal menyimpan unggahan arsip.' });
    }
  });

  router.patch('/:id', requireAuth, upload.single('file'), async (req, res) => {
    const session = (req as any).session as SessionData;
    const { id } = req.params;
    const { kelompokArsip, jenisDokumen, namaDokumen, nomorDokumen, tanggalDokumen, tahun } = req.body;

    try {
      const existingArsip = await getArsipData(id);
      if (!existingArsip) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
      if (session.role === 'pegawai' && existingArsip.pegawaiId !== session.pegawaiId) {
        return res.status(403).json({ error: 'Akses ditolak. Dokumen ini bukan milik Anda.' });
      }

      const updates: Partial<Arsip> = { updatedBy: session.id, updatedAt: new Date().toISOString() };
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
        updates.statusValidasi = 'Menunggu Validasi';
      }

      let history = existingArsip.versionHistory;
      if (!history || history.length === 0) {
        history = [{
          versionId: 'V1', fileName: existingArsip.fileName, fileSize: existingArsip.fileSize,
          downloadUrl: existingArsip.downloadUrl,
          updatedAt: existingArsip.uploadedAt || existingArsip.updatedAt || new Date().toISOString(),
          updatedByNama: `${existingArsip.namaPegawai} (Pegawai)`,
          statusValidasi: existingArsip.statusValidasi, nomorDokumen: existingArsip.nomorDokumen,
          tanggalDokumen: existingArsip.tanggalDokumen, tahun: existingArsip.tahun,
          catatanAdmin: existingArsip.catatanAdmin || '', changeSummary: 'Unggah berkas pertama'
        }];
      }

      const nextVerNum = history.length + 1;
      const nextVersion: DocumentVersion = {
        versionId: `V${nextVerNum}`, fileName: updates.fileName || existingArsip.fileName,
        fileSize: updates.fileSize !== undefined ? updates.fileSize : existingArsip.fileSize,
        downloadUrl: updates.downloadUrl || existingArsip.downloadUrl,
        updatedAt: new Date().toISOString(),
        updatedByNama: `${session.nama} (${session.role === 'pegawai' ? 'Pegawai' : 'Admin'})`,
        statusValidasi: (updates.statusValidasi || existingArsip.statusValidasi) as 'Menunggu Validasi' | 'Valid' | 'Perlu Perbaikan' | 'Ditolak',
        nomorDokumen: updates.nomorDokumen || existingArsip.nomorDokumen,
        tanggalDokumen: updates.tanggalDokumen || existingArsip.tanggalDokumen,
        tahun: updates.tahun || existingArsip.tahun,
        catatanAdmin: existingArsip.catatanAdmin || '',
        changeSummary: req.file ? 'Pembaruan Berkas Dokumen & Detail' : 'Pembaruan Detail Metadata Dokumen'
      };

      updates.versionHistory = [...history, nextVersion];
      const result = await updateArsipData(id, updates);
      await logAction(session, 'EDIT_ARSIP', `Memperbarui detail arsip: ${existingArsip.jenisDokumen}`, id, namaDokumen || existingArsip.namaDokumen);
      return res.json({ message: 'Arsip berhasil disunting.', arsip: result });
    } catch {
      return res.status(500).json({ error: 'Gagal mengubah dokumen.' });
    }
  });

  router.delete('/:id', requireAuth, async (req, res) => {
    const session = (req as any).session as SessionData;
    const { id } = req.params;
    try {
      const existingArsip = await getArsipData(id);
      if (!existingArsip) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
      if (session.role === 'pegawai' && existingArsip.pegawaiId !== session.pegawaiId) {
        return res.status(403).json({ error: 'Akses ditolak. Dokumen ini bukan milik Anda.' });
      }
      if (existingArsip.statusValidasi === 'Valid') {
        const allowDelete = await getSettingValue('allowDeleteValid', 'false');
        if (allowDelete !== 'true') {
          return res.status(400).json({ error: 'Dokumen yang telah berstatus VALID tidak diperbolehkan untuk dihapus pegawai.' });
        }
      }
      await updateArsipData(id, { deleted: true });
      if (existingArsip.storagePath) await deleteFile(existingArsip.storagePath);
      await logAction(session, 'HAPUS_ARSIP', `Pegawai menghapus arsip: ${existingArsip.jenisDokumen}`, id, existingArsip.namaDokumen);
      return res.json({ message: 'Arsip berhasil dihapus.' });
    } catch {
      return res.status(500).json({ error: 'Gagal melakukan penghapusan.' });
    }
  });

  return router;
}
