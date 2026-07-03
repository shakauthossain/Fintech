import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getDrive, getWatchFolderId } from "../lib/googleAuth.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import processedStore from "../state/processedStore.js";

/**
 * Local-mode fallback: polls the Drive Changes API every few seconds using a
 * saved page token, emitting any new file that lands in the watched folder.
 */
export async function startPolling(emit) {
  const caps = await getRuntimeCapabilities();
  if (!caps.hasGoogle) {
    logger.info("Drive polling skipped (Google not configured)");
    return;
  }

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

  let ticking = false;
  const inFlight = new Set();

  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try {
      const watchFolderId = await getWatchFolderId();
      if (!watchFolderId) return;

      const client = await getDrive();
      if (!client) return;

      const res = await client.changes.list({
        pageToken,
        fields: "newStartPageToken, nextPageToken, changes(fileId, file(id, name, mimeType, parents, trashed))",
        spaces: "drive",
      });

      const changes = res.data.changes || [];
      const nextToken = res.data.newStartPageToken || res.data.nextPageToken;
      if (nextToken) pageToken = nextToken;

      for (const change of changes) {
        const file = change.file;
        if (!file || file.trashed) continue;
        if (!(file.parents || []).includes(watchFolderId)) continue;
        if (inFlight.has(file.id)) continue;
        if (await processedStore.has(file.id)) continue;

        inFlight.add(file.id);
        try {
          await emit({ fileId: file.id, name: file.name, mimeType: file.mimeType });
        } finally {
          inFlight.delete(file.id);
        }
      }
    } catch (err) {
      logger.error({ err }, "Drive polling tick failed");
    } finally {
      ticking = false;
    }
  };

  setInterval(tick, config.pollIntervalMs);
  logger.info("Drive polling started");
}

export default startPolling;
