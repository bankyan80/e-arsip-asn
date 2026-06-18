import * as fs from 'fs';
import * as path from 'path';
import { bucket, isFirebaseConfigured } from './firebaseAdmin';

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'uploaded_files');

// Ensure local storage directory exists
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
}

/**
 * Uploads a file buffer to either Google Cloud Storage (Firebase) or the local filesystem fallback.
 */
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

  // Format path: arsip-asn/{instansiId}/{pegawaiId}/{kelompokArsip}/{tahun}_{jenisDokumen}_{namaPegawai}_{timestamp}.{ext}
  const storagePath = `arsip-asn/${meta.instansiId}/${meta.pegawaiId}/${cleanKelompok}/${meta.tahun}_${cleanJenis}_${cleanNamaPegawai}_${timestamp}${ext}`;

  if (isFirebaseConfigured && bucket) {
    try {
      const file = bucket.file(storagePath);
      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
        },
        resumable: false
      });

      // Simple download URL with token or signed URL. For standard rules-protected URL or public fallback:
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media`;
      
      console.log(`Successfully uploaded file to GCS: ${storagePath}`);
      return { storagePath, downloadUrl };
    } catch (err) {
      console.error('Error uploading file to Firebase Storage. Falling back to local FS storage.', err);
    }
  }

  // Local storage Fallback
  const safePath = path.join(LOCAL_STORAGE_DIR, storagePath);
  fs.mkdirSync(path.dirname(safePath), { recursive: true });
  fs.writeFileSync(safePath, fileBuffer);

  // Serve it via our App relative endpoint
  const downloadUrl = `/api/files/download?path=${encodeURIComponent(storagePath)}`;
  console.log(`Successfully uploaded file to local filesystem: ${safePath}`);
  return { storagePath, downloadUrl };
}

/**
 * Deletes a file from GCS or local filesystem.
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
  if (isFirebaseConfigured && bucket) {
    try {
      const file = bucket.file(storagePath);
      await file.delete();
      console.log(`Successfully deleted file from GCS: ${storagePath}`);
      return true;
    } catch (err) {
      console.error('Error deleting file from Firebase GCS:', err);
    }
  }

  // Local storage Fallback deletion
  try {
    const safePath = path.join(LOCAL_STORAGE_DIR, storagePath);
    if (fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
      console.log(`Successfully deleted file from local FS: ${safePath}`);
      return true;
    }
  } catch (err) {
    console.error('Error deleting file from local storage:', err);
  }
  return false;
}

/**
 * Returns file buffer for local filesystem serving.
 */
export function getLocalFileBuffer(storagePath: string): { buffer: Buffer; mimeType: string } | null {
  try {
    const resolved = path.resolve(LOCAL_STORAGE_DIR, storagePath);
    if (!resolved.startsWith(path.resolve(LOCAL_STORAGE_DIR))) {
      console.error('Path traversal detected:', storagePath);
      return null;
    }
    if (resolved !== path.normalize(resolved)) return null;
    const safePath = resolved;
    if (fs.existsSync(safePath)) {
      const buffer = fs.readFileSync(safePath);
      return {
        buffer,
        mimeType: getMimeTypeByExt(path.extname(storagePath))
      };
    }
  } catch (err) {
    console.error('Failed to read local file:', err);
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
