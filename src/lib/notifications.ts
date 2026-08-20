import { query, queryOne } from "./db";
import * as tg from "./telegram";
import { settingsGet } from "./settings";

export interface NotifyOptions {
  chatId: number;
  asnId?: number;
  nip?: string;
  tipe: string;
  judul?: string;
  pesan: string;
  replyMarkup?: object;
}

export async function isNotifEnabled(kunci: string): Promise<boolean> {
  const row = await queryOne<{ aktif: boolean }>(`SELECT aktif FROM notifikasi_config WHERE kunci = $1`, [kunci]);
  return row?.aktif ?? true;
}

export async function notifyAsn(opts: NotifyOptions): Promise<boolean> {
  const enabled = await isNotifEnabled(opts.tipe);
  if (!enabled) return false;
  try {
    const msg = await tg.sendMessage(opts.chatId, opts.pesan, {
      parse_mode: "HTML",
      reply_markup: opts.replyMarkup,
    });
    await query(
      `INSERT INTO notifications (tipe, asn_id, nip, telegram_chat_id, judul, pesan, status, telegram_message_id)
       VALUES ($1,$2,$3,$4,$5,$6,'SENT',$7)`,
      [opts.tipe, opts.asnId ?? null, opts.nip ?? null, opts.chatId, opts.judul ?? null, opts.pesan, msg.message_id]
    );
    return true;
  } catch (e: any) {
    await query(
      `INSERT INTO notifications (tipe, asn_id, nip, telegram_chat_id, judul, pesan, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,'FAILED',$7)`,
      [opts.tipe, opts.asnId ?? null, opts.nip ?? null, opts.chatId, opts.judul ?? null, opts.pesan, e.message]
    );
    return false;
  }
}

export async function notifyDokumenTerkonversi(chatId: number, asnId: number, nip: string, jenisNama: string, pages: number) {
  return notifyAsn({
    chatId,
    asnId,
    nip,
    tipe: "DOKUMEN_KONVERSI",
    judul: "Dokumen Terkonversi",
    pesan: `📄 <b>${jenisNama}</b> berhasil dikonversi menjadi PDF (${pages} halaman).\n\nStatus: ⏳ Menunggu verifikasi admin.`,
  });
}

export async function notifyDokumenDisetujui(chatId: number, asnId: number, nip: string, jenisNama: string, catatan?: string) {
  return notifyAsn({
    chatId,
    asnId,
    nip,
    tipe: "DOKUMEN_DISETUJUI",
    judul: "Dokumen Disetujui",
    pesan:
      `✅ <b>Dokumen disetujui.</b>\n\n` +
      `📄 ${jenisNama}\n` +
      (catatan ? `Catatan: ${catatan}\n` : ""),
  });
}

export async function notifyDokumenDitolak(chatId: number, asnId: number, nip: string, jenisNama: string, alasan: string) {
  const replyMarkup = tg.inlineKeyboard([[{ text: "🔄 Upload Ulang", callback_data: "arsip:upload-select" }]]);
  return notifyAsn({
    chatId,
    asnId,
    nip,
    tipe: "DOKUMEN_DITOLAK",
    judul: "Dokumen Ditolak",
    replyMarkup,
    pesan:
      `⚠️ <b>Dokumen ${jenisNama} perlu diperbaiki.</b>\n\n` +
      `Alasan:\n${alasan}\n\n` +
      `Silakan upload ulang dokumen.`,
  });
}

export async function notifyReminder(nama: string, chatId: number, asnId: number, nip: string, daftarKurang: string[]) {
  const list = daftarKurang.map((x) => `❌ ${x}`).join("\n");
  return notifyAsn({
    chatId,
    asnId,
    nip,
    tipe: "PENGINGAT",
    judul: "Pengingat Arsip",
    pesan:
      `🔔 <b>PENGINGAT ARSIP</b>\n\n` +
      `Halo ${nama}.\n\n` +
      `Arsip Anda belum lengkap.\n\n` +
      `Dokumen yang belum tersedia:\n${list}\n\n` +
      `Silakan lengkapi melalui bot.`,
  });
}