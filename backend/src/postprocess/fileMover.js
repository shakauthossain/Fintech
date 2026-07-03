import logger from "../lib/logger.js";
import { getDrive, getProcessedFolderId } from "../lib/googleAuth.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";

export async function moveToProcessed(fileId) {
  const caps = await getRuntimeCapabilities();
  if (!caps.hasGoogle) return;

  const processedFolderId = await getProcessedFolderId();
  if (!processedFolderId) {
    logger.debug({ fileId }, "no processed folder configured; skipping move");
    return;
  }

  const drive = await getDrive();
  if (!drive) return;

  const meta = await drive.files.get({ fileId, fields: "parents" });
  const previousParents = (meta.data.parents || []).join(",");
  await drive.files.update({
    fileId,
    addParents: processedFolderId,
    removeParents: previousParents,
    fields: "id, parents",
  });
  logger.info({ fileId }, "moved to Processed/");
}

export default moveToProcessed;
