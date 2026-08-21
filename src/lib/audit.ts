import { query } from "./db";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "UPLOAD"
  | "UPDATE"
  | "DELETE"
  | "DOWNLOAD"
  | "VIEW"
  | "VERIFY"
  | "REJECT"
  | "EDIT"
  | "CHANGE_DATA"
  | "CREATE"
  | "SETTINGS"
  | "EXPORT"
  | "SEND";

export interface AuditEntry {
  aksi: AuditAction;
  adminUserId?: number;
  adminUsername?: string;
  nip?: string;
  namaAsn?: string;
  dokumenId?: number;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

export async function auditLog(entry: AuditEntry) {
  try {
    await query(
      `INSERT INTO audit_log
        (admin_user_id, admin_username, aksi, nip, nama_asn, dokumen_id, detail, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
      [
        entry.adminUserId ?? null,
        entry.adminUsername ?? null,
        entry.aksi,
        entry.nip ?? null,
        entry.namaAsn ?? null,
        entry.dokumenId ?? null,
        entry.detail ? JSON.stringify(entry.detail) : null,
        entry.ipAddress ?? null,
      ]
    );
  } catch {
    // Audit log tidak boleh mengganggu alur utama
  }
}