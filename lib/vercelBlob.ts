import { put, del, head } from '@vercel/blob';

const BLOB_PREFIX = 'e-arsip-asn';
const isVercelBlobConfigured = !!(process.env.BLOB_READ_WRITE_TOKEN);

export { isVercelBlobConfigured };

export async function uploadToBlob(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!isVercelBlobConfigured) return null;
  try {
    const blob = await put(`${BLOB_PREFIX}/${path}`, buffer, {
      contentType,
      access: 'public',
    });
    console.log(`[Vercel Blob] Uploaded: ${blob.url}`);
    return blob.url;
  } catch (err) {
    console.error('[Vercel Blob] Upload error:', err);
    return null;
  }
}

export async function deleteFromBlob(path: string): Promise<boolean> {
  if (!isVercelBlobConfigured) return false;
  try {
    await del(`${BLOB_PREFIX}/${path}`);
    console.log(`[Vercel Blob] Deleted: ${BLOB_PREFIX}/${path}`);
    return true;
  } catch (err) {
    console.error('[Vercel Blob] Delete error:', err);
    return false;
  }
}

export async function storeJsonToBlob(key: string, data: any): Promise<boolean> {
  if (!isVercelBlobConfigured) return false;
  try {
    const json = JSON.stringify(data, null, 2);
    const blob = await put(`${BLOB_PREFIX}/data/${key}.json`, json, {
      contentType: 'application/json',
      access: 'public',
    });
    console.log(`[Vercel Blob] JSON stored: ${blob.url}`);
    return true;
  } catch (err) {
    console.error('[Vercel Blob] JSON store error:', err);
    return false;
  }
}

export async function fetchJsonFromBlob(key: string): Promise<any | null> {
  if (!isVercelBlobConfigured) return null;
  try {
    const blobPath = `${BLOB_PREFIX}/data/${key}.json`;
    const blobMeta = await head(blobPath);
    const response = await fetch(blobMeta.url, { cache: 'no-store' });
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error('[Vercel Blob] JSON fetch error:', err);
    return null;
  }
}
