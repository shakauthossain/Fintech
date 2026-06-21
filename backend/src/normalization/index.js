import { normalizePdfImage } from "./pdfImage.js";
import { normalizeXlsx } from "./xlsx.js";
import { normalizeDocx } from "./docx.js";

const PDF = "application/pdf";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS = "application/vnd.ms-excel";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Returns a normalizer for the given MIME type, or null if unsupported.
 * A normalizer is: async (buffer) => NormalizedInput
 *   { kind: 'pdf'|'image'|'text', data: Buffer|string, mimeType?: string }
 */
export function selectNormalizer(mimeType = "") {
  if (mimeType === PDF) return normalizePdfImage;
  if (mimeType.startsWith("image/")) return normalizePdfImage;
  if (mimeType === XLSX || mimeType === XLS) return normalizeXlsx;
  if (mimeType === DOCX) return normalizeDocx;
  return null;
}

export default selectNormalizer;
