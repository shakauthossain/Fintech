import { PDFParse } from "pdf-parse";
import logger from "../lib/logger.js";
import { normalizeXlsx } from "../normalization/xlsx.js";
import { normalizeDocx } from "../normalization/docx.js";
import { llmOcr } from "./llmOcr.js";
import { localOcrImage } from "./localOcr.js";

const MIN_TEXT_CHARS = 40;

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const XLS = "application/vnd.ms-excel";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF = "application/pdf";

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  await parser.destroy();
  return (text || "").replace(/\s+/g, " ").trim();
}

async function ocrDocument(buffer, mimeType, meta = {}) {
  try {
    return await llmOcr(buffer, mimeType);
  } catch (llmErr) {
    logger.warn({ err: llmErr.message, fileId: meta.id }, "LLM OCR failed");
    if (mimeType.startsWith("image/")) {
      return await localOcrImage(buffer);
    }
    throw llmErr;
  }
}

/**
 * Stage 1: extract raw text from any supported invoice format.
 * Digital PDFs / spreadsheets skip vision OCR; images & scanned PDFs use OCR.
 */
export async function extractText(buffer, meta = {}) {
  const mimeType = meta.mimeType || "";

  if (mimeType === XLSX || mimeType === XLS) {
    const { data } = await normalizeXlsx(buffer);
    return data;
  }
  if (mimeType === DOCX) {
    const { data } = await normalizeDocx(buffer);
    return data;
  }

  if (mimeType === PDF) {
    try {
      const digital = await extractPdfText(buffer);
      if (digital.length >= MIN_TEXT_CHARS) {
        logger.debug({ chars: digital.length, fileId: meta.id }, "PDF text layer extracted");
        return digital;
      }
    } catch (err) {
      logger.debug({ err: err.message, fileId: meta.id }, "PDF text layer extraction failed");
    }
    logger.info({ fileId: meta.id }, "scanned PDF — running OCR");
    return ocrDocument(buffer, mimeType, meta);
  }

  if (mimeType.startsWith("image/")) {
    logger.info({ fileId: meta.id, mimeType }, "image — running OCR");
    return ocrDocument(buffer, mimeType, meta);
  }

  throw new Error(`unsupported mime type for OCR: ${mimeType}`);
}

export default extractText;
