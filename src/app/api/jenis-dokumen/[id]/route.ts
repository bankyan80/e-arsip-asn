import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import type { JenisDokumen } from "@/lib/types";

export const runtime = "nodejs";

async function guard(request: NextRequest, allowedRoles = ["SUPER ADMIN", "ADMIN"]) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowedRoles.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return session;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(request);
  if (session instanceof NextResponse) return session;

  const id = Number(params.id);
  const body = await request.json().catch(() => ({}));
  const { kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan, aktif } = body;

  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;
  const allowed: Record<string, unknown> = { kode, nama, deskripsi, kategori, wajib, berlaku_pns, berlaku_pppk, urutan, aktif };
  for (const key of Object.keys(allowed)) {
    if (allowed[key] !== undefined) {
      sets.push(`${key} = $${i}`);
      vals.push(allowed[key]);
      i++;
    }
  }
  if (sets.length === 0) return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });

  vals.push(id);
  const rows = await query<JenisDokumen>(`UPDATE jenis_dokumen SET ${sets.join(", ")}, updated_at = now() WHERE id = $${i} RETURNING *`, vals);
  if (!rows[0]) return NextResponse.json({ error: "Jenis dokumen tidak ditemukan" }, { status: 404 });

  await auditLog({
    aksi: "CHANGE_DATA",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { id, ...body },
  });

  return NextResponse.json({ data: rows[0] });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await guard(request, ["SUPER ADMIN"]);
  if (session instanceof NextResponse) return session;

  const id = Number(params.id);
  const docCount = await query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM dokumen WHERE jenis_dokumen_id = $1`, [id]);
  if ((docCount[0]?.total ?? 0) > 0) {
    return NextResponse.json({ error: "Tidak dapat menghapus: masih ada dokumen terhubung" }, { status: 409 });
  }

  await query(`DELETE FROM jenis_dokumen WHERE id = $1`, [id]);
  await auditLog({
    aksi: "DELETE",
    adminUserId: session.userId,
    adminUsername: session.username,
    detail: { id },
  });
  return NextResponse.json({ ok: true });
}