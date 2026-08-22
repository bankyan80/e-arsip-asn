import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getAsnSession, maskEmail } from "@/lib/asn-auth";
import { buildChecklist, resolveJenisAsn } from "@/lib/rule-engine";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE id = $1 LIMIT 1`, [session.asnId]);
  if (!asn) return NextResponse.json({ error: "Data ASN tidak ditemukan" }, { status: 404 });

  const { summary } = await buildChecklist(asn);

  return NextResponse.json({
    user: {
      id: asn.id,
      nip: asn.nip,
      nama: asn.nama,
      pangkat: asn.pangkat,
      golongan: asn.golongan,
      jabatan: asn.jabatan,
      unit_kerja: asn.unit_kerja,
      status: asn.status,
      jenis_asn_resolved: resolveJenisAsn(asn),
      email_masked: asn.email ? maskEmail(asn.email) : null,
      no_hp: asn.no_hp,
      telegram_username: asn.telegram_username,
      telegram_verified_at: asn.telegram_verified_at,
    },
    summary,
  });
}
