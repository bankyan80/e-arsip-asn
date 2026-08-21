import { db, query, queryOne } from "./db";
import * as tg from "./telegram";
import type {
  Update,
  CallbackQuery,
  TelegramMessage,
} from "./telegram";
import {
  imageToPdfBuffers,
  isImageMime,
  isPdfMime,
  isPdfBuffer,
  detectImageFromBuffer,
  pdfPageCount,
} from "./document-processor";
import { saveBlob, buildStoragePath, readBlob } from "./storage";
import { settingsGet } from "./settings";
import {
  buildChecklist,
  resolveJenisAsn,
  conditionLabel,
} from "./rule-engine";
import {
  JENIS_ASN_LIST,
  labelJenisAsn,
} from "./types";
import type {
  ASN,
  JenisDokumen,
  Dokumen,
  UploadSession,
  ChecklistItem,
  ChecklistSummary,
  JenisAsn,
} from "./types";

const CB_PREFIX = "arsip";

// ---------- helpers ----------

function cbData(action: string, payload?: string): string {
  return payload ? `${CB_PREFIX}:${action}:${payload}` : `${CB_PREFIX}:${action}`;
}

function parseCallback(data: string): { action: string; payload: string } | null {
  if (!data.startsWith(CB_PREFIX + ":")) return null;
  const parts = data.split(":");
  if (parts.length < 2) return null;
  return { action: parts[1], payload: parts.slice(2).join(":") };
}

async function getAsnByTelegram(userId: number): Promise<ASN | null> {
  return queryOne<ASN>(`SELECT * FROM asn WHERE telegram_user_id = $1 LIMIT 1`, [userId]);
}

async function getAsnByNip(nip: string): Promise<ASN | null> {
  return queryOne<ASN>(`SELECT * FROM asn WHERE nip = $1 LIMIT 1`, [nip]);
}

async function getChecklist(asn: ASN): Promise<{ items: ChecklistItem[]; summary: ChecklistSummary }> {
  return buildChecklist(asn);
}

function statusIcon(status: string): string {
  switch (status) {
    case "TERVERIFIKASI":
    case "SUDAH TERUPLOAD": return "✅";
    case "MENUNGGU VERIFIKASI": return "⏳";
    case "DITOLAK": return "❌";
    case "PERLU DIPERBARUI": return "⚠️";
    case "BELUM TERSEDIA": return "🔴";
    default: return "🔵"; // OPSIONAL
  }
}

function sifatIcon(sifat: string): string {
  switch (sifat) {
    case "WAJIB": return "⭐";
    case "KONDISIONAL": return "🟡";
    case "LAINNYA": return "📦";
    default: return "🔵";
  }
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function progressBar(percent: number): string {
  const filled = Math.round((percent / 100) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

function buildMenuKeyboard() {
  return tg.inlineKeyboard([
    [{ text: "🔴 Yang Harus Dilengkapi", callback_data: cbData("kurang") }],
    [
      { text: "📁 Upload Arsip", callback_data: cbData("upload") },
      { text: "📂 Arsip Saya", callback_data: cbData("arsip") },
    ],
    [
      { text: "📊 Kelengkapan Arsip", callback_data: cbData("kelengkapan") },
      { text: "🔄 Perbarui Dokumen", callback_data: cbData("perbarui") },
    ],
    [
      { text: "👤 Data Saya", callback_data: cbData("data") },
      { text: "❓ Bantuan", callback_data: cbData("bantuan") },
    ],
  ]);
}

function buildJenisAsnKeyboard() {
  return tg.inlineKeyboard([
    ...JENIS_ASN_LIST.map((j) => [
      { text: labelJenisAsn(j), callback_data: cbData("set-jenis", j) },
    ]),
  ]);
}

// ---------- main dispatcher ----------

export async function handleUpdate(update: Update) {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const fromId = message.from?.id;
  if (!fromId) return;

  // command handling
  const text = message.text ?? "";
  if (text.startsWith("/")) {
    const [cmd] = text.split(" ");
    switch (cmd) {
      case "/start":
      case "/menu":
        return handleStart(chatId, fromId);
      case "/profil":
        return handleDataSaya(chatId, fromId);
      case "/upload":
        return handleUploadMenu(chatId, fromId);
      case "/arsip":
        return handleArsipSaya(chatId, fromId);
      case "/status":
        return handleKelengkapan(chatId, fromId);
      case "/bantuan":
        return handleBantuan(chatId, fromId);
      case "/batal":
        return handleBatal(chatId, fromId);
      default:
        return tg.sendMessage(chatId, "Perintah tidak dikenali. Gunakan /menu untuk melihat menu utama.");
    }
  }

  // Verifikasi NIP (belum terdaftar)
  const asn = await getAsnByTelegram(fromId);
  if (!asn) {
    return handleNipInput(chatId, fromId, text, message.from?.username ?? null);
  }

  // Sudah terdaftar: cek session upload aktif
  const session = await activeSession(fromId);
  if (session) {
    return handleUploadInput(chatId, fromId, message, session, asn);
  }

  // Pesan biasa tanpa konteks
  const keyboard = buildMenuKeyboard();
  await tg.sendMessage(
    chatId,
    `Halo, ${asn.nama}!\n\nSilakan pilih menu di bawah:`,
    { reply_markup: keyboard }
  );
}

async function handleNipInput(chatId: number, fromId: number, text: string, username: string | null) {
  const nip = text.trim();
  if (!/^\d{6,20}$/.test(nip)) {
    return tg.sendMessage(
      chatId,
      "Silakan masukkan NIP Anda (hanya angka).\nContoh: 198501012010011001"
    );
  }

  const asn = await getAsnByNip(nip);
  if (!asn) {
    return tg.sendMessage(
      chatId,
      "NIP tidak ditemukan dalam database.\n\nSilakan periksa kembali NIP Anda atau hubungi administrator."
    );
  }

  // Hubungkan akun telegram
  await query(
    `UPDATE asn
     SET telegram_user_id = $1, telegram_chat_id = $2, telegram_username = $3, telegram_verified_at = now()
     WHERE id = $4`,
    [fromId, chatId, username, asn.id]
  );

  if (!asn.jenis_asn) {
    return tg.sendMessage(
      chatId,
      `✅ Identitas berhasil ditemukan.\n\n` +
        `👤 <b>${tg.escapeHtml(asn.nama)}</b>\n` +
        `NIP: <code>${tg.escapeHtml(asn.nip)}</code>\n\n` +
        `Terakhir, pilih <b>jenis kepegawaian</b> Anda.\n` +
        `Sistem akan menyusun daftar arsip yang sesuai secara otomatis:`,
      { reply_markup: buildJenisAsnKeyboard() }
    );
  }

  const keyboard = buildMenuKeyboard();
  await tg.sendMessage(
    chatId,
    `✅ Identitas berhasil ditemukan.\n\n` +
      `👤 <b>${tg.escapeHtml(asn.nama)}</b>\n` +
      `NIP: <code>${tg.escapeHtml(asn.nip)}</code>\n` +
      `Unit Kerja: ${tg.escapeHtml(asn.unit_kerja ?? "-")}\n\n` +
      `Silakan pilih menu:`,
    { reply_markup: keyboard }
  );
}

async function handleStart(chatId: number, fromId: number) {
  const asn = await getAsnByTelegram(fromId);
  if (asn) {
    if (!asn.jenis_asn) {
      return tg.sendMessage(
        chatId,
        `Selamat datang kembali, <b>${tg.escapeHtml(asn.nama)}</b>!\n\n` +
          `Pilih <b>jenis kepegawaian</b> Anda untuk menyusun daftar arsip:`,
        { reply_markup: buildJenisAsnKeyboard() }
      );
    }
    const keyboard = buildMenuKeyboard();
    return tg.sendMessage(
      chatId,
      `Selamat datang kembali, <b>${tg.escapeHtml(asn.nama)}</b>!`,
      { reply_markup: keyboard }
    );
  }
  await tg.sendMessage(
    chatId,
    "Selamat datang di Sistem Arsip Dokumen ASN.\n\nSilakan masukkan NIP Anda untuk melanjutkan."
  );
}

async function handleBatal(chatId: number, fromId: number) {
  await query(`UPDATE upload_session SET status = 'DIBATALKAN' WHERE telegram_user_id = $1 AND status = 'AKTIF'`, [
    fromId,
  ]);
  await tg.sendMessage(
    chatId,
    "Proses dibatalkan. Gunakan /menu untuk kembali ke menu utama."
  );
}

// ---------- callbacks ----------

async function handleCallback(cb: CallbackQuery) {
  const data = cb.data;
  if (!data) return;
  const parsed = parseCallback(data);
  if (!parsed) return;

  const chatId = cb.message?.chat.id;
  const messageId = cb.message?.message_id;
  const fromId = cb.from.id;
  if (!chatId || !messageId) return;

  const asn = await getAsnByTelegram(fromId);

  switch (parsed.action) {
    case "menu":
      await tg.answerCallbackQuery(cb.id);
      if (asn) {
        const keyboard = buildMenuKeyboard();
        return tg.editMessageText(chatId, messageId, `🏠 <b>Menu Utama</b>\n\nHalo, ${asn.nama}. Silakan pilih menu:`, {
          reply_markup: keyboard,
        });
      }
      await tg.editMessageText(chatId, messageId, "Silakan ketik /start untuk memulai.");
      break;

    case "set-jenis": {
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      const jenis = parsed.payload as JenisAsn;
      if (!(JENIS_ASN_LIST as string[]).includes(jenis)) {
        return tg.answerCallbackQuery(cb.id, "Jenis kepegawaian tidak dikenali.", { alert: true });
      }
      await query(`UPDATE asn SET jenis_asn = $2, updated_at = now() WHERE id = $1`, [asn.id, jenis]);
      const keyboard = buildMenuKeyboard();
      return tg.editMessageText(
        chatId,
        messageId,
        `✅ Jenis kepegawaian disimpan: <b>${labelJenisAsn(jenis)}</b>\n\n` +
          `Daftar arsip Anda sudah disesuaikan otomatis.\nSilakan pilih menu:`,
        { reply_markup: keyboard }
      );
    }

    case "kurang":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleKurang(chatId, fromId, { messageId });

    case "upload-ops":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleUploadOps(chatId, fromId, { messageId });

    case "ganti-jenis":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return tg.editMessageText(
        chatId,
        messageId,
        `🔁 <b>Ganti Jenis Kepegawaian</b>\n\nJenis saat ini: <b>${labelJenisAsn(resolveJenisAsn(asn))}</b>\n\nPilih jenis kepegawaian yang baru:`,
        { reply_markup: buildJenisAsnKeyboard() }
      );

    case "data":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleDataSaya(chatId, fromId, { messageId });

    case "upload":
      await tg.answerCallbackQuery(cb.id);
      return handleUploadMenu(chatId, fromId, { messageId });

    case "arsip":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleArsipSaya(chatId, fromId, { messageId });

    case "kelengkapan":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleKelengkapan(chatId, fromId, { messageId });

    case "perbarui":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handlePerbarui(chatId, fromId, { messageId });

    case "bantuan":
      await tg.answerCallbackQuery(cb.id);
      return handleBantuan(chatId, fromId, { messageId });

    case "upload-select": {
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      const jenisId = Number(parsed.payload);
      if (!jenisId) return;
      return handleDocSelected(chatId, fromId, asn, jenisId, messageId);
    }

    case "upload-add":
      await tg.answerCallbackQuery(cb.id, "Kirim foto halaman berikutnya atau dokumen PDF.", { alert: true });
      break;

    case "upload-cancel":
      await tg.answerCallbackQuery(cb.id, "Upload dibatalkan.", { alert: true });
      return handleBatal(chatId, fromId);

    case "upload-done":
      await tg.answerCallbackQuery(cb.id, "Menggabungkan halaman menjadi satu PDF...");
      return handleSessionDone(chatId, fromId, messageId);

    case "upload-save":
      await tg.answerCallbackQuery(cb.id, "Menyimpan dokumen...");
      return finalizeSession(chatId, fromId, messageId);

    case "upload-retake":
      await tg.answerCallbackQuery(cb.id, "Kirim ulang foto halaman pertama.");
      return handleUploadRetake(chatId, fromId, messageId);

    case "upload-preview":
      await tg.answerCallbackQuery(cb.id, "Pratinjau tidak tersedia di mode teks. Dokumen dikirim sebagai file PDF setelah disimpan.");
      break;

    case "view-doc":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleViewDoc(chatId, fromId, parsed.payload, messageId);

    case "download-doc":
      await tg.answerCallbackQuery(cb.id, "Mengirim dokumen...");
      return handleDownloadDoc(chatId, fromId, parsed.payload);

    case "update-select":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleDocSelected(chatId, fromId, asn, Number(parsed.payload), messageId);

    case "confirm-replace":
      await tg.answerCallbackQuery(cb.id);
      if (!asn) return sendNeedRegister(chatId, messageId);
      return handleDocSelected(chatId, fromId, asn, Number(parsed.payload), messageId);

    case "confirm-keep":
      await tg.answerCallbackQuery(cb.id, "Dokumen lama dipertahankan.");
      const keyboard = buildMenuKeyboard();
      return tg.editMessageText(chatId, messageId, "Baik, dokumen lama tetap dipertahankan.", {
        reply_markup: keyboard,
      });

    default:
      await tg.answerCallbackQuery(cb.id, "Menu tidak tersedia.");
  }
}

async function sendNeedRegister(chatId: number, messageId: number) {
  return tg.editMessageText(
    chatId,
    messageId,
    "Silakan ketik /start dan verifikasi NIP Anda terlebih dahulu."
  );
}

// ---------- data saya ----------

async function handleDataSaya(chatId: number, fromId: number, opts: { messageId?: number } = {}) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) {
    return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");
  }
  const text =
    `👤 <b>DATA ASN</b>\n\n` +
    `Nama: <b>${tg.escapeHtml(asn.nama)}</b>\n` +
    `NIP: <code>${tg.escapeHtml(asn.nip)}</code>\n` +
    `Jenis ASN: <b>${labelJenisAsn(resolveJenisAsn(asn))}</b>\n` +
    `Pangkat/Golongan: ${tg.escapeHtml(asn.pangkat ?? "-")} / ${tg.escapeHtml(asn.golongan ?? "-")}\n` +
    `Jabatan: ${tg.escapeHtml(asn.jabatan ?? "-")}\n` +
    `Unit Kerja: ${tg.escapeHtml(asn.unit_kerja ?? "-")}\n` +
    `Status: ${tg.escapeHtml(asn.status)}\n\n` +
    `Terhubung Telegram: ✅ (${tg.escapeHtml(asn.telegram_username ?? "-")})`;

  const keyboard = tg.inlineKeyboard([
    [{ text: "🔁 Ganti Jenis ASN", callback_data: cbData("ganti-jenis") }],
    [{ text: "⬅️ Kembali", callback_data: cbData("menu") }],
  ]);
  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: keyboard });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}

// ---------- upload menu ----------

async function handleUploadMenu(
  chatId: number,
  fromId: number,
  opts: { messageId?: number } = {}
) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) {
    return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");
  }

  const { items } = await getChecklist(asn);
  // WAJIB + KONDISIONAL aktif; OPSIONAL dipisah ke layar tersendiri
  const prioritas = items.filter(
    (i) => i.sifat === "WAJIB" || i.sifat === "KONDISIONAL" || i.sifat === "LAINNYA"
  );
  const jumlahOpsional = items.filter((i) => i.sifat === "OPSIONAL").length;

  const rows = prioritas.slice(0, 80).map((i) => [
    {
      text: `${sifatIcon(i.sifat)} ${i.nama}${statusIcon(i.status) !== "🔵" ? " " + statusIcon(i.status) : ""}`,
      callback_data: cbData("upload-select", String(i.jenis_dokumen_id)),
    },
  ]);
  if (jumlahOpsional > 0) {
    rows.push([{ text: `🔵 Dokumen Opsional (${jumlahOpsional})`, callback_data: cbData("upload-ops") }]);
  }
  rows.push([{ text: "⬅️ Kembali", callback_data: cbData("menu") }]);

  const keyboard = tg.inlineKeyboard(rows);

  const text =
    `📁 <b>UPLOAD ARSIP</b>\n` +
    `Jenis ASN: <b>${labelJenisAsn(resolveJenisAsn(asn))}</b>\n\n` +
    `⭐ = Wajib · 🟡 = Kondisional · 📦 = Lainnya\n` +
    `Pilih jenis dokumen yang ingin Anda unggah:`;

  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: keyboard });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}

async function handleUploadOps(
  chatId: number,
  fromId: number,
  opts: { messageId?: number } = {}
) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");

  const { items } = await getChecklist(asn);
  const opsional = items.filter((i) => i.sifat === "OPSIONAL");

  const rows = opsional.slice(0, 90).map((i) => [
    {
      text: `🔵 ${i.nama}${i.dokumen_id ? " ✅" : ""}`,
      callback_data: cbData("upload-select", String(i.jenis_dokumen_id)),
    },
  ]);
  rows.push([{ text: "⬅️ Kembali", callback_data: cbData("upload") }]);

  const text =
    `🔵 <b>DOKUMEN OPSIONAL</b>\n\nDokumen berikut bersifat pilihan — unggah jika Anda memilikinya:`;

  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: tg.inlineKeyboard(rows) });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: tg.inlineKeyboard(rows) });
  }
}

// ---------- yang harus dilengkapi ----------

async function handleKurang(
  chatId: number,
  fromId: number,
  opts: { messageId?: number } = {}
) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");

  const { items, summary } = await getChecklist(asn);
  const kurang = items.filter(
    (i) =>
      (i.sifat === "WAJIB" || i.sifat === "KONDISIONAL") &&
      (i.status === "BELUM TERSEDIA" || i.status === "DITOLAK" || i.status === "PERLU DIPERBARUI")
  );

  let text = `🔴 <b>BELUM LENGKAP</b>\n\n`;
  if (kurang.length === 0) {
    text += `🎉 Selamat! Semua dokumen wajib Anda sudah lengkap.\n\n${progressBar(summary.pct)} ${summary.pct}%`;
  } else {
    text += `Yang harus dilengkapi:\n`;
    kurang.slice(0, 30).forEach((i, idx) => {
      const tanda = i.status === "PERLU DIPERBARUI" ? "⚠️" : i.status === "DITOLAK" ? "❌" : "🔴";
      text += `\n${idx + 1}. ${tanda} ${tg.escapeHtml(i.nama)}\n   ${sifatIcon(i.sifat)} ${i.sifat}${i.kondisi ? ` · ${conditionLabel(i.kondisi)}` : ""}`;
    });
    if (kurang.length > 30) text += `\n\n…dan ${kurang.length - 30} dokumen lainnya.`;
  }

  const rows = kurang.slice(0, 40).map((i) => [
    { text: `📄 ${i.nama}`, callback_data: cbData("upload-select", String(i.jenis_dokumen_id)) },
  ]);
  rows.push([{ text: "📁 Upload Arsip Lain", callback_data: cbData("upload") }]);
  rows.push([{ text: "⬅️ Kembali", callback_data: cbData("menu") }]);

  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: tg.inlineKeyboard(rows) });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: tg.inlineKeyboard(rows) });
  }
}

async function handleDocSelected(
  chatId: number,
  fromId: number,
  asn: ASN,
  jenisId: number,
  messageId?: number
) {
  const jenis = await queryOne<JenisDokumen>(`SELECT * FROM jenis_dokumen WHERE id = $1`, [jenisId]);
  if (!jenis) return tg.sendMessage(chatId, "Jenis dokumen tidak ditemukan.");

  // Cek dokumen lama
  const existing = await queryOne<Dokumen>(
    `SELECT * FROM dokumen WHERE nip = $1 AND jenis_dokumen_id = $2 AND is_latest = true ORDER BY versi DESC LIMIT 1`,
    [asn.nip, jenisId]
  );

  // Buat/muat session
  let session = await activeSession(fromId);
  if (session) {
    await query(`UPDATE upload_session SET jenis_dokumen_id = $2 WHERE id = $1`, [session.id, jenisId]);
  } else {
    const rows = await query<UploadSession>(
      `INSERT INTO upload_session (telegram_user_id, telegram_chat_id, asn_id, nip, jenis_dokumen_id, status)
       VALUES ($1, $2, $3, $4, $5, 'AKTIF')
       RETURNING *`,
      [fromId, chatId, asn.id, asn.nip, jenisId]
    );
    session = rows[0];
  }

  const keyboard = tg.inlineKeyboard([
    [{ text: "❌ Batal", callback_data: cbData("upload-cancel") }],
  ]);

  let text = `📄 <b>${tg.escapeHtml(jenis.nama)}</b>\n\nSilakan kirim dokumen Anda.\n\n`;
  text += `Format yang disarankan: PDF.\n`;
  text += `Jika dokumen hanya tersedia dalam bentuk foto, Anda tetap dapat mengirim foto. Sistem akan otomatis mengubahnya menjadi PDF.\n\n`;
  text += `Untuk dokumen multi halaman, kirim foto halaman demi halaman secara berurutan.`;

  if (existing) {
    text += `\n\nℹ️ Anda sudah memiliki ${tg.escapeHtml(jenis.nama)} (versi ${existing.versi}, diunggah ${fmtDate(existing.tanggal_upload)}). Dokumen baru akan disimpan sebagai versi berikutnya.`;
  }

  if (messageId) {
    await tg.editMessageText(chatId, messageId, text, { reply_markup: keyboard });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}

// ---------- upload input (message photo/pdf) ----------

async function activeSession(userId: number): Promise<UploadSession | null> {
  return queryOne<UploadSession>(
    `SELECT * FROM upload_session WHERE telegram_user_id = $1 AND status = 'AKTIF' ORDER BY id DESC LIMIT 1`,
    [userId]
  );
}

async function handleUploadInput(
  chatId: number,
  fromId: number,
  message: TelegramMessage,
  session: UploadSession,
  asn: ASN
) {
  const doc = message.document;
  const photo = message.photo;

  // Dokumen PDF
  if (doc && isPdfMime(doc.mime_type ?? "")) {
    return handlePdfInput(chatId, fromId, message, session, doc.file_id, doc.file_size ?? 0);
  }

  // Dokumen gambar (document photo atau photo)
  let fileId: string | null = null;
  let fileSize = 0;
  if (doc && isImageMime(doc.mime_type ?? "")) {
    fileId = doc.file_id;
    fileSize = doc.file_size ?? 0;
  } else if (photo && photo.length > 0) {
    const largest = photo[photo.length - 1];
    fileId = largest.file_id;
    fileSize = largest.file_size ?? 0;
  }

  if (!fileId) {
    return tg.sendMessage(
      chatId,
      "Silakan kirim dokumen sebagai foto (JPG/PNG/WEBP) atau file PDF.\n\nJika ingin membatalkan, tekan tombol Batal di bawah."
    );
  }

  const maxSize = Number(await settingsGet("max_file_size_mb", "15")) * 1024 * 1024;
  if (fileSize > maxSize) {
    return tg.sendMessage(
      chatId,
      "❌ File terlalu besar.\n\nSilakan kompres dokumen atau kirim foto dengan kualitas yang lebih rendah."
    );
  }

  // Unduh file dari Telegram
  let buf: Buffer;
  try {
    const file = await tg.getFile(fileId);
    const ab = await tg.downloadFile(file.file_path!);
    buf = Buffer.from(ab);
  } catch (e: any) {
    return tg.sendMessage(
      chatId,
      "⚠️ Dokumen sudah diterima tetapi sedang mengalami gangguan penyimpanan. Silakan tunggu beberapa saat."
    );
  }

  const isImg = detectImageFromBuffer(buf);
  const isPdf = isPdfBuffer(buf);

  if (!isImg && !isPdf) {
    return tg.sendMessage(
      chatId,
      "⚠️ Format file tidak dikenali. Silakan kirim foto (JPG/PNG/WEBP) atau file PDF."
    );
  }

  if (isPdf) {
    return handlePdfInput(chatId, fromId, message, session, fileId, buf.length);
  }

  // Foto: simpan ke session
  const files = [...session.foto_file_ids, fileId];
  const jumlah = files.length;

  await query(
    `UPDATE upload_session SET foto_file_ids = $2::jsonb, jumlah_foto = $3, updated_at = now() WHERE id = $1`,
    [session.id, JSON.stringify(files), jumlah]
  );

  const keyboard = tg.inlineKeyboard([
    [
      { text: "➕ Tambah Halaman", callback_data: cbData("upload-add") },
      { text: "✅ Selesai", callback_data: cbData("upload-done") },
    ],
    [{ text: "❌ Batalkan", callback_data: cbData("upload-cancel") }],
  ]);

  await tg.sendMessage(
    chatId,
    `📷 Foto halaman ${jumlah} diterima.\n\n` +
      (jumlah > 1 ? `📑 ${jumlah} halaman telah diterima.\n\n` : "") +
      `Jika dokumen memiliki halaman berikutnya, kirim foto berikutnya.\n` +
      `Jika sudah selesai, tekan tombol SELESAI.`,
    { reply_markup: keyboard }
  );
}

async function handlePdfInput(
  chatId: number,
  fromId: number,
  message: TelegramMessage,
  session: UploadSession,
  fileId: string,
  size: number
) {
  try {
    const file = await tg.getFile(fileId);
    const ab = await tg.downloadFile(file.file_path!);
    const buf = Buffer.from(ab);
    if (!isPdfBuffer(buf)) {
      throw new Error("Bukan PDF");
    }
    const pages = await pdfPageCount(buf);
    if (pages === 0) throw new Error("PDF kosong");

    // Simpan langsung tanpa session foto
    const result = await saveDokumenFromBuffer(
      chatId,
      fromId,
      session,
      buf,
      "application/pdf",
      `PDF (${pages} halaman)`
    );
    await query(`UPDATE upload_session SET status = 'SELESAI' WHERE id = $1`, [session.id]);
    return result;
  } catch {
    return tg.sendMessage(
      chatId,
      "❌ PDF tidak dapat dibaca. Silakan kirim ulang."
    );
  }
}

// ---------- session done / finalize ----------

async function handleSessionDone(chatId: number, fromId: number, messageId: number) {
  const session = await activeSession(fromId);
  if (!session) {
    return tg.sendMessage(chatId, "Tidak ada sesi upload aktif.");
  }
  if (session.jumlah_foto === 0) {
    return tg.sendMessage(chatId, "Belum ada foto yang dikirim.");
  }

  const keyboard = tg.inlineKeyboard([
    [
      { text: "✅ Simpan PDF", callback_data: cbData("upload-save") },
      { text: "🔄 Ulangi", callback_data: cbData("upload-retake") },
    ],
    [{ text: "❌ Batalkan", callback_data: cbData("upload-cancel") }],
  ]);

  const jenis = await queryOne<JenisDokumen>(`SELECT * FROM jenis_dokumen WHERE id = $1`, [session.jenis_dokumen_id]);

  await tg.editMessageText(
    chatId,
    messageId,
    `📑 <b>${session.jumlah_foto} halaman</b> telah diterima untuk dokumen <b>${tg.escapeHtml(jenis?.nama ?? "-")}</b>.\n\n` +
      `Foto akan digabungkan menjadi satu PDF.\n\nTekan <b>Simpan PDF</b> untuk melanjutkan.`,
    { reply_markup: keyboard }
  );
}

async function handleUploadRetake(chatId: number, fromId: number, messageId: number) {
  const session = await activeSession(fromId);
  if (!session) return tg.sendMessage(chatId, "Tidak ada sesi upload aktif.");
  await query(`UPDATE upload_session SET foto_file_ids = '[]'::jsonb, jumlah_foto = 0 WHERE id = $1`, [session.id]);
  await tg.editMessageText(
    chatId,
    messageId,
    "Silakan kirim ulang foto halaman pertama.",
    {}
  );
}

async function finalizeSession(chatId: number, fromId: number, messageId: number) {
  const session = await activeSession(fromId);
  if (!session) return tg.sendMessage(chatId, "Tidak ada sesi upload aktif.");
  if (session.jumlah_foto === 0) return tg.sendMessage(chatId, "Belum ada foto.");

  // Unduh semua foto
  const buffers: Buffer[] = [];
  try {
    for (const fileId of session.foto_file_ids) {
      const file = await tg.getFile(fileId);
      const ab = await tg.downloadFile(file.file_path!);
      buffers.push(Buffer.from(ab));
    }
  } catch {
    return tg.sendMessage(
      chatId,
      "⚠️ Dokumen sudah diterima tetapi sedang mengalami gangguan penyimpanan. Silakan tunggu beberapa saat."
    );
  }

  try {
    const { pdfBuffer, pageCount } = await imageToPdfBuffers(buffers);
    const result = await saveDokumenFromBuffer(
      chatId,
      fromId,
      session,
      pdfBuffer,
      "application/pdf",
      `Foto digabung (${pageCount} halaman)`
    );
    await query(`UPDATE upload_session SET status = 'SELESAI' WHERE id = $1`, [session.id]);
    return result;
  } catch (e: any) {
    return tg.sendMessage(
      chatId,
      "❌ Dokumen gagal diproses.\n\nSilakan kirim ulang foto atau PDF yang lebih jelas."
    );
  }
}

async function saveDokumenFromBuffer(
  chatId: number,
  fromId: number,
  session: UploadSession,
  pdfBuffer: Buffer,
  mimeType: string,
  sumberLabel: string
) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) throw new Error("ASN tidak ditemukan");

  const jenis = await queryOne<JenisDokumen>(`SELECT * FROM jenis_dokumen WHERE id = $1`, [session.jenis_dokumen_id]);
  if (!jenis) throw new Error("Jenis dokumen tidak ditemukan");

  // Versi berikutnya
  const existing = await queryOne<Dokumen>(
    `SELECT * FROM dokumen WHERE nip = $1 AND jenis_dokumen_id = $2 AND is_latest = true ORDER BY versi DESC LIMIT 1`,
    [asn.nip, jenis.id]
  );
  const nextVersion = existing ? existing.versi + 1 : 1;

  // Nonaktifkan is_latest dokumen lama
  if (existing) {
    await query(`UPDATE dokumen SET is_latest = false WHERE nip = $1 AND jenis_dokumen_id = $2`, [asn.nip, jenis.id]);
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const year = new Date().getFullYear().toString();
  const fileName = `${asn.nip}_${jenis.kode}${nextVersion > 1 ? `_v${nextVersion}` : ""}_${dateStr}.pdf`;
  const pathname = buildStoragePath(asn.nip, jenis.kode, year, fileName);

  const stored = await saveBlob(pdfBuffer, pathname, mimeType);
  const pages = await pdfPageCount(pdfBuffer);

  const result = await query<Dokumen>(
    `INSERT INTO dokumen
      (asn_id, nip, jenis_dokumen_id, jenis_dokumen_kode, nama_file, storage_path, blob_url, blob_pathname,
       mime_type, ukuran_file, jumlah_halaman, versi, status, sumber, telegram_file_id, is_latest)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true)
     RETURNING *`,
    [
      asn.id,
      asn.nip,
      jenis.id,
      jenis.kode,
      fileName,
      pathname,
      stored.url,
      stored.pathname,
      mimeType,
      pdfBuffer.length,
      pages,
      nextVersion,
      "MENUNGGU",
      session.sumber,
      session.foto_file_ids[0] ?? null,
    ]
  );

  const doc = result[0];
  await tg.sendMessage(
    chatId,
    `✅ <b>Dokumen diterima dan disimpan.</b>\n\n` +
      `📄 ${tg.escapeHtml(jenis.nama)}\n` +
      `Versi: ${doc.versi}\n` +
      `Jumlah halaman: ${pages}\n` +
      `Ukuran: ${Math.round(pdfBuffer.length / 1024)} KB\n\n` +
      `Status: ⏳ Menunggu verifikasi admin.\n\n` +
      `Gunakan /menu untuk kembali ke menu utama.`
  );

  await notifyAdmins("UPLOAD", `Upload baru: ${jenis.nama} (${asn.nip})`);

  return doc;
}

// ---------- arsip saya ----------

async function handleArsipSaya(chatId: number, fromId: number, opts: { messageId?: number } = {}) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");

  const { items } = await getChecklist(asn);

  let text = `📂 <b>ARSIP SAYA</b>\n`;
  text += `Jenis ASN: <b>${labelJenisAsn(resolveJenisAsn(asn))}</b>\n\n`;

  const uploaded = items.filter((i) => i.dokumen_id);
  for (const i of items.slice(0, 90)) {
    text += `${statusIcon(i.status)} ${tg.escapeHtml(i.nama)}${i.sifat === "LAINNYA" ? " 📦" : ""}\n`;
  }
  if (items.length > 90) text += `\n…dan ${items.length - 90} dokumen lainnya.`;

  const rows = uploaded
    .slice(0, 50)
    .map((i) => [
      {
        text: `📄 ${i.kode}${(i.versi ?? 1) > 1 ? ` (v${i.versi})` : ""}`,
        callback_data: cbData("view-doc", String(i.dokumen_id)),
      },
    ]);
  rows.push([{ text: "⬅️ Kembali", callback_data: cbData("menu") }]);

  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: tg.inlineKeyboard(rows) });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: tg.inlineKeyboard(rows) });
  }
}

async function handleViewDoc(chatId: number, fromId: number, docIdStr: string, messageId: number) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return sendNeedRegister(chatId, messageId);
  const docId = Number(docIdStr);
  const doc = await queryOne<Dokumen>(
    `SELECT d.*, j.nama AS jenis_nama FROM dokumen d JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id WHERE d.id = $1 AND d.nip = $2`,
    [docId, asn.nip]
  );
  if (!doc) return tg.editMessageText(chatId, messageId, "Dokumen tidak ditemukan.");

  const statusMap: Record<string, string> = {
    MENUNGGU: "⏳ Menunggu Verifikasi",
    DISETUJUI: "✅ Disetujui",
    DITOLAK: "❌ Ditolak",
    TERVERIFIKASI: "✅ Terverifikasi (arsip sekolah)",
  };

  const text =
    `📄 <b>${tg.escapeHtml(doc.jenis_dokumen_kode)}</b>\n\n` +
    `Status: ${statusMap[doc.status] ?? doc.status}\n` +
    `Upload: ${fmtDate(doc.tanggal_upload)}\n` +
    `Versi: ${doc.versi}\n` +
    `Halaman: ${doc.jumlah_halaman}\n` +
    (doc.catatan_verifikasi ? `Catatan: ${tg.escapeHtml(doc.catatan_verifikasi)}\n` : "");

  // Dokumen hasil import Drive: tombol buka file asli di Google Drive
  const rowsBtn: Array<Array<{ text: string; callback_data?: string; url?: string }>> = [];
  if (doc.sumber === "drive" && doc.blob_url) {
    rowsBtn.push([{ text: "📥 Buka di Google Drive", url: doc.blob_url }]);
  } else {
    rowsBtn.push([
      { text: "📥 Unduh", callback_data: cbData("download-doc", String(doc.id)) },
      { text: "🔄 Perbarui", callback_data: cbData("update-select", String(doc.jenis_dokumen_id)) },
    ]);
  }
  rowsBtn.push([{ text: "⬅️ Kembali", callback_data: cbData("arsip") }]);

  const keyboard = tg.inlineKeyboard(rowsBtn);

  await tg.editMessageText(chatId, messageId, text, { reply_markup: keyboard });
}

async function handleDownloadDoc(chatId: number, fromId: number, docIdStr: string) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return tg.sendMessage(chatId, "Silakan ketik /start terlebih dahulu.");
  const doc = await queryOne<Dokumen>(`SELECT * FROM dokumen WHERE id = $1 AND nip = $2`, [Number(docIdStr), asn.nip]);
  if (!doc) return tg.sendMessage(chatId, "Dokumen tidak ditemukan.");

  // Dokumen hasil import Drive: kirim tautan file asli
  if (doc.sumber === "drive" && doc.blob_url) {
    await tg.sendMessage(
      chatId,
      `📄 <b>${tg.escapeHtml(doc.jenis_dokumen_kode)}</b> (arsip sekolah)\n\nBuka file di Google Drive:\n${doc.blob_url}`
    );
    await query(`INSERT INTO download_log (dokumen_id, nip, aksi) VALUES ($1, $2, 'DOWNLOAD')`, [doc.id, asn.nip]);
    return;
  }

  try {
    const stored = await readBlob(doc.blob_pathname);
    if (!stored) throw new Error("file not found");
    // Kirim file PDF langsung dari Google Drive (private storage)
    await tg.sendDocumentBuffer(chatId, stored.buffer, stored.name, {
      caption: `📄 ${tg.escapeHtml(doc.jenis_dokumen_kode)} (v${doc.versi})`,
    });
    await query(`INSERT INTO download_log (dokumen_id, nip, aksi) VALUES ($1, $2, 'DOWNLOAD')`, [doc.id, asn.nip]);
  } catch {
    await tg.sendMessage(
      chatId,
      "⚠️ Gagal mengirim file. Silakan coba lagi atau hubungi administrator."
    );
  }
}

// ---------- kelengkapan ----------

async function handleKelengkapan(chatId: number, fromId: number, opts: { messageId?: number } = {}) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");

  const { items, summary } = await getChecklist(asn);

  let text = `📊 <b>KELENGKAPAN ARSIP</b>\n\n`;
  text += `${progressBar(summary.pct)} <b>${summary.pct}% LENGKAP</b>\n\n`;
  text += `✓ ${summary.terverifikasi} Terverifikasi\n`;
  text += `⏳ ${summary.menunggu} Menunggu verifikasi\n`;
  text += `🔴 ${summary.belum} Belum tersedia\n\n`;

  text += `📁 <b>ARSIP ANDA</b>\n`;
  text += `Jenis ASN: <b>${labelJenisAsn(resolveJenisAsn(asn))}</b>\n\n`;
  text += `⭐ Wajib: ${summary.total_wajib} dokumen\n`;
  text += `🟡 Kondisional: ${summary.total_kondisional} dokumen\n`;
  text += `🔵 Opsional: ${summary.total_opsional} dokumen\n`;
  if (summary.total_lainnya > 0) text += `📦 Lainnya (terupload): ${summary.total_lainnya} dokumen\n`;
  if (summary.tidak_relevan > 0) text += `⚪ Tidak relevan untuk Anda: ${summary.tidak_relevan} dokumen\n`;

  const keyboard = tg.inlineKeyboard([
    [{ text: "🔴 Yang Harus Dilengkapi", callback_data: cbData("kurang") }],
    [{ text: "📁 Upload Arsip", callback_data: cbData("upload") }],
    [{ text: "⬅️ Kembali", callback_data: cbData("menu") }],
  ]);

  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: keyboard });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}

// ---------- perbarui dokumen ----------

async function handlePerbarui(chatId: number, fromId: number, opts: { messageId?: number } = {}) {
  const asn = await getAsnByTelegram(fromId);
  if (!asn) return tg.sendMessage(chatId, "Silakan ketik /start untuk verifikasi NIP terlebih dahulu.");

  const docs = await query<Dokumen>(
    `SELECT d.*, j.nama AS jenis_nama FROM dokumen d
     JOIN jenis_dokumen j ON j.id = d.jenis_dokumen_id
     WHERE d.nip = $1 AND d.is_latest = true
     ORDER BY d.created_at DESC`,
    [asn.nip]
  );

  if (docs.length === 0) {
    return tg.sendMessage(
      chatId,
      "Anda belum memiliki dokumen yang dapat diperbarui.\n\nGunakan menu 📁 Upload Arsip untuk mengunggah dokumen pertama Anda."
    );
  }

  let text = `🔄 <b>PERBARUI DOKUMEN</b>\n\nPilih dokumen yang ingin diperbarui:`;
  const rows = docs.map((d) => [
    {
      text: `📄 ${d.jenis_dokumen_kode} (v${d.versi}, upload ${fmtDate(d.tanggal_upload)})`,
      callback_data: cbData("update-select", String(d.jenis_dokumen_id)),
    },
  ]);
  const keyboard = tg.inlineKeyboard([...rows, [{ text: "⬅️ Kembali", callback_data: cbData("menu") }]]);

  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: keyboard });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}

// ---------- bantuan ----------

async function handleBantuan(chatId: number, fromId: number, opts: { messageId?: number } = {}) {
  const text =
    `❓ <b>BANTUAN</b>\n\n` +
    `1. Pilih <b>📁 Upload Arsip</b> untuk mengirim dokumen.\n` +
    `2. Pilih jenis dokumen yang akan dikirim.\n` +
    `3. Kirim foto atau file PDF.\n` +
    `4. Untuk dokumen multi halaman, kirim foto halaman demi halaman, lalu tekan <b>Selesai</b>.\n` +
    `5. Sistem otomatis mengubah foto menjadi satu file PDF.\n` +
    `6. Pantau status melalui menu <b>📂 Arsip Saya</b> atau <b>📊 Kelengkapan Arsip</b>.\n\n` +
    `Perintah: /menu /profil /upload /arsip /status /bantuan`;

  const keyboard = tg.inlineKeyboard([[{ text: "🏠 Menu Utama", callback_data: cbData("menu") }]]);
  if (opts.messageId) {
    await tg.editMessageText(chatId, opts.messageId, text, { reply_markup: keyboard });
  } else {
    await tg.sendMessage(chatId, text, { reply_markup: keyboard });
  }
}

// ---------- notifikasi admin ----------

export async function notifyAdmins(action: string, message: string) {
  // Kirim ke semua admin yang memiliki chat id? Admin biasanya di dashboard, jadi log saja.
  await query(
    `INSERT INTO audit_log (admin_username, aksi, detail) VALUES ('system', $1, jsonb_build_object('msg', $2))`,
    [action, message]
  );
}