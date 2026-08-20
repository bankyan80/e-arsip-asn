import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import type { Dokumen, JenisDokumen, ASN } from "@/lib/types";

export const runtime = "nodejs";

async function guard(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export async function GET(request: NextRequest) {
  const session = await guard(request);
  if (session instanceof Response) return session;

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const jenisId = url.searchParams.get("jenisId") ?? "";
  const page = Math.max(1, Math.min(200, Number(url.searchParams.get("page") ?? 1)));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  let where = "WHERE 1=1";
  const params: any[] = [];
  let i = 1;
  if (q) {
    where += ` AND (d.nip ILIKE $${i} OR a.nama ILIKE $${i})`;
    params.push(`%${q}%`);
    i++;
  }
  if (status) {
    where += ` AND d.status = $${i}`;
    params.push(status);
    i++;
  }
  if (jenisId) {
    where += ` AND d.jenis_dokumen_id = $${i}`;
    params.push(Number(jenisId));
    i++;
  }

  const countRow = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM dokumen d JOIN asn a ON a.nip = d.nip ${where}`,
    params
  );
  const total = countRow[0]?.total ?? 0;

  const docs = await query<Dokumen & { nama_asn: string; jenis_nama: string }>(
    `SELECT d.*, a.nama AS nama_asn, j.nama AS jenis_nama
     FROM dokumen d
     JOIN asn a ON a.nip = d.nip
     JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
     ${where}
     ORDER BY d.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, perPage, offset]
  );

  return NextResponse.json({ data: docs, total, page, perPage });
}