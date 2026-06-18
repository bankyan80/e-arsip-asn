import { Router } from 'express';
import {
  listAllPegawai, listAllArsipAdmin, getArsipData, updateArsipData,
  findPegawaiByCredentials, getInstansiData, adminCreatePegawai,
  getLogsData, listAllInstansi, getSettingValue, updateSettingValue
} from '../lib/data';
import { validasiSchema, createPegawaiSchema, settingSchema } from '../lib/validation';
import { STATIC_JENIS_DOKUMEN } from '../lib/constants';
import { SessionData, Pegawai, DocumentVersion } from '../src/types';

export function createAdminRouter(requireAuth: any, requireRole: any, logAction: any) {
  const router = Router();

  router.get('/pegawai', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const filterInstansi = req.query.instansiId as string;
    try {
      const targetInstansi = session.role === 'admin_instansi' ? session.instansiId : filterInstansi;
      const employees = await listAllPegawai(targetInstansi);
      return res.json(employees);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil data ASN.' });
    }
  });

  router.post('/pegawai', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const parsed = createPegawaiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Mohon isi seluruh data pegawai wajib.' });
    const body = parsed.data;

    try {
      const existing = await findPegawaiByCredentials(body.nip, 'NIP', body.tanggalLahir);
      if (existing) return res.status(400).json({ error: 'Pegawai dengan NIP dan tanggal lahir tersebut sudah ada.' });

      let instansiId = body.instansiId || 'INST001';
      if (session.role === 'admin_instansi') instansiId = session.instansiId;

      let instansiName = 'Badan Kepegawaian Daerah';
      if (instansiId) {
        const ins = await getInstansiData(instansiId);
        if (ins) instansiName = ins.namaInstansi;
      }

      const p: Pegawai = {
        id: 'PGW_' + Date.now(), instansiId, namaInstansi: instansiName,
        namaPegawai: body.namaPegawai, nip: body.nip, nik: body.nik,
        tanggalLahir: body.tanggalLahir,
        jenisKelamin: (body.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki') as 'Laki-laki' | 'Perempuan',
        jabatan: body.jabatan || 'Staf Kepegawaian',
        statusPegawai: (body.statusPegawai || 'PNS') as 'PNS' | 'PPPK' | 'PPPK Paruh Waktu' | 'CPNS' | 'Lainnya',
        pangkatGolongan: body.pangkatGolongan || 'Penata / III.c',
        pendidikanTerakhir: body.pendidikanTerakhir || 'S1',
        nomorHp: body.nomorHp || '', email: body.email || '', alamat: body.alamat || '',
        role: body.role === 'admin_instansi' ? 'admin_instansi' : 'pegawai',
        statusAktif: body.statusAktif !== undefined ? body.statusAktif : true,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };

      const result = await adminCreatePegawai(p);
      await logAction(session, 'CREATE_PEGAWAI', `Administrator (${session.nama}) mendaftarkan pegawai baru: ${body.namaPegawai} (${body.nip})`);
      return res.status(201).json(result);
    } catch {
      return res.status(500).json({ error: 'Gagal membuat data pegawai baru.' });
    }
  });

  router.get('/arsip', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const filterInstansi = req.query.instansiId as string;
    try {
      const targetInstansi = session.role === 'admin_instansi' ? session.instansiId : filterInstansi;
      const archives = await listAllArsipAdmin(targetInstansi);
      return res.json(archives);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil arsip.' });
    }
  });

  router.patch('/arsip/:id/validasi', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const { id } = req.params;
    const parsed = validasiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Status validasi tidak valid.' });
    const { statusValidasi, catatanAdmin } = parsed.data;

    try {
      const arc = await getArsipData(id);
      if (!arc) return res.status(404).json({ error: 'Dokumen arsip tidak ditemukan.' });
      if (session.role === 'admin_instansi' && arc.instansiId !== session.instansiId) {
        return res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak memvalidasi dokumen di luar instansi Anda.' });
      }

      let history = arc.versionHistory;
      if (!history || history.length === 0) {
        history = [{ versionId: 'V1', fileName: arc.fileName, fileSize: arc.fileSize,
          downloadUrl: arc.downloadUrl, updatedAt: arc.uploadedAt || arc.updatedAt || new Date().toISOString(),
          updatedByNama: `${arc.namaPegawai} (Pegawai)`, statusValidasi: arc.statusValidasi,
          nomorDokumen: arc.nomorDokumen, tanggalDokumen: arc.tanggalDokumen, tahun: arc.tahun,
          catatanAdmin: arc.catatanAdmin || '', changeSummary: 'Unggah berkas pertama' }];
      }

      const nextVersion: DocumentVersion = {
        versionId: `V${history.length + 1}`, fileName: arc.fileName, fileSize: arc.fileSize,
        downloadUrl: arc.downloadUrl, updatedAt: new Date().toISOString(),
        updatedByNama: `${session.nama} (Admin)`, statusValidasi: statusValidasi as any,
        nomorDokumen: arc.nomorDokumen, tanggalDokumen: arc.tanggalDokumen, tahun: arc.tahun,
        catatanAdmin: catatanAdmin || '', changeSummary: `Verifikasi & Evaluasi: ${statusValidasi}`
      };

      const updates = { statusValidasi, catatanAdmin: catatanAdmin || '', updatedAt: new Date().toISOString(), updatedBy: session.id, versionHistory: [...history, nextVersion] };
      const result = await updateArsipData(id, updates);
      await logAction(session, 'VALIDASI_ARSIP', `Mengevaluasi arsip pegawai (${arc.namaPegawai} - ${arc.jenisDokumen}): Status BARU=${statusValidasi}. Catatan: ${catatanAdmin || 'tidak ada.'}`, id, arc.namaDokumen);
      return res.json({ message: 'Status validasi berhasil diperbarui.', arsip: result });
    } catch {
      return res.status(500).json({ error: 'Gagal memproses validasi.' });
    }
  });

  router.get('/rekap', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const filterInstansi = req.query.instansiId as string;
    try {
      const targetInstansi = session.role === 'admin_instansi' ? session.instansiId : filterInstansi;
      const pegawais = await listAllPegawai(targetInstansi);
      const archives = await listAllArsipAdmin(targetInstansi);

      const statistics = pegawais.map((p: any) => {
        const staffArchs = archives.filter((a: any) => a.pegawaiId === p.id);
        const mandatoryDocs = STATIC_JENIS_DOKUMEN.filter((doc: any) => doc.wajib && (doc.berlakuUntuk === 'Semua' || doc.berlakuUntuk === p.statusPegawai));
        const validCount = staffArchs.filter((a: any) => a.statusValidasi === 'Valid').length;
        const pendingCount = staffArchs.filter((a: any) => a.statusValidasi === 'Menunggu Validasi').length;
        const reviseCount = staffArchs.filter((a: any) => a.statusValidasi === 'Perlu Perbaikan').length;
        const uploadedMandatory = mandatoryDocs.filter((m: any) => staffArchs.some((a: any) => a.jenisDokumen === m.namaDokumen && a.statusValidasi === 'Valid')).length;
        const totalWajib = mandatoryDocs.length;
        const pctKelengkapan = totalWajib > 0 ? Math.round((uploadedMandatory / totalWajib) * 100) : 100;
        return {
          pegawaiId: p.id, namaPegawai: p.namaPegawai, nip: p.nip, jabatan: p.jabatan,
          instansiId: p.instansiId, namaInstansi: p.namaInstansi, statusPegawai: p.statusPegawai,
          jumlahArsipUploaded: staffArchs.length, jumlahArsipValid: validCount,
          jumlahArsipPending: pendingCount, jumlahArsipPerbaikan: reviseCount,
          jumlahWajib: totalWajib, jumlahWajibValid: uploadedMandatory, persentaseKelengkapan: pctKelengkapan
        };
      });
      return res.json(statistics);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil data rekap kelengkapan.' });
    }
  });

  router.get('/logs', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    try {
      const list = await getLogsData();
      if (session.role === 'admin_instansi') {
        const targetPegawaiList = await listAllPegawai(session.instansiId);
        const pIds = new Set(targetPegawaiList.map((p: any) => p.id));
        return res.json(list.filter((item: any) => pIds.has(item.pegawaiId) || item.userId === session.id));
      }
      return res.json(list);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil riwayat sistem (logs).' });
    }
  });

  router.get('/instansi', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (_req, res) => {
    try {
      const list = await listAllInstansi();
      return res.json(list);
    } catch {
      return res.status(500).json({ error: 'Gagal memuat daftar instansi.' });
    }
  });

  router.get('/settings', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (_req, res) => {
    try {
      const allowDeleteValue = await getSettingValue('allowDeleteValid', 'false');
      const limitSizeMBValue = await getSettingValue('limitSizeMB', '10');
      return res.json([
        { key: 'allowDeleteValid', value: allowDeleteValue, keterangan: 'Mengizinkan pegawai menghapus dokumen yang bersetatus VALID.' },
        { key: 'limitSizeMB', value: limitSizeMBValue, keterangan: 'Batas ukuran file maksimal di sistem (Satuan MB).' }
      ]);
    } catch {
      return res.status(500).json({ error: 'Gagal memanggil pengaturan.' });
    }
  });

  router.patch('/settings', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (req, res) => {
    const parsed = settingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Konfigurasi kunci dan nilai wajib dilampirkan.' });
    const { key, value } = parsed.data;
    try {
      await updateSettingValue(key, String(value));
      return res.json({ message: 'Pengaturan berhasil diperbaharui.' });
    } catch {
      return res.status(500).json({ error: 'Gagal menyimpan konfigurasi.' });
    }
  });

  return router;
}
