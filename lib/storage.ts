import * as fs from 'fs';
import * as path from 'path';
import { uploadToBlob, deleteFromBlob, isVercelBlobConfigured } from './vercelBlob';

const LOCAL_STORAGE_DIR = process.env.VERCEL === '1'
  ? '/tmp/uploaded_files'
  : path.join(process.cwd(), 'uploaded_files');

try {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
} catch {}

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  meta: {
    instansiId: string;
    pegawaiId: string;
    kelompokArsip: string;
    tahun: string;
    jenisDokumen: string;
    namaPegawai: string;
  }
): Promise<UploadResult> {
  const cleanKelompok = meta.kelompokArsip.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const cleanJenis = meta.jenisDokumen.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const cleanNamaPegawai = meta.namaPegawai.replace(/\s+/g, '_').replace(/[^\w-]/g, '');
  const timestamp = Date.now();
  const ext = path.extname(fileName) || '.bin';

  const storagePath = `arsip-asn/${meta.instansiId}/${meta.pegawaiId}/${cleanKelompok}/${meta.tahun}_${cleanJenis}_${cleanNamaPegawai}_${timestamp}${ext}`;

  // Vercel Blob (persistent across cold starts)
  if (isVercelBlobConfigured) {
    const url = await uploadToBlob(storagePath, fileBuffer, mimeType);
    if (url) {
      console.log(`[Storage] Uploaded to Vercel Blob: ${storagePath}`);
      return { storagePath, downloadUrl: url };
    }
  }

  // Local storage fallback (ephemeral on Vercel)
  const safePath = path.join(LOCAL_STORAGE_DIR, storagePath);
  fs.mkdirSync(path.dirname(safePath), { recursive: true });
  fs.writeFileSync(safePath, fileBuffer);

  const downloadUrl = `/api/files/download?path=${encodeURIComponent(storagePath)}`;
  console.log(`[Storage] Uploaded to local filesystem: ${safePath}`);
  return { storagePath, downloadUrl };
}

export async function deleteFile(storagePath: string): Promise<boolean> {
  // Try Vercel Blob first
  if (isVercelBlobConfigured) {
    const deleted = await deleteFromBlob(storagePath);
    if (deleted) {
      console.log(`[Storage] Deleted from Vercel Blob: ${storagePath}`);
      return true;
    }
  }

  // Local storage deletion
  try {
    const safePath = path.join(LOCAL_STORAGE_DIR, storagePath);
    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      console.log(`[Storage] Deleted from local FS: ${safePath}`);
      return true;
    }
  } catch (err) {
    console.error('[Storage] Error deleting from local storage:', err);
  }
  return false;
}

export function getLocalFileBuffer(storagePath: string): { buffer: Buffer; mimeType: string } | null {
  try {
    const resolved = path.resolve(LOCAL_STORAGE_DIR, storagePath);
    if (!resolved.startsWith(path.resolve(LOCAL_STORAGE_DIR))) {
      console.error('[Storage] Path traversal detected:', storagePath);
      return null;
    }
    if (resolved !== path.normalize(resolved)) return null;
    const safePath = resolved;
    if (fs.existsSync(safePath)) {
      const buffer = fs.readFileSync(safePath);
      return { buffer, mimeType: getMimeTypeByExt(path.extname(storagePath)) };
    }
  } catch (err) {
    console.error('[Storage] Failed to read local file:', err);
  }
  return null;
}

function getMimeTypeByExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default: return 'application/octet-stream';
  }
}
