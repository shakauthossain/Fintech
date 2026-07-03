import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getOpenRouter } from "../extraction/openrouterClient.js";
import { OCR_SYSTEM_PROMPT } from "../extraction/prompt.js";

function retryDelayMs(err, attempt) {
  if (err?.status === 429) {
    const reset = Number(err.headers?.["x-ratelimit-reset"]);
    if (Number.isFinite(reset) && reset > Date.now()) {
      return Math.min(reset - Date.now() + 1000, 120_000);
    }
    return 15_000 * attempt;
  }
  return 2000 * attempt;
}

function buildVisionMessage(buffer, mimeType) {
  const b64 = Buffer.isBuffer(buffer) ? buffer.toString("base64") : buffer;
  return [
    { role: "system", content: OCR_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract all visible text from this document." },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${b64}` } },
      ],
    },
  ];
}

/**
 * Vision-model OCR via OpenRouter — returns raw document text, no structuring.
 */
export async function llmOcr(buffer, mimeType) {
  const openrouter = getOpenRouter();
  const model = config.openrouter.ocrModel || config.openrouter.model;
  const messages = buildVisionMessage(buffer, mimeType);
  const maxAttempts = 3;
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const completion = await openrouter.chat.completions.create({
        model,
        messages,
        temperature: 0,
      });
      const text = (completion.choices?.[0]?.message?.content || "").trim();
      if (text.length < 20) {
        throw new Error("OCR model returned insufficient text");
      }
      logger.info({ model, chars: text.length }, "LLM OCR complete");
      return text;
    } catch (err) {
      lastErr = err;
      const delay = retryDelayMs(err, attempt);
      logger.warn({ attempt, model, delayMs: delay, err: err.message }, "LLM OCR attempt failed");
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastErr || new Error("LLM OCR failed");
}

export default llmOcr;
