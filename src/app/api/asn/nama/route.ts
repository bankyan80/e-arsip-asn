import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const rows = await query<{ nama: string; unit_kerja: string | null }>(
    `SELECT DISTINCT ON (LOWER(nama)) nama, unit_kerja
     FROM asn
     WHERE ($1 = '' OR nama ILIKE '%' || $1 || '%')
     ORDER BY LOWER(nama), id
     LIMIT 500`,
    [q]
  );
  return NextResponse.json({ data: rows });
}
