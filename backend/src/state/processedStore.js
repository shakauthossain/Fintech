import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE = path.join(DATA_DIR, "processed.json");

/**
 * Idempotency guard. Keyed by Drive fileId so a file is never processed twice,
 * even if a detection event fires more than once.
 */
class ProcessedStore {
  constructor() {
    this.ids = new Set();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(FILE, "utf8");
      this.ids = new Set(JSON.parse(raw));
    } catch {
      this.ids = new Set();
    }
    this.loaded = true;
  }

  async has(fileId) {
    await this.load();
    return this.ids.has(fileId);
  }

  async add(fileId) {
    await this.load();
    this.ids.add(fileId);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify([...this.ids], null, 2), "utf8");
  }
}

export const processedStore = new ProcessedStore();
export default processedStore;
