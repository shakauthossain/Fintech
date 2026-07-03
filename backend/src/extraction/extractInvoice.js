import config from "../config/env.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import { extractText } from "../ocr/extractText.js";
import { structureInvoice } from "./structureInvoice.js";
import { validateInvoice } from "../mapping/schema.js";
import { mockExtraction } from "./mockExtraction.js";

/**
 * Two-stage extraction: OCR (raw text) → LLM (structured JSON).
 */
export async function extractInvoice(buffer, meta = {}) {
  const caps = await getRuntimeCapabilities();
  if (!caps.canProcess) {
    return validateInvoice(mockExtraction(meta));
  }

  const rawText = await extractText(buffer, meta);
  return structureInvoice(rawText, meta);
}

export default extractInvoice;
