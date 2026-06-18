import { Router } from 'express';
import { getPegawaiData, updatePegawaiData, getKategoriList, getJenisDokumenList } from '../lib/data';
import { profileUpdateSchema } from '../lib/validation';
import { SessionData, Pegawai } from '../src/types';

export function createPegawaiRouter(requireAuth: any, logAction: any) {
  const router = Router();

  router.get('/me', requireAuth, async (req, res) => {
    const session = (req as any).session as SessionData;
    try {
      const p = await getPegawaiData(session.pegawaiId);
      if (!p) return res.status(404).json({ error: 'Data pegawai tidak ditemukan.' });
      return res.json(p);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil data profil.' });
    }
  });

  router.patch('/me', requireAuth, async (req, res) => {
    const session = (req as any).session as SessionData;
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Data profil tidak valid.' });
    }
    const data = parsed.data;
    try {
      const updates: Partial<Pegawai> = {};
      const adminFields = ['namaPegawai', 'jabatan', 'statusPegawai', 'pangkatGolongan', 'pendidikanTerakhir', 'namaInstansi'];
      const kontakFields = ['nomorHp', 'email', 'alamat'];
      for (const key of kontakFields) {
        if ((data as any)[key] !== undefined) (updates as any)[key] = (data as any)[key];
      }
      // Admin fields: only super_admin and admin_instansi can edit
      if (session.role !== 'pegawai') {
        for (const key of adminFields) {
          if ((data as any)[key] !== undefined) (updates as any)[key] = (data as any)[key];
        }
      }
      const p = await updatePegawaiData(session.pegawaiId, updates);
      const changedKeys = Object.keys(updates).join(', ');
      await logAction(session, 'EDIT_PROFIL', `Pegawai memperbaharui profil: ${changedKeys}.`);
      return res.json({ message: 'Profil berhasil diperbarui.', data: p });
    } catch {
      return res.status(500).json({ error: 'Gagal memperbarui data profil.' });
    }
  });

  return router;
}

export function createMetadataRouter(requireAuth: any) {
  const router = Router();

  router.get('/kategori', requireAuth, async (_req, res) => {
    try {
      const list = await getKategoriList();
      return res.json(list);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil kategori arsip.' });
    }
  });

  router.get('/jenis-dokumen', requireAuth, async (_req, res) => {
    try {
      const list = await getJenisDokumenList();
      return res.json(list);
    } catch {
      return res.status(500).json({ error: 'Gagal mengambil jenis dokumen.' });
    }
  });

  return router;
}
