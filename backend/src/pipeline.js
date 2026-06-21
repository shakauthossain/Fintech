import logger from "./lib/logger.js";
import processedStore from "./state/processedStore.js";
import { download } from "./ingestion/downloader.js";
import { selectNormalizer } from "./normalization/index.js";
import { extractInvoice } from "./extraction/extractInvoice.js";
import { toRows } from "./mapping/toRows.js";
import { writeInvoice } from "./output/sheetsWriter.js";
import { moveToProcessed } from "./postprocess/fileMover.js";
import invoiceStore from "./store/invoiceStore.js";

/**
 * Orchestrates a single file end-to-end. Ordering invariant: rows are written
 * (and mirrored to the local store) BEFORE the file is moved/marked processed,
 * so a crash mid-pipeline results in safe re-processing rather than data loss.
 *
 * @returns {Promise<{ status: string, invoiceId?: string, reason?: string }>}
 */
export async function processFile(file) {
  const started = Date.now();

  if (await processedStore.has(file.fileId)) {
    logger.info({ fileId: file.fileId }, "skip: already processed");
    return { status: "SKIP", reason: "already_processed" };
  }

  let buffer, meta;
  try {
    ({ buffer, meta } = await download(file));
  } catch (err) {
    logger.error({ err, fileId: file.fileId }, "download failed");
    return { status: "ERROR", reason: "download_failed" };
  }

  const normalizer = selectNormalizer(meta.mimeType);
  if (!normalizer) {
    logger.warn({ mimeType: meta.mimeType, fileId: file.fileId }, "unsupported format");
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
    const input = await normalizer(buffer, meta);
    invoice = await extractInvoice(input, meta);
  } catch (err) {
    logger.error({ err, fileId: file.fileId }, "extraction failed");
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
    await writeInvoice(invoiceRow, lineItemRows);     // (d) write first
    await invoiceStore.addInvoice(invoiceRow, lineItemRows);
  } catch (err) {
    logger.error({ err, fileId: file.fileId }, "sheets write failed; will retry later");
    return { status: "ERROR", reason: "write_failed" };
  }

  await moveToProcessed(file.fileId);                  // (e) move only after write
  await processedStore.add(file.fileId);              // (f) mark processed last

  logger.info(
    { invoiceId: invoiceRow.invoice_id, ms: Date.now() - started },
    "invoice processed"
  );
  return { status: "OK", invoiceId: invoiceRow.invoice_id };
}

export default processFile;
