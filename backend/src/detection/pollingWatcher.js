import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getDrive } from "../ingestion/driveClient.js";

/**
 * Local-mode fallback: polls the Drive Changes API every few seconds using a
 * saved page token, emitting any new file that lands in the watched folder.
 * Near-instant in practice and requires no public URL.
 */
export async function startPolling(emit) {
  const drive = await getDrive();
  if (!drive) return;

  let pageToken;
  try {
    const start = await drive.changes.getStartPageToken();
    pageToken = start.data.startPageToken;
  } catch (err) {
    logger.error({ err }, "Failed to get Drive start page token");
    return;
  }

  const tick = async () => {
    try {
      const res = await drive.changes.list({
        pageToken,
        fields: "newStartPageToken, nextPageToken, changes(fileId, file(id, name, mimeType, parents, trashed))",
        spaces: "drive",
      });

      for (const change of res.data.changes || []) {
        const file = change.file;
        if (!file || file.trashed) continue;
        if (!(file.parents || []).includes(config.google.watchFolderId)) continue;
        await emit({ fileId: file.id, name: file.name, mimeType: file.mimeType });
      }

      pageToken = res.data.newStartPageToken || res.data.nextPageToken || pageToken;
    } catch (err) {
      logger.error({ err }, "Drive polling tick failed");
    }
  };

  setInterval(tick, config.pollIntervalMs);
  logger.info("Drive polling started");
}

export default startPolling;
