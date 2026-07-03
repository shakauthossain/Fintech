/** Stage 1 — vision OCR model: read the document, return plain text only. */
export const OCR_SYSTEM_PROMPT = `You are an OCR engine.
Extract ALL visible text from the document exactly as it appears.
Preserve line breaks and reading order where helpful.
Return plain text only — no JSON, no markdown, no commentary, no interpretation.`;

const INVOICE_SCHEMA = `{
  "invoice_number": string|null,
  "invoice_date": string|null,        // ISO 8601 (YYYY-MM-DD) if possible
  "invoice_time": string|null,
  "sender": { "name": string|null, "email": string|null, "address": string|null },
  "currency": string|null,            // ISO code (e.g. USD) when determinable
  "subtotal": number|null,
  "tax": number|null,
  "total": number|null,
  "payment_terms": string|null,
  "due_date": string|null,
  "line_items": [
    { "description": string|null, "quantity": number|null, "unit_price": number|null, "line_total": number|null }
  ],
  "extra_fields": { }                  // any other field present on the invoice goes here
}`;

/** Stage 2 — text LLM: rearrange OCR output into structured JSON. */
export const STRUCTURE_SYSTEM_PROMPT = `You are an invoice data structuring engine.
You receive raw OCR text from an invoice document.
Rearrange that text into ONLY a single valid JSON object matching this schema:

${INVOICE_SCHEMA}

Rules:
- Use null for any field that is missing. NEVER invent or guess values.
- Put every field that does not fit the schema above under "extra_fields".
- Return JSON only. No markdown, no code fences, no commentary.`;

export function buildStructureUserPrompt(ocrText) {
  return `Rearrange the following OCR text into structured invoice JSON:\n\n${ocrText}`;
}

// Kept for backwards compatibility
export const SYSTEM_PROMPT = STRUCTURE_SYSTEM_PROMPT;
export function buildUserTextPrompt(text) {
  return buildStructureUserPrompt(text);
}

export default STRUCTURE_SYSTEM_PROMPT;
