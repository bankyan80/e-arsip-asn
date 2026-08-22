import { NextResponse } from "next/server";
import { clearAsnSession, getAsnSession } from "@/lib/asn-auth";
import { auditLog } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST() {
  const session = await getAsnSession();
  if (session) {
    await auditLog({
      aksi: "LOGOUT",
      adminUsername: `ASN:${session.nip}`,
      nip: session.nip,
      namaAsn: session.nama,
      detail: { portal: "ASN" },
    });
  }
  await clearAsnSession();
  return NextResponse.json({ ok: true });
}
