import { query, queryOne } from "./db";

export async function settingsGet(key: string, fallback = ""): Promise<string> {
  const row = await queryOne<{ nilai: string }>(`SELECT nilai FROM settings WHERE kunci = $1`, [key]);
  return row?.nilai ?? fallback;
}

export async function settingsAll(): Promise<Record<string, string>> {
  const rows = await query<{ kunci: string; nilai: string }>(`SELECT * FROM settings`);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.kunci] = r.nilai;
  return out;
}