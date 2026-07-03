import OpenAI from "openai";
import config from "../config/env.js";

let client = null;

/**
 * OpenRouter is OpenAI-compatible, so we use the OpenAI SDK pointed at
 * OpenRouter's base URL. The model is a config value and can be swapped freely.
 * Returns null in mock mode.
 */
export function getOpenRouter() {
  if (!config.openrouter.apiKey) return null;
  if (client) return client;

  client = new OpenAI({
    apiKey: config.openrouter.apiKey,
    baseURL: config.openrouter.baseUrl,
    defaultHeaders: {
      "HTTP-Referer": config.openrouter.siteUrl,
      "X-Title": config.openrouter.appName,
    },
  });
  return client;
}

export default getOpenRouter;
