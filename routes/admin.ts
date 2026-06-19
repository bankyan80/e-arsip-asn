import { Router } from 'express';
import bcrypt from 'bcryptjs';
import {
  listAllPegawai, listAllArsipAdmin, getArsipData, updateArsipData,
  findPegawaiByCredentials, getInstansiData, adminCreatePegawai,
  getLogsData, listAllInstansi, getSettingValue, updateSettingValue, setPegawaiPassword, updatePegawaiData, deletePegawaiData,
  createKategori, updateKategori, deleteKategori,
  createJenisDokumen, updateJenisDokumen, deleteJenisDokumen,
  getKategoriList, getJenisDokumenList,
  bulkImportPegawai, clearPegawai, updateAllInstansiName,
  createArsipData, bulkDeleteArsipByUploader, bulkValidasiArsip, remapArsipJenisDokumen, dedupArsip
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

  router.get('/pegawai/duplicates', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (_req, res) => {
    try {
      const employees = await listAllPegawai();
      const grouped: Record<string, any[]> = {};
      for (const p of employees) {
        const key = p.namaPegawai?.toLowerCase().trim() || '';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({ id: p.id, namaPegawai: p.namaPegawai, nip: p.nip, nik: p.nik, instansiId: p.instansiId, namaInstansi: p.namaInstansi });
      }
      const duplicates = Object.values(grouped).filter(g => g.length > 1);
      return res.json(duplicates);
    } catch {
      return res.status(500).json({ error: 'Gagal memeriksa duplikasi.' });
    }
  });

  router.post('/pegawai', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const parsed = createPegawaiSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Mohon isi seluruh data pegawai wajib.' });
    const body = parsed.data;

    try {
      const existing = await findPegawaiByCredentials(body.nip, 'NIP');
      if (existing) return res.status(400).json({ error: 'Pegawai dengan NIP tersebut sudah ada.' });

      let instansiId = body.instansiId || 'INST001';
      if (session.role === 'admin_instansi') instansiId = session.instansiId;

      let instansiName = 'Badan Kepegawaian Daerah';
      if (instansiId) {
        const ins = await getInstansiData(instansiId);
        if (ins) instansiName = ins.namaInstansi;
      }

      const defaultPass = await bcrypt.hash(body.nip.slice(-6), 10);

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
        password: defaultPass,
        role: body.role === 'admin_instansi' || body.role === 'super_admin' ? body.role : 'pegawai',
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

  // BUP (Batas Usia Pensiun) endpoint — read only
  router.get('/bup', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (_req, res) => {
    try {
      const pegawais = await listAllPegawai();
      const now = new Date();
      const pensionAgeMap: Record<string, number> = {
        'Kepala Sekolah': 60, 'Guru': 60, 'Guru Kelas': 60,
      };
      const results: any[] = [];
      const toDeactivate: { id: string; nama: string }[] = [];

      for (const p of pegawais) {
        if (!p.tanggalLahir || !p.statusAktif) continue;
        const born = new Date(p.tanggalLahir);
        if (isNaN(born.getTime())) continue;
        const pensionAge = pensionAgeMap[p.jabatan] || 58;

        const reachedAge = new Date(born.getFullYear() + pensionAge, born.getMonth(), born.getDate());
        const mulaiPensiun = new Date(reachedAge.getFullYear(), reachedAge.getMonth() + 1, 1);

        if (mulaiPensiun <= now) {
          toDeactivate.push({ id: p.id, nama: p.namaPegawai });
          continue;
        }

        let usia = now.getFullYear() - born.getFullYear();
        const mDiff = now.getMonth() - born.getMonth();
        if (mDiff < 0 || (mDiff === 0 && now.getDate() < born.getDate())) usia--;

        const diffMs = mulaiPensiun.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);
        const months = Math.floor((diffDays % 365) / 30);
        const days = diffDays % 30;

        results.push({
          pegawaiId: p.id,
          namaPegawai: p.namaPegawai,
          nip: p.nip,
          tanggalLahir: p.tanggalLahir,
          usia,
          usiaPensiun: pensionAge,
          mulaiPensiun: mulaiPensiun.toISOString().split('T')[0],
          sisa: `${years} tahun ${months} bulan ${days} hari`,
          sisaDate: mulaiPensiun.toISOString().split('T')[0],
        });
      }

      results.sort((a, b) => new Date(a.sisaDate).getTime() - new Date(b.sisaDate).getTime());

      return res.json({ active: results, toDeactivate });
    } catch (err: any) {
      console.error('BUP error:', err?.message || err);
      return res.status(500).json({ error: 'Gagal memuat data BUP.' });
    }
  });

  // POST /bup/deactivate — performs the deactivation (idempotent, intentional)
  router.post('/bup/deactivate', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    try {
      const { pegawaiIds } = req.body || {};
      const ids: string[] = Array.isArray(pegawaiIds) ? pegawaiIds : [];

      if (ids.length === 0) {
        return res.status(400).json({ error: 'Daftar pegawaiId wajib dikirim.' });
      }

      let count = 0;
      for (const id of ids) {
        await updatePegawaiData(id, { statusAktif: false });
        count++;
      }
      await logAction(session, 'BUP_DEACTIVATE', `${count} pegawai dinonaktifkan karena BUP.`);
      return res.json({ message: `${count} pegawai berhasil dinonaktifkan.` });
    } catch (err: any) {
      console.error('BUP deactivate error:', err?.message || err);
      return res.status(500).json({ error: 'Gagal menonaktifkan pegawai.' });
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

  router.post('/arsip/bulk-validasi', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const session = (req as any).session as SessionData;
    const { statusValidasi, instansiId } = req.body || {};
    try {
      const success = await bulkValidasiArsip(instansiId || undefined, statusValidasi || 'Valid', session.id);
      if (!success) return res.status(500).json({ error: 'Gagal melakukan update massal.' });
      await logAction(session, 'BULK_VALIDASI_ARSIP', `Validasi massal semua arsip${instansiId ? ` (instansi: ${instansiId})` : ''} ke status: ${statusValidasi || 'Valid'}`);
      return res.json({ message: 'Semua arsip berhasil divalidasi.' });
    } catch {
      return res.status(500).json({ error: 'Gagal memproses validasi massal.' });
    }
  });

  router.post('/arsip/remap-jenis', requireAuth, requireRole(['super_admin']), async (_req, res) => {
    try {
      const success = await remapArsipJenisDokumen();
      if (!success) return res.status(500).json({ error: 'Gagal melakukan remap.' });
      return res.json({ message: 'Nama dokumen dan kategori arsip berhasil disesuaikan.' });
    } catch {
      return res.status(500).json({ error: 'Gagal memproses remap.' });
    }
  });

  router.post('/arsip/dedup', requireAuth, requireRole(['super_admin']), async (_req, res) => {
    try {
      const success = await dedupArsip();
      if (!success) return res.status(500).json({ error: 'Gagal melakukan dedup.' });
      return res.json({ message: 'Duplikat arsip berhasil dihapus.' });
    } catch {
      return res.status(500).json({ error: 'Gagal memproses dedup.' });
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

  router.patch('/pegawai/:id/reset-password', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
    }
    try {
      const hashed = await bcrypt.hash(newPassword, 10);
      await setPegawaiPassword(id, hashed);
      return res.json({ message: 'Password berhasil direset.' });
    } catch {
      return res.status(500).json({ error: 'Gagal mereset password.' });
    }
  });


  router.patch('/pegawai/:id', requireAuth, requireRole(['admin_instansi', 'super_admin']), async (req, res) => {
    const { id } = req.params;
    const allowed = ['namaPegawai', 'nip', 'nik', 'tanggalLahir', 'jenisKelamin', 'jabatan', 'statusPegawai', 'pangkatGolongan', 'pendidikanTerakhir', 'nomorHp', 'email', 'alamat', 'statusAktif'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Tidak ada data yang diubah.' });
    try {
      await updatePegawaiData(id, updates);
      if (req.body.password) {
        const hashed = await bcrypt.hash(req.body.password, 10);
        await setPegawaiPassword(id, hashed);
      }
      return res.json({ message: 'Data pegawai berhasil diperbarui.' });
    } catch {
      return res.status(500).json({ error: 'Gagal memperbarui data pegawai.' });
    }
  });

  router.delete('/pegawai/:id', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (req, res) => {
    const { id } = req.params;
    try {
      await deletePegawaiData(id);
      return res.json({ message: 'Pegawai berhasil dihapus.' });
    } catch {
      return res.status(500).json({ error: 'Gagal menghapus pegawai.' });
    }
  });

  // KATEGORI CRUD
  router.post('/kategori', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { namaKategori, urutan } = req.body;
    if (!namaKategori) return res.status(400).json({ error: 'Nama kategori wajib diisi.' });
    try {
      const id = 'KAT_' + Date.now();
      const result = await createKategori({ id, namaKategori, urutan: urutan || 0 });
      return res.status(201).json(result);
    } catch { return res.status(500).json({ error: 'Gagal membuat kategori.' }); }
  });

  router.patch('/kategori/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const { namaKategori, urutan } = req.body;
    try {
      await updateKategori(id, { namaKategori, urutan });
      return res.json({ message: 'Kategori berhasil diperbarui.' });
    } catch { return res.status(500).json({ error: 'Gagal memperbarui kategori.' }); }
  });

  router.delete('/kategori/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    try {
      await deleteKategori(id);
      return res.json({ message: 'Kategori dan jenis dokumen di dalamnya berhasil dihapus.' });
    } catch { return res.status(500).json({ error: 'Gagal menghapus kategori.' }); }
  });

  // JENIS DOKUMEN CRUD
  router.post('/jenis-dokumen', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { kategoriId, namaKategori, namaDokumen, berlakuUntuk, wajib } = req.body;
    if (!kategoriId || !namaDokumen) return res.status(400).json({ error: 'Kategori dan nama dokumen wajib diisi.' });
    try {
      const id = 'JD_' + Date.now();
      const result = await createJenisDokumen({ id, kategoriId, namaKategori, namaDokumen, berlakuUntuk: berlakuUntuk || 'Semua', wajib: wajib || false });
      return res.status(201).json(result);
    } catch { return res.status(500).json({ error: 'Gagal membuat jenis dokumen.' }); }
  });

  router.patch('/jenis-dokumen/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    const { namaDokumen, berlakuUntuk, wajib, urutan } = req.body;
    try {
      await updateJenisDokumen(id, { namaDokumen, berlakuUntuk, wajib, urutan });
      return res.json({ message: 'Jenis dokumen berhasil diperbarui.' });
    } catch { return res.status(500).json({ error: 'Gagal memperbarui jenis dokumen.' }); }
  });

  router.delete('/jenis-dokumen/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { id } = req.params;
    try {
      await deleteJenisDokumen(id);
      return res.json({ message: 'Jenis dokumen berhasil dihapus.' });
    } catch { return res.status(500).json({ error: 'Gagal menghapus jenis dokumen.' }); }
  });

  // GET kategori & jenis dokumen (accessible by admin too)
  router.get('/kategori-list', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (_req, res) => {
    try { return res.json(await getKategoriList()); } catch { return res.status(500).json({ error: 'Gagal mengambil kategori.' }); }
  });

  router.get('/jenis-dokumen-list', requireAuth, requireRole(['super_admin', 'admin_instansi']), async (_req, res) => {
    try { return res.json(await getJenisDokumenList()); } catch { return res.status(500).json({ error: 'Gagal mengambil jenis dokumen.' }); }
  });

  // BULK IMPORT PEGAWAI (super_admin only)
  router.post('/import-pegawai', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { instansi, pegawai } = req.body;
    if (!Array.isArray(pegawai) || pegawai.length === 0) {
      return res.status(400).json({ error: 'Data pegawai wajib dikirim sebagai array.' });
    }
    try {
      await clearPegawai();
      if (Array.isArray(instansi) && instansi.length > 0) {
        const { createInstansi: createIns } = await import('../lib/turso');
        for (const i of instansi) {
          try { await createIns(i); } catch {}
        }
      }
      await bulkImportPegawai(pegawai);
      return res.json({ message: `Berhasil import ${pegawai.length} pegawai.` });
    } catch (err: any) {
      console.error('Import error:', err?.message || err);
      return res.status(500).json({ error: 'Gagal import pegawai: ' + (err?.message || 'unknown') });
    }
  });

  // UPDATE ALL PEGAWAI INSTANSI NAME (super_admin only)
  router.patch('/pegawai/update-instansi', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { namaInstansi } = req.body;
    if (!namaInstansi) return res.status(400).json({ error: 'namaInstansi wajib diisi.' });
    try {
      await updateAllInstansiName(namaInstansi);
      return res.json({ message: `Semua instansi diubah menjadi "${namaInstansi}".` });
    } catch (err: any) {
      return res.status(500).json({ error: 'Gagal update instansi: ' + (err?.message || 'unknown') });
    }
  });

  // MIGRATE ARSIP FROM TIM-KERJA (super_admin only)
  router.post('/migrate-arsip', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const { arsip: arsipList, clear } = req.body;
    if (!Array.isArray(arsipList) || arsipList.length === 0) return res.status(400).json({ error: 'Data arsip wajib dikirim.' });
    try {
      // Optionally clear previous migration
      if (clear) {
        await bulkDeleteArsipByUploader('migration@tim-kerja');
      }

      // Load all pegawai for name matching
      const allPeg = await listAllPegawai();
      const pegawaiMap: Record<string, any> = {};
      for (const p of allPeg) {
        pegawaiMap[(p.namaPegawai || '').toUpperCase()] = p;
      }

      let success = 0, skipped = 0, errors = 0;

      for (const a of arsipList) {
        const pemilik = (a.pemilik || '').trim().toUpperCase();
        const peg = pegawaiMap[pemilik];
        if (!peg) { skipped++; continue; }

        const kelompok = ['KTP','KK','Ijazah','SK','Sertifikat','BPJS','NPWP','Akta','Pass Foto','Kartu']
          .some(k => (a.jenis_dokumen || '').includes(k)) ? 'Dokumen Pendukung' : 'Dokumen Kepegawaian';

        const fileData = a.file || '';
        const storagePath = fileData.startsWith('data:') ? fileData : '';

        const arsipData = {
          id: 'ARS_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          pegawaiId: peg.id, nip: peg.nip || '', nik: '',
          namaPegawai: peg.namaPegawai, instansiId: peg.instansiId,
          namaInstansi: peg.namaInstansi,
          kelompokArsip: kelompok, jenisDokumen: a.jenis_dokumen || '',
          namaDokumen: a.file_name || '', nomorDokumen: a.bulan ? `Bulan ${a.bulan}` : '',
          tanggalDokumen: a.tahun ? `${a.tahun}-01-01` : '', tahun: a.tahun || '',
          fileName: a.file_name || '', fileType: '', fileSize: fileData.length,
          storagePath, downloadUrl: '',
          statusValidasi: 'Valid' as const, deleted: false,
          uploadedAt: a.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          uploadedBy: 'migration@tim-kerja', updatedBy: 'migration@tim-kerja',
          versionHistory: []
        };
        await createArsipData(arsipData);
        success++;
      }

      return res.json({ message: `Migrasi selesai: ${success} berhasil, ${skipped} dilewati, ${errors} gagal.` });
    } catch (err: any) {
      return res.status(500).json({ error: 'Migrasi gagal: ' + (err?.message || 'unknown') });
    }
  });

  return router;
}
