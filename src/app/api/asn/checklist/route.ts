import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getAsnSession } from "@/lib/asn-auth";
import { buildChecklist } from "@/lib/rule-engine";
import type { ASN, ChecklistItem, ChecklistSummary } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAsnSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE id = $1 LIMIT 1`, [session.asnId]);
  if (!asn) return NextResponse.json({ error: "Data ASN tidak ditemukan" }, { status: 404 });

  const { items, summary } = await buildChecklist(asn);
  return NextResponse.json({ items: items as ChecklistItem[], summary: summary as ChecklistSummary });
}
