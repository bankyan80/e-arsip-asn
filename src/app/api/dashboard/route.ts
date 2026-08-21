import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [totalAsn, totalDok, lengkap, belum, hariIni, menunggu] = await Promise.all([
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM asn`),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM dokumen`),
    query<{ n: number }>(`
      SELECT COUNT(DISTINCT a.id)::int AS n
      FROM asn a
      WHERE NOT EXISTS (
        SELECT 1 FROM jenis_dokumen j
        WHERE j.aktif = true
          AND ((a.status = 'PNS' AND j.berlaku_pns) OR (a.status = 'PPPK' AND j.berlaku_pppk) OR a.status NOT IN ('PNS','PPPK'))
          AND NOT EXISTS (
            SELECT 1 FROM dokumen d WHERE d.nip = a.nip AND d.jenis_dokumen_id = j.id AND d.is_latest = true AND d.status IN ('DISETUJUI','TERVERIFIKASI')
          )
      )`),
    query<{ n: number }>(`
      SELECT COUNT(DISTINCT a.id)::int AS n
      FROM asn a
      WHERE EXISTS (
        SELECT 1 FROM jenis_dokumen j
        WHERE j.aktif = true
          AND ((a.status = 'PNS' AND j.berlaku_pns) OR (a.status = 'PPPK' AND j.berlaku_pppk) OR a.status NOT IN ('PNS','PPPK'))
          AND NOT EXISTS (
            SELECT 1 FROM dokumen d WHERE d.nip = a.nip AND d.jenis_dokumen_id = j.id AND d.is_latest = true AND d.status IN ('DISETUJUI','TERVERIFIKASI')
          )
      )`),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM dokumen WHERE tanggal_upload::date = CURRENT_DATE`),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM dokumen WHERE status = 'MENUNGGU'`),
  ]);

  const uploadsPerMonth = await query<{ bulan: string; total: number }>(
    `SELECT to_char(tanggal_upload, 'YYYY-MM') AS bulan, COUNT(*)::int AS total
     FROM dokumen GROUP BY 1 ORDER BY 1 DESC LIMIT 12`
  );

  const asnByStatus = await query<{ status: string; total: number }>(
    `SELECT status, COUNT(*)::int AS total FROM asn GROUP BY status`
  );

  const topJenis = await query<{ nama: string; total: number }>(
    `SELECT j.nama, COUNT(d.id)::int AS total
     FROM dokumen d JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
     GROUP BY j.nama ORDER BY total DESC LIMIT 8`
  );

  return NextResponse.json({
    stats: {
      total_asn: totalAsn[0]?.n ?? 0,
      total_dokumen: totalDok[0]?.n ?? 0,
      asn_lengkap: lengkap[0]?.n ?? 0,
      asn_belum_lengkap: belum[0]?.n ?? 0,
      dokumen_hari_ini: hariIni[0]?.n ?? 0,
      menunggu: menunggu[0]?.n ?? 0,
    },
    uploads_per_month: uploadsPerMonth.reverse(),
    asn_by_status: asnByStatus,
    top_jenis: topJenis,
  });
}