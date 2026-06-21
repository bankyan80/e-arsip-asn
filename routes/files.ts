import { Router } from 'express';
import path from 'path';
import { getLocalFileBuffer } from '../lib/storage';
import { getArsipData } from '../lib/data';
import { SessionData } from '../src/types';
export function createFilesRouter(requireAuth: any) {
  const router = Router();

  router.get('/download', requireAuth, async (req, res) => {
    const arsipId = req.query.arsipId as string;
    const filePath = req.query.path as string;

    // If arsipId is provided, look up the arsip record and serve from storage_path (supports base64 data URIs)
    if (arsipId) {
      const session = (req as any).session as SessionData;
      const arsip = await getArsipData(arsipId);
      if (!arsip) return res.status(404).json({ error: 'Arsip tidak ditemukan.' });
      if (session.role === 'pegawai' && arsip.pegawaiId !== session.pegawaiId) {
        return res.status(403).json({ error: 'Akses ditolak.' });
      }
      if (session.role === 'admin_instansi' && arsip.instansiId !== session.instansiId) {
        return res.status(403).json({ error: 'Akses ditolak.' });
      }
      const sp = arsip.storagePath || '';
      if (sp.startsWith('data:')) {
        const [mimeHdr, b64] = sp.split(',');
        const mime = mimeHdr.replace('data:', '').split(';')[0] || 'application/octet-stream';
        const buf = Buffer.from(b64, 'base64');
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `inline; filename="${arsip.fileName || 'dokumen'}"`);
        return res.send(buf);
      }
      // If downloadUrl points to external storage, redirect
      const du = arsip.downloadUrl || '';
      if (du.startsWith('http')) {
        return res.redirect(du);
      }
      // Fall back to local file serving
      const result = getLocalFileBuffer(sp);
      if (!result) return res.status(404).json({ error: 'Berkas dokumen tidak ditemukan.' });
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(sp)}"`);
      return res.send(result.buffer);
    }

    // Legacy: serve by path (only arsip-asn paths allowed)
    if (!filePath) return res.status(400).json({ error: 'Parameter path atau arsipId diperlukan.' });

    const pathParts = filePath.split('/');
    if (pathParts[0] !== 'arsip-asn' || pathParts.length < 3) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const session = (req as any).session as SessionData;
    const instansiId = pathParts[1];
    const pegawaiId = pathParts[2];

    if (session.role === 'pegawai' && session.pegawaiId !== pegawaiId) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak melihat dokumen pegawai lain.' });
    }
    if (session.role === 'admin_instansi' && session.instansiId !== instansiId) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak berhak melihat dokumen di luar instansi Anda.' });
    }

    const result = getLocalFileBuffer(filePath);
    if (!result) return res.status(404).json({ error: 'Berkas dokumen tidak ditemukan di server.' });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);
    res.send(result.buffer);
  });

  return router;
}
