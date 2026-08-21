import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildChecklist, resolveJenisAsn } from "@/lib/rule-engine";
import type { ASN, Dokumen } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

  const asnList = await query<ASN>(
    `SELECT * FROM asn
     ${q ? `WHERE nama ILIKE $1 OR nip ILIKE $1` : ""}
     ORDER BY nama ASC`,
    q ? [`%${q}%`] : []
  );

  const docs = await query<Pick<Dokumen, "id" | "nip" | "jenis_dokumen_id" | "jenis_dokumen_kode" | "status" | "tanggal_upload" | "versi">>(
    `SELECT id, nip, jenis_dokumen_id, jenis_dokumen_kode, status, tanggal_upload, versi
     FROM dokumen WHERE is_latest = true`
  );
  const docsByNip = new Map<string, typeof docs>();
  for (const d of docs) {
    const arr = docsByNip.get(d.nip) ?? [];
    arr.push(d);
    docsByNip.set(d.nip, arr);
  }

  const result = await Promise.all(
    asnList.map(async (a) => {
      const { summary } = await buildChecklist(a, docsByNip.get(a.nip) ?? []);
      return {
        ...a,
        jenis_asn_resolved: resolveJenisAsn(a),
        total_wajib: summary.total_wajib,
        total_kondisional: summary.total_kondisional,
        terverifikasi: summary.terverifikasi,
        menunggu: summary.menunggu,
        belum: summary.belum,
        pct_kelengkapan: summary.pct,
      };
    })
  );

  return NextResponse.json({ data: result });
}
