import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import logger from "./logger.js";
import { prisma } from "./db.js";
import { invoiceFromApi, lineItemFromApi } from "./invoiceMapper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

const DEFAULT_SUPERADMIN = {
  email: "dev@notionhive.com",
  password: "Notion@Hive2025!",
  role: "superadmin",
};

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function importLegacyJson() {
  const userCount = await prisma.user.count();
  if (userCount > 0) return;

  const usersFile = await readJson("users.json", null);
  if (usersFile?.users?.length) {
    await prisma.user.createMany({
      data: usersFile.users.map((u) => ({
        id: u.id,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        createdAt: new Date(u.createdAt),
      })),
      skipDuplicates: true,
    });
    logger.info({ count: usersFile.users.length }, "imported users from JSON");
    return;
  }

  const email = (process.env.SUPERADMIN_EMAIL || DEFAULT_SUPERADMIN.email).toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || DEFAULT_SUPERADMIN.password;
  await prisma.user.create({
    data: {
      id: nanoid(),
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: DEFAULT_SUPERADMIN.role,
    },
  });
  logger.info({ email }, "seeded superadmin in database");
}

async function importSetupJson() {
  const setup = await prisma.appSetup.findUnique({ where: { id: 1 } });
  if (setup?.watchFolderId || setup?.spreadsheetId || setup?.googleJson) return;

  const legacy = await readJson("setup.json", null);
  if (!legacy) {
    await prisma.appSetup.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return;
  }

  await prisma.appSetup.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      googleJson: legacy.google ?? null,
      watchFolderId: legacy.watchFolderId || "",
      watchFolderName: legacy.watchFolderName || "",
      processedFolderId: legacy.processedFolderId || "",
      processedFolderName: legacy.processedFolderName || "",
      spreadsheetId: legacy.spreadsheetId || "",
      spreadsheetName: legacy.spreadsheetName || "",
      updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : null,
      updatedBy: legacy.updatedBy || null,
    },
    update: {
      googleJson: legacy.google ?? null,
      watchFolderId: legacy.watchFolderId || "",
      watchFolderName: legacy.watchFolderName || "",
      processedFolderId: legacy.processedFolderId || "",
      processedFolderName: legacy.processedFolderName || "",
      spreadsheetId: legacy.spreadsheetId || "",
      spreadsheetName: legacy.spreadsheetName || "",
      updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : null,
      updatedBy: legacy.updatedBy || null,
    },
  });
  logger.info("imported setup from JSON");
}

async function importInvoicesJson() {
  const invoiceCount = await prisma.invoice.count();
  if (invoiceCount > 0) return;

  const legacy = await readJson("invoices.json", null);
  if (!legacy?.invoices?.length) return;

  for (const inv of legacy.invoices) {
    const data = invoiceFromApi(inv);
    const items = (legacy.lineItems || []).filter((li) => li.invoice_id === inv.invoice_id);
    await prisma.invoice.create({
      data: {
        ...data,
        lineItems: {
          create: items.map((li) => lineItemFromApi(li, { nested: true })),
        },
      },
    });
  }
  logger.info({ count: legacy.invoices.length }, "imported invoices from JSON");
}

async function importProcessedJson() {
  const count = await prisma.processedFile.count();
  if (count > 0) return;

  const ids = await readJson("processed.json", []);
  if (!Array.isArray(ids) || !ids.length) return;

  await prisma.processedFile.createMany({
    data: ids.map((fileId) => ({ fileId })),
    skipDuplicates: true,
  });
  logger.info({ count: ids.length }, "imported processed file ids from JSON");
}

export async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  await importLegacyJson();
  await importSetupJson();
  await importInvoicesJson();
  await importProcessedJson();

  logger.info("database ready");
}

export default initDatabase;
