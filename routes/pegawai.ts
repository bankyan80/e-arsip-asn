import { Router } from 'express';
import { getPegawaiData, updatePegawaiData, getKategoriList, getJenisDokumenList } from '../lib/firestore';
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
    const { nomorHp, email, alamat } = parsed.data;
    try {
      const updates: Partial<Pegawai> = {};
      if (nomorHp !== undefined) updates.nomorHp = nomorHp;
      if (email !== undefined) updates.email = email;
      if (alamat !== undefined) updates.alamat = alamat;
      const p = await updatePegawaiData(session.pegawaiId, updates);
      await logAction(session, 'EDIT_PROFIL', `Pegawai memperbaharui data kontak: HP=${nomorHp}, Email=${email}.`);
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
