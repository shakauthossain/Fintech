import logger from "../lib/logger.js";
import { getDrive, getProcessedFolderId } from "../lib/googleAuth.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";

const driveOpts = { supportsAllDrives: true };

export async function moveToProcessed(fileId) {
  const caps = await getRuntimeCapabilities();
  if (!caps.hasGoogle) return false;

  const processedFolderId = await getProcessedFolderId();
  if (!processedFolderId) {
    logger.warn(
      { fileId },
      "processed folder not configured — file stays in inbox (set it in Integrations → Drive folders)"
    );
    return false;
  }

  const drive = await getDrive();
  if (!drive) return false;

  try {
    const meta = await drive.files.get({
      fileId,
      fields: "id, name, parents",
      ...driveOpts,
    });
    const previousParents = (meta.data.parents || []).join(",");
    if (previousParents.includes(processedFolderId)) {
      logger.debug({ fileId }, "file already in processed folder");
      return true;
    }

    await drive.files.update({
      fileId,
      addParents: processedFolderId,
      removeParents: previousParents,
      fields: "id, parents",
      ...driveOpts,
    });
    logger.info({ fileId, name: meta.data.name }, "moved to processed folder");
    return true;
  } catch (err) {
    logger.error({ err, fileId }, "failed to move file to processed folder");
    return false;
  }
}

export default moveToProcessed;
