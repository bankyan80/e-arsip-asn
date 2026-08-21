import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildChecklist, resolveJenisAsn, conditionLabel } from "@/lib/rule-engine";
import { labelJenisAsn } from "@/lib/types";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const nip = new URL(request.url).searchParams.get("nip");
  if (!nip) return NextResponse.json({ error: "Parameter nip wajib" }, { status: 400 });

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1`, [nip]);
  if (!asn) return NextResponse.json({ error: "ASN tidak ditemukan" }, { status: 404 });

  const jenis = resolveJenisAsn(asn);
  const { items, summary } = await buildChecklist(asn);

  return NextResponse.json({
    asn,
    jenis_asn: jenis,
    jenis_asn_label: labelJenisAsn(jenis),
    items: items.map((i) => ({ ...i, kondisi_label: conditionLabel(i.kondisi) })),
    summary,
  });
}
