import { google } from "googleapis";
import config from "../config/env.js";
import setupStore from "../store/setupStore.js";
import { getEffectiveGoogleConfig } from "./capabilities.js";
import logger from "./logger.js";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
];

let cacheKey = null;
let driveClient = null;
let sheetsClient = null;

function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.googleOAuth.clientId,
    config.googleOAuth.clientSecret,
    config.googleOAuth.redirectUri
  );
}

export function getOAuth2Client() {
  return createOAuth2Client();
}

export function getGoogleAuthUrl(state) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeGoogleCode(code) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email || null;

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiryDate: tokens.expiry_date,
    email,
    connectedAt: new Date().toISOString(),
  };
}

async function buildAuthClient() {
  const effective = await getEffectiveGoogleConfig();
  if (!effective) return null;

  const key = `${effective.source}:${effective.spreadsheetId}:${effective.watchFolderId}`;
  if (cacheKey !== key) {
    cacheKey = key;
    driveClient = null;
    sheetsClient = null;
  }

  if (effective.source === "oauth") {
    await setupStore.load();
    const refreshToken = setupStore.data.google?.refreshToken;
    if (!refreshToken) return null;
    const client = createOAuth2Client();
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: effective.credentialsPath,
    scopes: SCOPES,
  });
  return auth.getClient();
}

export async function getDrive() {
  const effective = await getEffectiveGoogleConfig();
  if (!effective) return null;
  if (driveClient) return driveClient;

  const auth = await buildAuthClient();
  if (!auth) return null;
  driveClient = google.drive({ version: "v3", auth });
  logger.info({ source: effective.source }, "Google Drive client initialised");
  return driveClient;
}

export async function getSheets() {
  const effective = await getEffectiveGoogleConfig();
  if (!effective) return null;
  if (sheetsClient) return sheetsClient;

  const auth = await buildAuthClient();
  if (!auth) return null;
  sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

export async function getSpreadsheetId() {
  const effective = await getEffectiveGoogleConfig();
  return effective?.spreadsheetId || null;
}

export async function getWatchFolderId() {
  const effective = await getEffectiveGoogleConfig();
  return effective?.watchFolderId || null;
}

export async function getProcessedFolderId() {
  const effective = await getEffectiveGoogleConfig();
  return effective?.processedFolderId || "";
}

export function invalidateGoogleClients() {
  cacheKey = null;
  driveClient = null;
  sheetsClient = null;
}

export default getDrive;
