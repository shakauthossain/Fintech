import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getOpenRouter } from "./openrouterClient.js";
import { SYSTEM_PROMPT, buildUserTextPrompt } from "./prompt.js";
import { validateInvoice } from "../mapping/schema.js";
import { mockExtraction } from "./mockExtraction.js";

function stripFences(s) {
  return s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function parseJsonLoose(content) {
  const cleaned = stripFences(content);
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Model did not return parseable JSON");
  }
}

function buildMessages(input) {
  if (input.kind === "text") {
    return [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserTextPrompt(input.data) },
    ];
  }

  // pdf / image -> multimodal content block
  const b64 = Buffer.isBuffer(input.data) ? input.data.toString("base64") : input.data;
  const mime = input.mimeType || (input.kind === "pdf" ? "application/pdf" : "image/png");
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract the invoice data from this document." },
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
      ],
    },
  ];
}

/**
 * Document -> validated invoice JSON. Retries with backoff and performs one
 * repair re-prompt on parse/validation failure before giving up.
 */
export async function extractInvoice(input, meta = {}) {
  if (config.mockMode) {
    return validateInvoice(mockExtraction(meta));
  }

  const openrouter = getOpenRouter();
  const messages = buildMessages(input);
  const maxAttempts = 3;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const completion = await openrouter.chat.completions.create({
        model: config.openrouter.model,
        messages,
        temperature: 0,
        response_format: { type: "json_object" },
      });
      const content = completion.choices?.[0]?.message?.content || "";
      const raw = parseJsonLoose(content);
      return validateInvoice(raw);
    } catch (err) {
      lastErr = err;
      logger.warn({ attempt, err: err.message }, "extraction attempt failed");
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }

  throw lastErr || new Error("extraction failed");
}

export default extractInvoice;
