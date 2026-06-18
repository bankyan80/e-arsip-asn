import express from 'express';
import path from 'path';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { verifySession } from '../lib/session';
import { seedInitialDb, createLogEntry } from '../lib/data';
import { SessionData } from '../src/types';
import { createAuthRouter } from '../routes/auth';
import { createPegawaiRouter, createMetadataRouter } from '../routes/pegawai';
import { createArsipRouter } from '../routes/arsip';
import { createAdminRouter } from '../routes/admin';
import { createFilesRouter } from '../routes/files';

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req as any).cookies?.session;
  if (!token) return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
  const session = verifySession(token);
  if (!session) {
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure');
    return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
  }
  (req as any).session = session;
  next();
}

function requireRole(roles: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = (req as any).session as SessionData;
    if (!session || !roles.includes(session.role)) return res.status(403).json({ error: 'Akses ditolak.' });
    next();
  };
}

async function logAction(session: SessionData, aksi: string, detail: string, arsipId?: string, namaDokumen?: string) {
  await createLogEntry({
    id: 'LOG_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    tanggal: new Date().toISOString(), userId: session.id, pegawaiId: session.pegawaiId,
    nip: session.nip, namaPegawai: session.nama, role: session.role, aksi, detail, arsipId, namaDokumen
  });
}

let appInstance: express.Application | null = null;
let seedingPromise: Promise<void> | null = null;

export default async function handler(req: any, res: any) {
  if (!seedingPromise) {
    seedingPromise = seedInitialDb().catch((err) => console.error('Seed initial DB error:', err));
  }
  await seedingPromise;
  try {
    if (!appInstance) {
      const app = express();
      app.set('trust proxy', 1);
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));
      app.use(cookieParser());
      const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });
      app.use('/api/auth', createAuthRouter(requireAuth, rateLimit));
      app.use('/api', createMetadataRouter(requireAuth));
      app.use('/api/pegawai', createPegawaiRouter(requireAuth, logAction));
      app.use('/api/arsip', createArsipRouter(requireAuth, upload, logAction));
      app.use('/api/admin', createAdminRouter(requireAuth, requireRole, logAction));
      app.use('/api/files', createFilesRouter(requireAuth));
      app.get('/api/kelengkapan/me', requireAuth, async (req, res) => {
        const session = (req as any).session as SessionData;
        try {
          const { getPegawaiData, listArsipByPegawai } = await import('../lib/data');
          const { STATIC_JENIS_DOKUMEN } = await import('../lib/constants');
          const userPegawai = await getPegawaiData(session.pegawaiId);
          if (!userPegawai) return res.status(404).json({ error: 'Data tidak ditemukan.' });
          const uploads = await listArsipByPegawai(session.pegawaiId);
          return res.json(STATIC_JENIS_DOKUMEN.map((doc: any) => {
            const m = uploads.find((u: any) => u.jenisDokumen === doc.namaDokumen);
            const p = doc.berlakuUntuk === 'Semua' || doc.berlakuUntuk === userPegawai.statusPegawai;
            return { id: doc.id, namaDokumen: doc.namaDokumen, status: m ? m.statusValidasi : 'Belum Upload', wajib: doc.wajib && p };
          }));
        } catch (err: any) { console.error('Rekap error:', err?.message || err); return res.status(500).json({ error: 'Gagal memuat rekap.' }); }
      });
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
      appInstance = app;
    }
    return new Promise<void>((resolve, reject) => {
      res.on('finish', resolve);
      res.on('error', reject);
      appInstance!(req, res);
    });
  } catch (err: any) {
    console.error('Handler error:', err?.stack || err?.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Terjadi kesalahan server.', detail: err?.message || 'unknown' }));
  }
}