import { google } from "googleapis";
import config from "../config/env.js";
import logger from "../lib/logger.js";

let driveClient = null;

/**
 * Lazily creates an authenticated Google Drive v3 client using the service
 * account. Returns null in mock mode (no real Drive calls are made).
 */
export async function getDrive() {
  if (config.mockMode) return null;
  if (driveClient) return driveClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.credentialsPath,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  driveClient = google.drive({ version: "v3", auth: await auth.getClient() });
  logger.info("Google Drive client initialised");
  return driveClient;
}

export default getDrive;
