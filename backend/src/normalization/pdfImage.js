/**
 * PDFs and images are passed straight through to a vision-capable model.
 * No text extraction is needed here.
 */
export async function normalizePdfImage(buffer, meta = {}) {
  const kind = (meta.mimeType || "").startsWith("image/") ? "image" : "pdf";
  return { kind, data: buffer, mimeType: meta.mimeType };
}

export default normalizePdfImage;
