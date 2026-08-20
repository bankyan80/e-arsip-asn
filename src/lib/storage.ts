import { env } from "./env";

export interface StoredFile {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

export interface StorageOptions {
  allowMultiple?: boolean;
}

export class StorageError extends Error {}

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const TOKEN_API = "https://oauth2.googleapis.com/token";
const FOLDER_MIME = "application/vnd.google-apps.folder";

const folderCache = new Map<string, string>();

function toBuffer(data: Buffer | Uint8Array | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  return Buffer.from(data as Uint8Array);
}

function fileIdFrom(url: string): string {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";
  const m = trimmed.match(/\/d\/([^/?#]+)/);
  if (m) return m[1];
  return trimmed.split("/").pop() ?? trimmed;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleDriveClientId,
      client_secret: env.googleDriveClientSecret,
      refresh_token: env.googleDriveRefreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new StorageError("Gagal mendapatkan access token Google Drive: " + detail);
  }
  const json = await res.json();
  if (!json.access_token) throw new StorageError("Access token Google Drive kosong");
  return json.access_token as string;
}

async function driveRequest(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new StorageError(`Google Drive API ${init.method ?? "GET"} ${path} gagal: ${res.status} ${detail}`);
  }
  return res;
}

async function findFolder(token: string, name: string, parentId: string): Promise<string | null> {
  const escaped = name.replace(/'/g, "\\'");
  const q = `name='${escaped}' and '${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`;
  const res = await driveRequest(
    token,
    `/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1&spaces=drive`
  );
  const json = await res.json();
  return json.files?.[0]?.id ?? null;
}

async function createFolder(token: string, name: string, parentId: string): Promise<string> {
  const res = await driveRequest(token, "/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  });
  const json = await res.json();
  return json.id as string;
}

async function resolveRootId(token: string, rootId: string): Promise<string | null> {
  try {
    const res = await driveRequest(token, `/files/${rootId}?fields=id,name,mimeType`);
    const json = await res.json();
    if (json.id) return json.id;
  } catch {}
  return null;
}

async function resolveFolder(token: string, segments: string[], create: boolean): Promise<string | null> {
  const root = env.googleDriveRootFolder;
  const rootIsId = !!root && /^[A-Za-z0-9_-]{15,}$/.test(root);
  const parts: string[] = rootIsId || !root ? segments : [root, ...segments];
  let parentId = "root";
  if (rootIsId) {
    const id = await resolveRootId(token, root);
    if (!id) return null;
    parentId = id;
  }
  for (const seg of parts) {
    const key: string = `${parentId}/${seg}`;
    let id: string | null = folderCache.get(key) ?? null;
    if (!id) {
      id = await findFolder(token, seg, parentId);
      if (!id) {
        if (!create) return null;
        id = await createFolder(token, seg, parentId);
      }
      folderCache.set(key, id);
    }
    parentId = id;
  }
  return parentId;
}

export async function saveBlob(
  data: Buffer | Uint8Array | ArrayBuffer,
  pathname: string,
  contentType: string
): Promise<StoredFile> {
  const token = await getAccessToken();
  const buf = toBuffer(data);
  const segments = pathname.split("/").filter(Boolean);
  const fileName = segments.pop() ?? "file";
  const parentId = await resolveFolder(token, segments, true);
  if (!parentId) throw new StorageError("Gagal menyiapkan folder Google Drive");

  const form = new FormData();
  const meta = JSON.stringify({ name: fileName, parents: [parentId] });
  form.append("metadata", new Blob([new TextEncoder().encode(meta)], { type: "application/json" }));
  form.append("file", new Blob([new Uint8Array(buf)], { type: contentType }), fileName);

  const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name,size`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new StorageError("Gagal upload dokumen ke Google Drive: " + detail);
  }
  const json = await res.json();
  return {
    url: json.id as string,
    downloadUrl: `https://drive.google.com/file/d/${json.id}/view`,
    pathname,
    size: buf.length,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteBlob(url: string) {
  const token = await getAccessToken();
  const id = fileIdFrom(url);
  if (!id) return;
  const res = await fetch(`${DRIVE_API}/files/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new StorageError("Gagal menghapus file dari Google Drive: " + detail);
  }
}

export async function listBlobs(prefix: string): Promise<StoredFile[]> {
  const token = await getAccessToken();
  const segments = prefix.split("/").filter(Boolean);
  const parentId = await resolveFolder(token, segments, false);
  if (!parentId) return [];
  const q = `'${parentId}' in parents and trashed=false`;
  const res = await driveRequest(
    token,
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,size)&spaces=drive`
  );
  const json = await res.json();
  return (json.files ?? []).map((f: { id: string; name: string; size?: string }) => ({
    url: f.id,
    downloadUrl: `https://drive.google.com/file/d/${f.id}/view`,
    pathname: prefix ? `${prefix}/${f.name}` : f.name,
    size: Number(f.size ?? 0),
    uploadedAt: new Date().toISOString(),
  }));
}

export async function blobUrl(pathname: string): Promise<StoredFile | null> {
  const token = await getAccessToken();
  const segments = pathname.split("/").filter(Boolean);
  const fileName = segments.pop() ?? "";
  const parentId = await resolveFolder(token, segments, false);
  if (!parentId) return null;
  const escaped = fileName.replace(/'/g, "\\'");
  const q = `name='${escaped}' and '${parentId}' in parents and trashed=false`;
  const res = await driveRequest(
    token,
    `/files?q=${encodeURIComponent(q)}&fields=files(id,name,size)&pageSize=1&spaces=drive`
  );
  const json = await res.json();
  const f = json.files?.[0];
  if (!f) return null;
  return {
    url: f.id,
    downloadUrl: `https://drive.google.com/file/d/${f.id}/view`,
    pathname,
    size: Number(f.size ?? 0),
    uploadedAt: new Date().toISOString(),
  };
}

export async function readBlob(
  pathname: string
): Promise<{ buffer: Buffer; name: string; size: number; contentType: string } | null> {
  const token = await getAccessToken();
  const segments = pathname.split("/").filter(Boolean);
  const fileName = segments.pop() ?? "";
  const parentId = await resolveFolder(token, segments, false);
  if (!parentId) return null;
  const escaped = fileName.replace(/'/g, "\\'");
  const q = `name='${escaped}' and '${parentId}' in parents and trashed=false`;
  const res = await driveRequest(
    token,
    `/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1&spaces=drive`
  );
  const json = await res.json();
  const f = json.files?.[0];
  if (!f) return null;

  const dl = await fetch(`${DRIVE_API}/files/${f.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!dl.ok) throw new StorageError(`Gagal mengunduh file dari Google Drive: ${dl.status}`);
  const buffer = Buffer.from(await dl.arrayBuffer());
  const contentType = dl.headers.get("content-type") ?? "application/pdf";
  return { buffer, name: fileName, size: buffer.length, contentType };
}

export function buildStoragePath(nip: string, jenisKode: string, year: string, fileName: string): string {
  const safeNip = nip.replace(/[^a-zA-Z0-9]/g, "");
  const safeJenis = jenisKode.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  return `arsip-asn/${safeNip}/${safeJenis}/${year}/${fileName}`;
}