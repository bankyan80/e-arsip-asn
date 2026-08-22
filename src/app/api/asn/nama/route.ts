import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const rows = await query<{ nama: string; unit_kerja: string | null; npsn: string | null }>(
    `SELECT DISTINCT ON (LOWER(a.nama)) a.nama, a.unit_kerja, s.npsn
     FROM asn a
     LEFT JOIN sekolah s ON s.nama = a.unit_kerja
     WHERE ($1 = '' OR a.nama ILIKE '%' || $1 || '%')
     ORDER BY LOWER(a.nama), a.id
     LIMIT 500`,
    [q]
  );
  return NextResponse.json({ data: rows });
}
