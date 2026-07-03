import config from "../config/env.js";
import logger from "../lib/logger.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import { startPolling } from "./pollingWatcher.js";

let handler = null;

/** Register the single callback invoked for every newly detected file. */
export function onNewFile(fn) {
  handler = fn;
}

/** Used by every detection adapter (poll, push, mock) to feed the pipeline. */
export async function emitNewFile(file) {
  if (!handler) {
    logger.warn("emitNewFile called before a handler was registered");
    return;
  }
  return handler(file);
}

/**
 * Starts the active detection adapter. The rest of the pipeline never knows
 * which mode is running.
 */
export async function startDetection(fn) {
  onNewFile(fn);

  const caps = await getRuntimeCapabilities();
  if (!caps.hasGoogle) {
    logger.info("Detection: disabled (connect Google in Settings or configure .env)");
    return;
  }

  if (config.detectionMode === "push") {
    logger.info("Detection: PUSH mode (Drive watch channel -> POST /webhooks/drive)");
    return;
  }

  logger.info({ intervalMs: config.pollIntervalMs }, "Detection: POLL mode (Drive Changes API)");
  startPolling(emitNewFile);
}

export default startDetection;
