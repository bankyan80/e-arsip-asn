import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { roleRank } from "@/lib/guard";
import type { ASN, JenisDokumen, Dokumen } from "@/lib/types";

export const runtime = "nodejs";

function clampPage(n: number) {
  return Math.max(1, Math.min(200, n));
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const unitKerja = url.searchParams.get("unitKerja") ?? "";
  const kelengkapan = url.searchParams.get("kelengkapan") ?? "";
  const page = clampPage(Number(url.searchParams.get("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  let where = "WHERE 1=1";
  const params: any[] = [];
  let i = 1;
  if (q) {
    where += ` AND (a.nip ILIKE $${i} OR a.nama ILIKE $${i} OR a.jabatan ILIKE $${i})`;
    params.push(`%${q}%`);
    i++;
  }
  if (status) {
    where += ` AND a.status = $${i}`;
    params.push(status);
    i++;
  }
  if (unitKerja) {
    where += ` AND a.unit_kerja ILIKE $${i}`;
    params.push(`%${unitKerja}%`);
    i++;
  }

  const countRow = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM asn a ${where}`,
    params
  );
  const total = countRow[0]?.total ?? 0;

  const asnRows = await query<ASN & { jumlah_dokumen: number }>(
    `SELECT a.*, (SELECT COUNT(*)::int FROM dokumen d WHERE d.nip = a.nip AND d.is_latest = true) AS jumlah_dokumen
     FROM asn a
     ${where}
     ORDER BY a.nama ASC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, perPage, offset]
  );

  const jenisList = await query<JenisDokumen>(`SELECT * FROM jenis_dokumen WHERE aktif = true`);

  const list = asnRows.map((a) => {
    const totalJenis = jenisList.filter((j) =>
      a.status === "PNS" ? j.berlaku_pns : a.status === "PPPK" ? j.berlaku_pppk : true
    ).length;
    const pct = totalJenis === 0 ? 0 : Math.round((a.jumlah_dokumen / totalJenis) * 100);
    return { ...a, total_jenis: totalJenis, pct_kelengkapan: pct };
  });

  return NextResponse.json({ data: list, total, page, perPage });
}