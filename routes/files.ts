import { Router } from 'express';
import path from 'path';
import { getLocalFileBuffer } from '../lib/storage';
import { SessionData } from '../src/types';

export function createFilesRouter(requireAuth: any) {
  const router = Router();

  router.get('/download', requireAuth, (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'Path file tidak ditentukan.' });

    const session = (req as any).session as SessionData;
    const pathParts = filePath.split('/');

    if (pathParts[0] === 'arsip-asn') {
      const instansiId = pathParts[1];
      const pegawaiId = pathParts[2];

      if (session.role === 'pegawai' && session.pegawaiId !== pegawaiId) {
        return res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak melihat dokumen pegawai lain.' });
      }
      if (session.role === 'admin_instansi' && session.instansiId !== instansiId && instansiId !== 'INSTALL') {
        return res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak melihat dokumen di luar instansi Anda.' });
      }
    }

    const result = getLocalFileBuffer(filePath);
    if (!result) return res.status(404).json({ error: 'Berkas dokumen tidak ditemukan di server.' });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    res.send(result.buffer);
  });

  return router;
}
