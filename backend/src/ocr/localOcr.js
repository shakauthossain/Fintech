import { createWorker } from "tesseract.js";
import logger from "../lib/logger.js";

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng");
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Local Tesseract OCR — free, no API calls. Used as fallback for images.
 */
export async function localOcrImage(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  const text = (data.text || "").trim();
  if (text.length < 20) {
    throw new Error("Local OCR returned insufficient text");
  }
  logger.info({ chars: text.length }, "local OCR complete");
  return text;
}

export default localOcrImage;
