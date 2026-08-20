import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = Math.max(1, Math.min(500, Number(url.searchParams.get("page") ?? 1)));
  const perPage = 50;
  const offset = (page - 1) * perPage;

  let where = "";
  const params: any[] = [];
  let i = 1;
  if (q) {
    where = `WHERE aksi ILIKE $1 OR nip ILIKE $1 OR admin_username ILIKE $1 OR nama_asn ILIKE $1`;
    params.push(`%${q}%`);
    i++;
  }
  const count = await query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM audit_log ${where}`, params);
  const rows = await query(
    `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i + 1}`,
    [...params, perPage, offset]
  );

  return NextResponse.json({ data: rows, total: count[0]?.total ?? 0, page, perPage });
}