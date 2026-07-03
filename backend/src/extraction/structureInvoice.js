import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getOpenRouter } from "./openrouterClient.js";
import { STRUCTURE_SYSTEM_PROMPT, buildStructureUserPrompt } from "./prompt.js";
import { validateInvoice } from "../mapping/schema.js";

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

function retryDelayMs(err, attempt) {
  if (err?.status === 429) {
    const reset = Number(err.headers?.["x-ratelimit-reset"]);
    if (Number.isFinite(reset) && reset > Date.now()) {
      return Math.min(reset - Date.now() + 1000, 120_000);
    }
    return 15_000 * attempt;
  }
  return 1000 * attempt;
}

/**
 * Stage 2: text-only LLM rearranges OCR output into validated invoice JSON.
 */
export async function structureInvoice(rawText, meta = {}) {
  const openrouter = getOpenRouter();
  const messages = [
    { role: "system", content: STRUCTURE_SYSTEM_PROMPT },
    { role: "user", content: buildStructureUserPrompt(rawText) },
  ];
  const maxAttempts = 3;
  let lastErr;
  let lastContent = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const request = {
        model: config.openrouter.model,
        messages,
        temperature: 0,
      };
      if (attempt < maxAttempts) {
        request.response_format = { type: "json_object" };
      }
      const completion = await openrouter.chat.completions.create(request);
      lastContent = completion.choices?.[0]?.message?.content || "";
      const raw = parseJsonLoose(lastContent);
      return validateInvoice(raw);
    } catch (err) {
      lastErr = err;
      const delay = retryDelayMs(err, attempt);
      logger.warn({ attempt, delayMs: delay, err: err.message }, "structure attempt failed");

      if (attempt < maxAttempts && lastContent) {
        messages.push({ role: "assistant", content: lastContent });
        messages.push({
          role: "user",
          content:
            "That response was not valid JSON matching the schema. Return ONLY a single valid JSON object. No markdown.",
        });
      }

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastErr || new Error("structure failed");
}

export default structureInvoice;
