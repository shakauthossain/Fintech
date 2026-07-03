import { Router } from "express";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import setupStore from "../store/setupStore.js";
import {
  exchangeGoogleCode,
  getDrive,
  getGoogleAuthUrl,
  getSheets,
  invalidateGoogleClients,
} from "../lib/googleAuth.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import logger from "../lib/logger.js";
import { requireSuperadmin } from "./authMiddleware.js";

export const setupPublicRouter = Router();
export const setupRouter = Router();

setupPublicRouter.get("/google/callback", async (req, res) => {
  const frontend = config.frontendUrl;
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${frontend}/settings?error=${encodeURIComponent(String(error))}`);
    }
    if (!code || !state) {
      return res.redirect(`${frontend}/settings?error=missing_code`);
    }

    let payload;
    try {
      payload = jwt.verify(String(state), config.auth.jwtSecret);
    } catch {
      return res.redirect(`${frontend}/settings?error=invalid_state`);
    }

    const google = await exchangeGoogleCode(String(code));
    if (!google.refreshToken) {
      return res.redirect(`${frontend}/settings?error=no_refresh_token`);
    }

    await setupStore.setGoogle(google);
    invalidateGoogleClients();
    logger.info({ email: google.email, userId: payload.sub }, "Google account connected");
    res.redirect(`${frontend}/settings?connected=1`);
  } catch (err) {
    logger.error({ err }, "Google OAuth callback failed");
    res.redirect(`${frontend}/settings?error=oauth_failed`);
  }
});

setupRouter.get("/status", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    res.json({
      ...caps.setup,
      oauthConfigured: caps.oauthConfigured,
      canProcess: caps.canProcess,
      hasGoogle: caps.hasGoogle,
      canManageIntegrations: req.user.role === "superadmin",
    });
  } catch (err) {
    next(err);
  }
});

setupRouter.use(requireSuperadmin);

setupRouter.get("/google/connect", (req, res) => {
  if (!config.googleOAuth.clientId || !config.googleOAuth.clientSecret) {
    return res.status(503).json({
      error: "oauth_not_configured",
      message: "Google OAuth is not configured on the server. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.",
    });
  }
  const state = jwt.sign({ sub: req.user.id, purpose: "google_oauth" }, config.auth.jwtSecret, {
    expiresIn: "10m",
  });
  res.json({ url: getGoogleAuthUrl(state) });
});

setupRouter.post("/google/disconnect", async (req, res, next) => {
  try {
    await setupStore.clearGoogle();
    invalidateGoogleClients();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

setupRouter.get("/folders", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    if (!caps.setup.connected) {
      return res.status(400).json({ error: "not_connected", message: "Connect Google first" });
    }
    const drive = await getDrive();
    if (!drive) {
      return res.status(503).json({ error: "drive_unavailable", message: "Could not initialize Google Drive client" });
    }
    const parent = req.query.parent || "root";
    const q =
      parent === "root"
        ? "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false"
        : `mimeType='application/vnd.google-apps.folder' and '${parent}' in parents and trashed=false`;

    const result = await drive.files.list({
      q,
      fields: "files(id, name)",
      orderBy: "name",
      pageSize: 100,
    });
    res.json({ folders: result.data.files || [] });
  } catch (err) {
    next(err);
  }
});

setupRouter.get("/spreadsheets", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    if (!caps.setup.connected) {
      return res.status(400).json({ error: "not_connected", message: "Connect Google first" });
    }
    const drive = await getDrive();
    if (!drive) {
      return res.status(503).json({ error: "drive_unavailable", message: "Could not initialize Google Drive client" });
    }
    const result = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id, name, modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    });
    res.json({ spreadsheets: result.data.files || [] });
  } catch (err) {
    next(err);
  }
});

setupRouter.post("/spreadsheets/create", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    if (!caps.setup.connected) {
      return res.status(400).json({ error: "not_connected", message: "Connect Google first" });
    }
    const title = req.body?.title || "Invoice Pipeline Ledger";
    const sheets = await getSheets();
    if (!sheets) {
      return res.status(503).json({ error: "sheets_unavailable", message: "Could not initialize Google Sheets client" });
    }
    const created = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
    });
    const spreadsheet = created.data;
    res.json({
      spreadsheet: {
        id: spreadsheet.spreadsheetId,
        name: spreadsheet.properties?.title || title,
        url: spreadsheet.spreadsheetUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

setupRouter.put("/config", async (req, res, next) => {
  try {
    const caps = await getRuntimeCapabilities();
    if (!caps.setup.connected) {
      return res.status(400).json({ error: "not_connected", message: "Connect Google first" });
    }

    const {
      watchFolderId,
      watchFolderName,
      processedFolderId,
      processedFolderName,
      spreadsheetId,
      spreadsheetName,
    } = req.body || {};

    if (!watchFolderId || !spreadsheetId) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Inbox folder and spreadsheet are required",
      });
    }

    await setupStore.setConfig(
      {
        watchFolderId,
        watchFolderName: watchFolderName || "",
        processedFolderId: processedFolderId || "",
        processedFolderName: processedFolderName || "",
        spreadsheetId,
        spreadsheetName: spreadsheetName || "",
      },
      req.user.id
    );
    invalidateGoogleClients();

    const status = await getRuntimeCapabilities();
    res.json({ ok: true, setup: status.setup });
  } catch (err) {
    next(err);
  }
});

export default setupRouter;
