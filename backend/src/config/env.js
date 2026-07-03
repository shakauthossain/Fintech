import dotenv from "dotenv";

dotenv.config();

const bool = (v, fallback = false) => {
  if (v === undefined || v === null || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
};

const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const hasGoogle = Boolean(
  process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    process.env.DRIVE_WATCH_FOLDER_ID &&
    process.env.SHEETS_SPREADSHEET_ID
);

const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

// Mock mode is on when explicitly requested OR when required credentials are absent.
// This lets the whole stack run locally with zero external accounts.
const mockMode = bool(process.env.MOCK_MODE, false) || !hasGoogle || !hasOpenRouter;

export const config = {
  port: int(process.env.PORT, 8001),
  detectionMode: process.env.DETECTION_MODE || "poll",
  pollIntervalMs: int(process.env.POLL_INTERVAL_MS, 5000),
  maxConcurrentFiles: int(process.env.MAX_CONCURRENT_FILES, 2),
  mockMode,
  capabilities: { hasGoogle, hasOpenRouter },

  google: {
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
    watchFolderId: process.env.DRIVE_WATCH_FOLDER_ID || "",
    processedFolderId: process.env.DRIVE_PROCESSED_FOLDER_ID || "",
    spreadsheetId: process.env.SHEETS_SPREADSHEET_ID || "",
  },

  googleOAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_OAUTH_REDIRECT_URI ||
      "http://localhost:3001/api/setup/google/callback",
  },

  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",

  webhook: {
    publicUrl: process.env.PUBLIC_WEBHOOK_URL || "",
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
    ocrModel: process.env.OPENROUTER_OCR_MODEL || "",
    siteUrl: process.env.OPENROUTER_SITE_URL || "",
    appName: process.env.OPENROUTER_APP_NAME || "invoice-pipeline",
  },

  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3001")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  auth: {
    jwtSecret: process.env.JWT_SECRET || "dev-insecure-change-me-in-production",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
    cookieSecure: bool(process.env.AUTH_COOKIE_SECURE, false),
    cookieMaxAgeMs: int(process.env.AUTH_COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  },
};

export default config;
