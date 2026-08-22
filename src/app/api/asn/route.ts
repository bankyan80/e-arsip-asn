import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, isSchoolAdmin } from "@/lib/auth";
import { buildChecklist, resolveJenisAsn } from "@/lib/rule-engine";
import type { ASN, Dokumen } from "@/lib/types";

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
  const jenis = url.searchParams.get("jenis") ?? "";
  const unitKerja = url.searchParams.get("unitKerja") ?? "";
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
  if (jenis) {
    where += ` AND a.jenis_asn = $${i}`;
    params.push(jenis);
    i++;
  }
  if (unitKerja) {
    where += ` AND a.unit_kerja ILIKE $${i}`;
    params.push(`%${unitKerja}%`);
    i++;
  }
  // ADMIN SEKOLAH: hanya ASN di unit kerja sekolahnya (read-only)
  if (isSchoolAdmin(session)) {
    where += ` AND a.unit_kerja = $${i}`;
    params.push(session.unitKerja ?? "");
    i++;
  }

  const countRow = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM asn a ${where}`,
    params
  );
  const total = countRow[0]?.total ?? 0;

  const asnRows = await query<ASN>(
    `SELECT a.* FROM asn a ${where}
     ORDER BY a.nama ASC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, perPage, offset]
  );

  // Ambil semua dokumen terlatest untuk halaman ini sekaligus
  const nips = asnRows.map((a) => a.nip);
  const docs = nips.length
    ? await query<Pick<Dokumen, "id" | "nip" | "jenis_dokumen_id" | "jenis_dokumen_kode" | "status" | "tanggal_upload" | "versi">>(
        `SELECT id, nip, jenis_dokumen_id, jenis_dokumen_kode, status, tanggal_upload, versi
         FROM dokumen WHERE is_latest = true AND nip = ANY($1)`,
        [nips]
      )
    : [];
  const docsByNip = new Map<string, typeof docs>();
  for (const d of docs) {
    const arr = docsByNip.get(d.nip) ?? [];
    arr.push(d);
    docsByNip.set(d.nip, arr);
  }

  const list = await Promise.all(
    asnRows.map(async (a) => {
      const { summary } = await buildChecklist(a, docsByNip.get(a.nip) ?? []);
      return {
        ...a,
        jenis_asn_resolved: resolveJenisAsn(a),
        total_wajib: summary.total_wajib,
        pct_kelengkapan: summary.pct,
      };
    })
  );

  return NextResponse.json({ data: list, total, page, perPage });
}
