import { PDFParse } from "pdf-parse";
import logger from "../lib/logger.js";

const MIN_PDF_TEXT_CHARS = 40;

/**
 * Images go to a vision model. PDFs try local text extraction first so free
 * text-only models can handle digital invoices; scanned PDFs fall back to vision.
 */
export async function normalizePdfImage(buffer, meta = {}) {
  const mimeType = meta.mimeType || "";

  if (mimeType.startsWith("image/")) {
    return { kind: "image", data: buffer, mimeType };
  }

  try {
    const parser = new PDFParse({ data: buffer });
    const { text } = await parser.getText();
    await parser.destroy();
    const cleaned = (text || "").replace(/\s+/g, " ").trim();
    if (cleaned.length >= MIN_PDF_TEXT_CHARS) {
      logger.debug({ chars: cleaned.length, fileId: meta.id }, "PDF text extracted locally");
      return { kind: "text", data: cleaned };
    }
  } catch (err) {
    logger.debug({ err: err.message, fileId: meta.id }, "PDF text extraction failed; using vision");
  }

  return { kind: "pdf", data: buffer, mimeType };
}

export default normalizePdfImage;
