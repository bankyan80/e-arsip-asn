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

  const force = url.searchParams.get("force") === "1";
  const nipFilter = url.searchParams.get("nip");

  // Kuota harian email (proteksi hard, tidak bisa dilewati force)
  const dailyLimit = Number(await settingsGet("email_daily_limit", "90"));
  const sentTodayRows = await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM notifications
     WHERE tipe = 'PENGINGAT_EMAIL' AND status = 'SENT'
       AND created_at >= date_trunc('day', now())`
  );
  let budget = Math.max(0, dailyLimit - (sentTodayRows[0]?.n ?? 0));

  // Jarak minimal antar pengingat per ASN (dilewati jika force=1)
  const intervalDays = Number(await settingsGet("reminder_interval_days", "7"));
  const lastSentRows = await query<{ asn_id: number; ts: string }>(
    `SELECT asn_id, MAX(created_at) AS ts FROM notifications
     WHERE tipe IN ('PENGINGAT_EMAIL','PENGINGAT') AND status = 'SENT'
     GROUP BY asn_id`
  );
  const lastSentMap = new Map<number, number>();
  for (const r of lastSentRows) lastSentMap.set(r.asn_id, new Date(r.ts).getTime());

  // ASN yang sudah terkirim email hari ini (hindari dobel saat re-run)
  const emailedToday = new Set(
    (
      await query<{ asn_id: number }>(
        `SELECT DISTINCT asn_id FROM notifications
         WHERE tipe = 'PENGINGAT_EMAIL' AND status = 'SENT'
           AND created_at >= date_trunc('day', now())`
      )
    ).map((r) => r.asn_id)
  );

  let asnList = await query<ASN>(
    `SELECT * FROM asn WHERE telegram_chat_id IS NOT NULL OR (email IS NOT NULL AND email <> '')`
  );
  if (nipFilter) asnList = asnList.filter((a) => a.nip === nipFilter);

  // Prioritas: yang paling lama belum diingatkan (belum pernah duluan)
  asnList.sort(
    (a, b) => (lastSentMap.get(a.id) ?? 0) - (lastSentMap.get(b.id) ?? 0)
  );

  const docs = await query<Dokumen>(`SELECT * FROM dokumen WHERE is_latest = true`);
  const jenisCache = new Map<string, JenisDokumen[]>();

  const report: { nip: string; nama: string; kurang: string[] }[] = [];
  let emailsSent = 0;
  let skippedQuota = 0;
  let skippedInterval = 0;
  const minGapMs = intervalDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const asn of asnList) {
    let jenisList = jenisCache.get(asn.status);
    if (!jenisList) {
      jenisList = await query<JenisDokumen>(
        `SELECT * FROM jenis_dokumen
         WHERE aktif = true
           AND (($1 = 'PNS' AND berlaku_pns = true) OR ($1 = 'PPPK' AND berlaku_pppk = true) OR $1 NOT IN ('PNS','PPPK'))
         ORDER BY urutan ASC`,
        [asn.status]
      );
      jenisCache.set(asn.status, jenisList);
    }

    const kurang = jenisList
      .filter((j) => !docs.some((d) => d.nip === asn.nip && d.jenis_dokumen_id === j.id && d.status !== "DITOLAK"))
      .map((j) => j.nama);

    if (kurang.length === 0) continue;

    // Hormati jarak antar pengingat (kecuali force)
    const last = lastSentMap.get(asn.id);
    if (!force && last && now - last < minGapMs) {
      skippedInterval++;
      continue;
    }

    report.push({ nip: asn.nip, nama: asn.nama, kurang });

    if (asn.telegram_chat_id) {
      await notifyReminder(asn.nama, asn.telegram_chat_id, asn.id, asn.nip, kurang);
    }

    if (asn.email && !emailedToday.has(asn.id)) {
      if (budget <= 0) {
        skippedQuota++;
        continue;
      }
      const ok = await sendReminderEmail(asn.nama, asn.email, asn.id, asn.nip, kurang);
      if (ok) {
        budget--;
        emailsSent++;
        emailedToday.add(asn.id);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    reminded: report.length,
    emailsSent,
    budgetAwalHariIni: sentTodayRows[0]?.n ?? 0,
    sisaKuotaHariIni: budget,
    skippedQuota,
    skippedInterval,
  });
}