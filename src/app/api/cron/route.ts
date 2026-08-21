import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { settingsGet } from "@/lib/settings";
import { notifyReminder } from "@/lib/notifications";
import { sendReminderEmail } from "@/lib/email";
import type { ASN, JenisDokumen, Dokumen } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const expected = process.env.CRON_KEY || "e-arsip-reminder-2026";
  if (key !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asnList = await query<ASN>(
    `SELECT * FROM asn WHERE telegram_chat_id IS NOT NULL OR (email IS NOT NULL AND email <> '')`
  );

  const force = url.searchParams.get("force") === "1";
  const nipFilter = url.searchParams.get("nip");
  const reminderDay = Number(await settingsGet("reminder_day", "1"));
  const today = new Date().getDay(); // 0=Sunday
  // Jalankan hanya pada hari yang dikonfigurasi (default Senin=1), kecuali force=1
  if (!force && today !== reminderDay) {
    return NextResponse.json({ skipped: "not reminder day", day: today, expected: reminderDay });
  }

  const target = nipFilter ? asnList.filter((a) => a.nip === nipFilter) : asnList;

  const docs = await query<Dokumen>(`SELECT * FROM dokumen WHERE is_latest = true`);

  const report: { nip: string; nama: string; kurang: string[] }[] = [];

  for (const asn of target) {
    const jenisList = await query<JenisDokumen>(
      `SELECT * FROM jenis_dokumen
       WHERE aktif = true
         AND (($1 = 'PNS' AND berlaku_pns = true) OR ($1 = 'PPPK' AND berlaku_pppk = true) OR $1 NOT IN ('PNS','PPPK'))
       ORDER BY urutan ASC`,
      [asn.status]
    );

    const kurang = jenisList
      .filter((j) => !docs.some((d) => d.nip === asn.nip && d.jenis_dokumen_id === j.id && d.status !== "DITOLAK"))
      .map((j) => j.nama);

    if (kurang.length > 0) {
      report.push({ nip: asn.nip, nama: asn.nama, kurang });
      if (asn.telegram_chat_id) {
        await notifyReminder(asn.nama, asn.telegram_chat_id, asn.id, asn.nip, kurang);
      }
      if (asn.email) {
        await sendReminderEmail(asn.nama, asn.email, asn.id, asn.nip, kurang);
      }
    }
  }

  return NextResponse.json({ ok: true, reminded: report.length });
}