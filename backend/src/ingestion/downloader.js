import config from "../config/env.js";
import { getDrive } from "./driveClient.js";

/**
 * Downloads a file's bytes + metadata from Drive.
 * @returns {Promise<{ buffer: Buffer, meta: { id, name, mimeType } }>}
 */
export async function download(file) {
  if (config.mockMode) {
    // In mock mode the "file" already carries synthetic content.
    return {
      buffer: file.__mockBuffer || Buffer.from(""),
      meta: { id: file.fileId, name: file.name, mimeType: file.mimeType },
    };
  }

  const drive = await getDrive();
  const meta = await drive.files.get({
    fileId: file.fileId,
    fields: "id, name, mimeType",
  });
  const res = await drive.files.get(
    { fileId: file.fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return {
    buffer: Buffer.from(res.data),
    meta: {
      id: meta.data.id,
      name: meta.data.name,
      mimeType: meta.data.mimeType,
    },
  };
}

export default download;
