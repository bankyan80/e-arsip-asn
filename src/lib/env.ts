function get(name: string): string {
  const v = process.env[name];
  if (!v) return "";
  return v;
}

export const env = {
  get databaseUrl() {
    return get("DATABASE_URL");
  },
  get jwtSecret() {
    return get("JWT_SECRET");
  },
  get appName() {
    return get("APP_NAME") || "e-ARSIP ASN";
  },
  get appBaseUrl() {
    return get("APP_BASE_URL") || "http://localhost:3000";
  },
  get telegramBotToken() {
    return get("TELEGRAM_BOT_TOKEN");
  },
  get telegramWebhookSecret() {
    return get("TELEGRAM_WEBHOOK_SECRET");
  },
  get blobReadWriteToken() {
    return get("BLOB_READ_WRITE_TOKEN");
  },
  get cronKey() {
    return get("CRON_KEY") || "e-arsip-reminder-2026";
  },
  get googleDriveClientId() {
    return get("GOOGLE_DRIVE_CLIENT_ID");
  },
  get googleDriveClientSecret() {
    return get("GOOGLE_DRIVE_CLIENT_SECRET");
  },
  get googleDriveRefreshToken() {
    return get("GOOGLE_DRIVE_REFRESH_TOKEN");
  },
  get googleDriveRootFolder() {
    return get("GOOGLE_DRIVE_ROOT_FOLDER") || "e-ARSIP ASN";
  },
};

export function isProd() {
  return process.env.NODE_ENV === "production";
}