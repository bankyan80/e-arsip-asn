import { NextRequest, NextResponse } from "next/server";
import { queryOne, query } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setAsnSession } from "@/lib/asn-auth";
import { auditLog } from "@/lib/audit";
import type { ASN } from "@/lib/types";

export const runtime = "nodejs";

interface OtpRow {
  id: number;
  nip: string;
  kode_hash: string;
  percobaan: number;
  kadaluarsa_at: string;
}

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const { nip, kode } = await request.json().catch(() => ({}));
  if (!nip || !kode) {
    return NextResponse.json({ error: "NIP dan kode wajib diisi" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";

  const row = await queryOne<OtpRow>(
    `SELECT id, nip, kode_hash, percobaan, kadaluarsa_at
     FROM asn_login_otp
     WHERE nip = $1 AND terpakai = false AND kadaluarsa_at > now()
     ORDER BY id DESC LIMIT 1`,
    [String(nip)]
  );
  if (!row) {
    return NextResponse.json(
      { error: "Kode tidak ditemukan atau sudah kedaluwarsa. Silakan minta kode baru." },
      { status: 400 }
    );
  }
  if (row.percobaan >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Percobaan melebihi batas. Silakan minta kode baru." },
      { status: 429 }
    );
  }

  const ok = await bcrypt.compare(String(kode), row.kode_hash);
  if (!ok) {
    await query(`UPDATE asn_login_otp SET percobaan = percobaan + 1 WHERE id = $1`, [row.id]);
    const sisa = MAX_ATTEMPTS - (row.percobaan + 1);
    return NextResponse.json(
      { error: `Kode salah. Sisa percobaan: ${Math.max(0, sisa)}.` },
      { status: 401 }
    );
  }

  await query(`UPDATE asn_login_otp SET terpakai = true WHERE id = $1`, [row.id]);
  await query(`DELETE FROM asn_login_otp WHERE nip = $1`, [row.nip]);

  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1 LIMIT 1`, [row.nip]);
  if (!asn) {
    return NextResponse.json({ error: "Data ASN tidak ditemukan" }, { status: 404 });
  }

  await setAsnSession({ scope: "ASN", asnId: asn.id, nip: asn.nip, nama: asn.nama });

  await auditLog({
    aksi: "LOGIN_ASN",
    adminUsername: `ASN:${asn.nip}`,
    nip: asn.nip,
    namaAsn: asn.nama,
    ipAddress: ip,
    detail: { portal: "ASN", kanal: "OTP" },
  });

  return NextResponse.json({
    user: { id: asn.id, nip: asn.nip, nama: asn.nama },
  });
}
