import { Router } from "express";
import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getDrive } from "../ingestion/driveClient.js";
import { emitNewFile } from "./index.js";

/**
 * Deployed-mode push: Google calls this endpoint when the watched folder
 * changes. We then list the actual changes and emit new files. Requires a
 * public HTTPS URL and a registered Drive watch channel.
 */
export const driveWebhookRouter = Router();

driveWebhookRouter.post("/webhooks/drive", async (req, res) => {
  // Acknowledge immediately; Google only needs a 200.
  res.status(200).end();

  if (config.mockMode || config.detectionMode !== "push") return;

  try {
    const drive = await getDrive();
    const start = await drive.changes.getStartPageToken();
    const result = await drive.changes.list({
      pageToken: start.data.startPageToken,
      fields: "changes(fileId, file(id, name, mimeType, parents, trashed))",
    });
    for (const change of result.data.changes || []) {
      const file = change.file;
      if (!file || file.trashed) continue;
      if (!(file.parents || []).includes(config.google.watchFolderId)) continue;
      await emitNewFile({ fileId: file.id, name: file.name, mimeType: file.mimeType });
    }
  } catch (err) {
    logger.error({ err }, "Drive webhook handling failed");
  }
});

export default driveWebhookRouter;
