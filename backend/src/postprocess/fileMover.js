import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getDrive } from "../ingestion/driveClient.js";

/**
 * Moves a processed file into the Processed/ folder by swapping its parents.
 * No-op in mock mode.
 */
export async function moveToProcessed(fileId) {
  if (config.mockMode || !config.google.processedFolderId) {
    logger.debug({ fileId }, "mock: skipping move to Processed/");
    return;
  }
  const drive = await getDrive();
  const meta = await drive.files.get({ fileId, fields: "parents" });
  const previousParents = (meta.data.parents || []).join(",");
  await drive.files.update({
    fileId,
    addParents: config.google.processedFolderId,
    removeParents: previousParents,
    fields: "id, parents",
  });
  logger.info({ fileId }, "moved to Processed/");
}

export default moveToProcessed;
