import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { notifyAsn } from "@/lib/notifications";
import type { ASN, Dokumen, JenisDokumen } from "@/lib/types";

export const runtime = "nodejs";

async function guard(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return session;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(_req);
  if (session instanceof Response) return session;

  const id = Number(params.id);
  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE id = $1`, [id]);
  if (!asn) return NextResponse.json({ error: "ASN tidak ditemukan" }, { status: 404 });

  const docs = await query<Dokumen & { jenis_nama: string }>(
    `SELECT d.*, j.nama AS jenis_nama
     FROM dokumen d
     JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
     WHERE d.nip = $1
     ORDER BY d.created_at DESC`,
    [asn.nip]
  );
  const jenisList = await query<JenisDokumen>(`SELECT * FROM jenis_dokumen WHERE aktif = true`);

  const audit = await query(
    `SELECT * FROM audit_log WHERE nip = $1 ORDER BY created_at DESC LIMIT 20`,
    [asn.nip]
  );

  await auditLog({
    aksi: "VIEW",
    adminUserId: session.userId,
    adminUsername: session.username,
    nip: asn.nip,
    namaAsn: asn.nama,
  });

  return NextResponse.json({ asn, dokumen: docs, jenis_list: jenisList, audit });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(request);
  if (session instanceof Response) return session;

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));

  const allowed = ["nama", "pangkat", "golongan", "jabatan", "unit_kerja", "status", "email", "no_hp", "alamat", "foto_url"];
  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = $${i}`);
      vals.push(body[key]);
      i++;
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });

  vals.push(id);
  const result = await query<ASN>(`UPDATE asn SET ${sets.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING *`, vals);
  if (!result[0]) return NextResponse.json({ error: "ASN tidak ditemukan" }, { status: 404 });

  await auditLog({
    aksi: "CHANGE_DATA",
    adminUserId: session.userId,
    adminUsername: session.username,
    nip: result[0].nip,
    namaAsn: result[0].nama,
    detail: body,
  });

  return NextResponse.json({ asn: result[0] });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(request);
  if (session instanceof Response) return session;
  const asn = await queryOne<ASN>(`SELECT * FROM asn WHERE id = $1`, [Number(params.id)]);
  if (!asn) return NextResponse.json({ error: "ASN tidak ditemukan" }, { status: 404 });

  await query(`DELETE FROM asn WHERE id = $1`, [asn.id]);
  await auditLog({
    aksi: "DELETE",
    adminUserId: session.userId,
    adminUsername: session.username,
    nip: asn.nip,
    namaAsn: asn.nama,
  });

  return NextResponse.json({ ok: true });
}