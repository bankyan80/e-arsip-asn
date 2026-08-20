const BASE = "https://api.telegram.org";

function token() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN belum diset");
  return t;
}

async function call<T = any>(method: string, body: Record<string, any> = {}, parseJson = true): Promise<T> {
  const res = await fetch(`${BASE}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API error (${method}): ${JSON.stringify(data)}`);
  }
  return data.result as T;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  first_name?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  photo?: Array<{ file_id: string; file_unique_id: string; file_size?: number }>;
  callback_query?: { id: string; message: TelegramMessage; data?: string };
}

export interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface Update {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

export async function getMe(): Promise<TelegramUser> {
  return call("getMe");
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts: {
    reply_markup?: object;
    parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
    reply_to_message_id?: number;
    disable_notification?: boolean;
  } = {}
): Promise<TelegramMessage> {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode ?? "HTML",
    reply_markup: opts.reply_markup,
    reply_to_message_id: opts.reply_to_message_id,
    disable_notification: opts.disable_notification,
  });
}

export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  opts: { reply_markup?: object; parse_mode?: "HTML" | "MarkdownV2" | "Markdown" } = {}
): Promise<TelegramMessage> {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: opts.parse_mode ?? "HTML",
    reply_markup: opts.reply_markup,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string, opts: { alert?: boolean } = {}) {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: opts.alert,
  });
}

export async function deleteMessage(chatId: number, messageId: number) {
  return call("deleteMessage", { chat_id: chatId, message_id: messageId });
}

export interface FileInfo {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export async function getFile(fileId: string): Promise<FileInfo> {
  return call("getFile", { file_id: fileId });
}

export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const res = await fetch(`https://api.telegram.org/file/bot${token()}/${filePath}`);
  if (!res.ok) throw new Error(`Gagal unduh file dari Telegram: ${res.status}`);
  return res.arrayBuffer();
}

export async function sendDocument(
  chatId: number,
  fileUrl: string,
  opts: { caption?: string; reply_markup?: object } = {}
): Promise<TelegramMessage> {
  return call("sendDocument", {
    chat_id: chatId,
    document: fileUrl,
    caption: opts.caption,
    parse_mode: "HTML",
    reply_markup: opts.reply_markup,
  });
}

export async function sendDocumentBuffer(
  chatId: number,
  buffer: Buffer,
  fileName: string,
  opts: { caption?: string; reply_markup?: object } = {}
): Promise<TelegramMessage> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new Blob([new Uint8Array(buffer)]), fileName);
  if (opts.caption) form.append("caption", opts.caption);
  form.append("parse_mode", "HTML");
  if (opts.reply_markup) form.append("reply_markup", JSON.stringify(opts.reply_markup));

  const res = await fetch(`${BASE}/bot${token()}/sendDocument`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram API error (sendDocument): ${JSON.stringify(data)}`);
  }
  return data.result as TelegramMessage;
}

export function inlineKeyboard(rows: Array<Array<{ text: string; callback_data?: string; url?: string; web_app?: object }>>) {
  return { inline_keyboard: rows };
}

export function replyKeyboard(rows: Array<Array<{ text: string }>>) {
  return { keyboard: rows, resize_keyboard: true, one_time_keyboard: false };
}

export function removeKeyboard() {
  return { remove_keyboard: true };
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}