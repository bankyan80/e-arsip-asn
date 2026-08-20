import { neon } from "@neondatabase/serverless";

let sql: ReturnType<typeof neon> | null = null;

export function db() {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL belum diset");
    sql = neon(url);
  }
  return sql;
}

export async function query<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const run = db();
  const rows = await run(text, ...(params as any[]));
  return rows as T[];
}

export async function queryOne<T = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export function timestamp() {
  return new Date().toISOString();
}

export type DbExec = (text: string, params?: unknown[]) => Promise<any[]>;