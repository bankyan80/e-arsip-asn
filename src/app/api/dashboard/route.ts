import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, isSchoolAdmin } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoped = isSchoolAdmin(session);
  const unit = session.unitKerja ?? "";
  // Filter tambahan untuk ADMIN SEKOLAH (read-only, cakupan satu sekolah)
  const FA = scoped ? "AND a.unit_kerja = $1" : ""; // tabel asn ber-alias a
  const FD = scoped ? "JOIN asn a ON a.nip = d.nip AND a.unit_kerja = $1" : ""; // tabel dokumen ber-alias d
  const pA = scoped ? [unit] : [];

  const [totalAsn, totalDok, lengkap, belum, hariIni, menunggu] = await Promise.all([
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM asn a WHERE 1=1 ${FA}`, pA),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM dokumen d ${FD} ${scoped ? "WHERE TRUE" : ""}`,
      scoped ? [unit] : []
    ),
    query<{ n: number }>(`
      SELECT COUNT(DISTINCT a.id)::int AS n
      FROM asn a
      WHERE 1=1 ${FA}
        AND EXISTS (
          SELECT 1 FROM jenis_dokumen j
          WHERE j.aktif = true
            AND ((a.status = 'PNS' AND j.berlaku_pns) OR (a.status = 'PPPK' AND j.berlaku_pppk) OR a.status NOT IN ('PNS','PPPK'))
        )
        AND NOT EXISTS (
          SELECT 1 FROM jenis_dokumen j
          WHERE j.aktif = true
            AND ((a.status = 'PNS' AND j.berlaku_pns) OR (a.status = 'PPPK' AND j.berlaku_pppk) OR a.status NOT IN ('PNS','PPPK'))
            AND NOT EXISTS (
              SELECT 1 FROM dokumen d WHERE d.nip = a.nip AND d.jenis_dokumen_id = j.id AND d.is_latest = true AND d.status IN ('DISETUJUI','TERVERIFIKASI')
            )
        )`, pA),
    query<{ n: number }>(`
      SELECT COUNT(DISTINCT a.id)::int AS n
      FROM asn a
      WHERE 1=1 ${FA}
        AND EXISTS (
          SELECT 1 FROM jenis_dokumen j
          WHERE j.aktif = true
            AND ((a.status = 'PNS' AND j.berlaku_pns) OR (a.status = 'PPPK' AND j.berlaku_pppk) OR a.status NOT IN ('PNS','PPPK'))
            AND NOT EXISTS (
              SELECT 1 FROM dokumen d WHERE d.nip = a.nip AND d.jenis_dokumen_id = j.id AND d.is_latest = true AND d.status IN ('DISETUJUI','TERVERIFIKASI')
            )
        )`, pA),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM dokumen d ${FD} WHERE d.tanggal_upload::date = CURRENT_DATE`,
      scoped ? [unit] : []
    ),
    query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM dokumen d ${FD} WHERE d.status = 'MENUNGGU'`,
      scoped ? [unit] : []
    ),
  ]);

  const uploadsPerMonth = await query<{ bulan: string; total: number }>(
    `SELECT to_char(d.tanggal_upload, 'YYYY-MM') AS bulan, COUNT(*)::int AS total
     FROM dokumen d ${FD} ${scoped ? "WHERE TRUE" : ""}
     GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    scoped ? [unit] : []
  );

  const asnByStatus = await query<{ status: string; total: number }>(
    `SELECT status, COUNT(*)::int AS total FROM asn a WHERE 1=1 ${FA} GROUP BY status`,
    pA
  );

  const topJenis = await query<{ nama: string; total: number }>(
    `SELECT j.nama, COUNT(d.id)::int AS total
     FROM dokumen d
     JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
     ${FD}
     GROUP BY j.nama ORDER BY total DESC LIMIT 8`,
    scoped ? [unit] : []
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