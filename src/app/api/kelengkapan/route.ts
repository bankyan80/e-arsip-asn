import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { ASN, JenisDokumen, Dokumen } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const asnList = await query<ASN & { jumlah_dokumen: number }>(
    `SELECT a.*, (SELECT COUNT(*)::int FROM dokumen d WHERE d.nip = a.nip AND d.is_latest = true) AS jumlah_dokumen
     FROM asn a
     ${q ? `WHERE a.nama ILIKE $1 OR a.nip ILIKE $1` : ""}
     ORDER BY a.nama ASC`,
    q ? [`%${q}%`] : []
  );

  const jenisList = await query<JenisDokumen>(`SELECT * FROM jenis_dokumen WHERE aktif = true`);

  const result = await Promise.all(
    asnList.map(async (a) => {
      const relevant = jenisList.filter((j) =>
        a.status === "PNS" ? j.berlaku_pns : a.status === "PPPK" ? j.berlaku_pppk : true
      );
      const total = relevant.length;
      const docs = await query<Dokumen>(`SELECT * FROM dokumen WHERE nip = $1 AND is_latest = true`, [a.nip]);
      const ada = relevant.filter((j) => docs.some((d) => d.jenis_dokumen_id === j.id && (d.status === "DISETUJUI" || d.status === "TERVERIFIKASI"))).length;
      const pct = total === 0 ? 0 : Math.round((ada / total) * 100);
      return { ...a, total_jenis: total, pct_kelengkapan: pct, dokumen: docs };
    })
  );

  return NextResponse.json({ data: result });
}