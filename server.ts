import express from 'express';
import path from 'path';
import multer from 'multer';
import rateLimit from 'express-rate-limit';

import { seedInitialDb, createLogEntry } from './lib/firestore';
import { verifySession } from './lib/session';
import { SessionData, Log } from './src/types';

import { createAuthRouter } from './routes/auth';
import { createPegawaiRouter, createMetadataRouter } from './routes/pegawai';
import { createArsipRouter } from './routes/arsip';
import { createAdminRouter } from './routes/admin';
import { createFilesRouter } from './routes/files';

// Seed initial data as soon as server modules load
seedInitialDb()
  .then(() => console.log('Sistem: Seeding data selesai.'))
  .catch((err) => console.error('Sistem: Gagal memproses seeding:', err));

const PORT = 3000;

export async function createApp() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Custom Cookie Parser middleware
  app.use((req, _res, next) => {
    const cookiesHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookiesHeader.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = parts[1];
      }
    });
    (req as any).cookies = cookies;
    next();
  });

  // Multer setup
  const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

  // -------------------------------------------------------
  // SECURITY MIDDLEWARES
  // -------------------------------------------------------
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const token = (req as any).cookies?.session;
    if (!token) {
      return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
    }
    const session = verifySession(token);
    if (!session) {
      const isSecure = process.env.NODE_ENV === 'production';
      res.setHeader('Set-Cookie', `session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${isSecure ? '; Secure' : ''}`);
      return res.status(401).json({ error: 'Sesi Anda telah berakhir. Silakan login kembali.' });
    }
    (req as any).session = session;
    next();
  }

  function requireRole(roles: string[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const session = (req as any).session as SessionData;
      if (!session || !roles.includes(session.role)) {
        return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki wewenang untuk halaman ini.' });
      }
      next();
    };
  }

  async function logAction(session: SessionData, aksi: string, detail: string, arsipId?: string, namaDokumen?: string) {
    const log: Log = {
      id: 'LOG_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      tanggal: new Date().toISOString(),
      userId: session.id,
      pegawaiId: session.pegawaiId,
      nip: session.nip,
      namaPegawai: session.nama,
      role: session.role,
      aksi,
      detail,
      arsipId,
      namaDokumen
    };
    await createLogEntry(log);
  }

  // -------------------------------------------------------
  // MOUNT ROUTES
  // -------------------------------------------------------
  app.use('/api/auth', createAuthRouter(requireAuth, rateLimit));
  app.use('/api', createMetadataRouter(requireAuth));
  app.use('/api/pegawai', createPegawaiRouter(requireAuth, logAction));
  app.use('/api/arsip', createArsipRouter(requireAuth, upload, logAction));
  app.use('/api/admin', createAdminRouter(requireAuth, requireRole, logAction));
  app.use('/api/files', createFilesRouter(requireAuth));

  // -------------------------------------------------------
  // KELENGKAPAN ROUTE (standalone for backward compat)
  // -------------------------------------------------------
  app.get('/api/kelengkapan/me', requireAuth, async (req, res) => {
    const session = (req as any).session as SessionData;
    try {
      const { getPegawaiData, listArsipByPegawai } = await import('./lib/firestore');
      const { STATIC_JENIS_DOKUMEN } = await import('./lib/constants');
      const userPegawai = await getPegawaiData(session.pegawaiId);
      if (!userPegawai) return res.status(404).json({ error: 'Data kepegawaian tidak ditemukan.' });
      const uploads = await listArsipByPegawai(session.pegawaiId);
      const checklist = STATIC_JENIS_DOKUMEN.map((doc: any) => {
        const uploadedMatch = uploads.find((u: any) => u.jenisDokumen === doc.namaDokumen);
        const isPertinent = doc.berlakuUntuk === 'Semua' || doc.berlakuUntuk === userPegawai.statusPegawai;
        return {
          id: doc.id, kategoriId: doc.kategoriId, namaKategori: doc.namaKategori,
          namaDokumen: doc.namaDokumen,
          status: uploadedMatch ? uploadedMatch.statusValidasi : 'Belum Upload',
          catatanAdmin: uploadedMatch?.catatanAdmin || '', wajib: doc.wajib && isPertinent,
          arsipId: uploadedMatch ? uploadedMatch.id : null,
          downloadUrl: uploadedMatch ? uploadedMatch.downloadUrl : null
        };
      });
      return res.json(checklist);
    } catch {
      return res.status(500).json({ error: 'Gagal memuat rekap kelengkapan.' });
    }
  });

  // -------------------------------------------------------
  // SPA Middleware
  // -------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Arsip Digital ASN] Server ready and serving on http://localhost:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}
