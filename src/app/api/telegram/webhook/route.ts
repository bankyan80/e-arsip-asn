import { NextRequest } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Proteksi webhook: validasi secret token
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token");
  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await request.json();
  try {
    await handleUpdate(update);
  } catch (e: any) {
    console.error("Webhook error:", e.message);
  }

  return new Response("OK", { status: 200 });
}