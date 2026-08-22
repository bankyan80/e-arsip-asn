import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query<{ unit_kerja: string }>(
    `SELECT DISTINCT unit_kerja FROM asn WHERE unit_kerja IS NOT NULL AND unit_kerja <> '' ORDER BY unit_kerja`
  );
  return NextResponse.json({ data: rows.map((r) => r.unit_kerja) });
}
