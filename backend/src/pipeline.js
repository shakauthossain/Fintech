import { nanoid } from "nanoid";
import logger from "./lib/logger.js";
import processedStore from "./state/processedStore.js";
import { download } from "./ingestion/downloader.js";
import { selectNormalizer } from "./normalization/index.js";
import { extractInvoice } from "./extraction/extractInvoice.js";
import { toRows } from "./mapping/toRows.js";
import { writeInvoice } from "./output/sheetsWriter.js";
import { moveToProcessed } from "./postprocess/fileMover.js";
import invoiceStore from "./store/invoiceStore.js";
import { getRuntimeCapabilities } from "./lib/capabilities.js";

async function runPipeline(buffer, meta, { skipDriveActions = false } = {}) {
  const fileId = meta.id ?? meta.fileId;

  const normalizer = selectNormalizer(meta.mimeType);
  if (!normalizer) {
    logger.warn({ mimeType: meta.mimeType, fileId }, "unsupported format");
    const { invoiceRow, lineItemRows } = toRows(
      { sender: {}, line_items: [], extra_fields: {} },
      meta,
      "NEEDS_REVIEW"
    );
    await invoiceStore.addInvoice(invoiceRow, lineItemRows);
    return { status: "NEEDS_REVIEW", invoiceId: invoiceRow.invoice_id, reason: "unsupported_format" };
  }

  let invoice;
  try {
    invoice = await extractInvoice(buffer, meta);
  } catch (err) {
    logger.error({ err, fileId }, "extraction failed");
    const { invoiceRow, lineItemRows } = toRows(
      { sender: {}, line_items: [], extra_fields: {} },
      meta,
      "ERROR"
    );
    await invoiceStore.addInvoice(invoiceRow, lineItemRows);
    return { status: "ERROR", invoiceId: invoiceRow.invoice_id, reason: "extraction_failed" };
  }

  const { invoiceRow, lineItemRows } = toRows(invoice, meta, "OK");

  try {
    await writeInvoice(invoiceRow, lineItemRows);
    await invoiceStore.addInvoice(invoiceRow, lineItemRows);
  } catch (err) {
    logger.error({ err, fileId }, "sheets write failed; will retry later");
    return { status: "ERROR", reason: "write_failed" };
  }

  if (!skipDriveActions) {
    await moveToProcessed(fileId);
    await processedStore.add(fileId);
  }

  return { status: "OK", invoiceId: invoiceRow.invoice_id };
}

export async function processFile(file) {
  const started = Date.now();

  if (await processedStore.has(file.fileId)) {
    logger.info({ fileId: file.fileId }, "skip: already processed");
    return { status: "SKIP", reason: "already_processed" };
  }

  const prior = await invoiceStore.findBySourceFileId(file.fileId);
  if (prior?.status === "OK") {
    logger.info({ fileId: file.fileId, invoiceId: prior.invoice_id }, "skip: already extracted");
    await moveToProcessed(file.fileId).catch((err) => {
      logger.warn({ err, fileId: file.fileId }, "could not move already-processed file");
    });
    await processedStore.add(file.fileId);
    return { status: "SKIP", reason: "already_in_store" };
  }

  let buffer, meta;
  try {
    ({ buffer, meta } = await download(file));
  } catch (err) {
    logger.error({ err, fileId: file.fileId }, "download failed");
    return { status: "ERROR", reason: "download_failed" };
  }

  const result = await runPipeline(buffer, meta);
  if (result.status === "OK") {
    logger.info({ invoiceId: result.invoiceId, ms: Date.now() - started }, "invoice processed");
  }
  return result;
}

export async function processUpload(buffer, originalName, mimeType) {
  const caps = await getRuntimeCapabilities();
  if (!caps.canProcess) {
    return { status: "ERROR", reason: "openrouter_not_configured" };
  }

  const fileId = `upload-${nanoid()}`;
  const meta = { id: fileId, fileId, name: originalName, mimeType };
  const started = Date.now();
  const result = await runPipeline(buffer, meta, { skipDriveActions: true });
  if (result.status === "OK") {
    logger.info({ invoiceId: result.invoiceId, ms: Date.now() - started }, "upload processed");
  }
  return result;
}

export default processFile;
