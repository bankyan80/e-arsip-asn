import { Router } from 'express';
import { findPegawaiByCredentials, updatePegawaiData, createLogEntry } from '../lib/data';
import { signSession, verifySession } from '../lib/session';
import { loginSchema } from '../lib/validation';
import { SessionData, Log } from '../src/types';

export function createAuthRouter(requireAuth: any, rateLimit: any) {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' }
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Data login tidak valid.' });
    }
    const { loginType, identifier, tanggalLahir } = parsed.data;

    try {
      const p = await findPegawaiByCredentials(identifier, loginType, tanggalLahir);
      if (!p) {
        return res.status(401).json({ error: 'NIP/NIK tidak ditemukan atau tanggal lahir tidak sesuai.' });
      }
      if (!p.statusAktif) {
        return res.status(403).json({ error: 'Akun pegawai tidak aktif. Silakan hubungi admin.' });
      }

      await updatePegawaiData(p.id, { loginTerakhir: new Date().toISOString() });

      const sessionData: SessionData = {
        id: p.id,
        pegawaiId: p.id,
        nip: p.nip,
        nik: p.nik,
        nama: p.namaPegawai,
        role: p.role,
        instansiId: p.instansiId,
        namaInstansi: p.namaInstansi
      };

      const token = signSession(sessionData);
      const isSecure = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${isSecure ? '; Secure' : ''}`);

      const log: Log = {
        id: 'LOG_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        tanggal: new Date().toISOString(),
        userId: sessionData.id,
        pegawaiId: sessionData.pegawaiId,
        nip: sessionData.nip,
        namaPegawai: sessionData.nama,
        role: sessionData.role,
        aksi: 'LOGIN',
        detail: `Pegawai dengan ${loginType} ${identifier} berhasil login.`,
      };
      await createLogEntry(log);

      return res.json({ message: 'Login berhasil.', user: sessionData });
    } catch (err: any) {
      console.error('Login error:', err?.stack || err?.message || err);
      return res.status(500).json({ error: 'Terjadi kesalahan pada server saat login.' });
    }
  });

  router.post('/logout', requireAuth, async (req, res) => {
    const session = (req as any).session as SessionData;
    const log: Log = {
      id: 'LOG_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      tanggal: new Date().toISOString(),
      userId: session.id,
      pegawaiId: session.pegawaiId,
      nip: session.nip,
      namaPegawai: session.nama,
      role: session.role,
      aksi: 'LOGOUT',
      detail: `Pegawai ${session.nama} berhasil logout.`,
    };
    await createLogEntry(log);
    const isSecure = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', `session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${isSecure ? '; Secure' : ''}`);
    return res.json({ message: 'Logout berhasil.' });
  });

  router.get('/session', (req, res) => {
    const token = (req as any).cookies?.session;
    if (!token) return res.json({ user: null });
    const session = verifySession(token);
    return res.json({ user: session });
  });

  return router;
}
