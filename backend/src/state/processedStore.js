import { prisma } from "../lib/db.js";

class ProcessedStore {
  async has(fileId) {
    const row = await prisma.processedFile.findUnique({ where: { fileId } });
    return Boolean(row);
  }

  async add(fileId) {
    await prisma.processedFile.upsert({
      where: { fileId },
      create: { fileId },
      update: {},
    });
  }

  async load() {
    // kept for bootstrap compatibility
  }
}

export const processedStore = new ProcessedStore();
export default processedStore;
