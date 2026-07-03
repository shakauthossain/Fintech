import logger from "../lib/logger.js";
import {
  getDrive,
  getProcessedFolderId,
  getSheets,
  getSpreadsheetId,
} from "../lib/googleAuth.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";

export const INVOICE_HEADERS = [
  "invoice_id", "processed_at", "invoice_number", "invoice_date", "invoice_time",
  "sender_name", "sender_email", "sender_address", "currency", "subtotal", "tax",
  "total", "payment_terms", "due_date", "source_file_name", "source_file_id",
  "status", "extra_fields_json",
];
export const LINE_HEADERS = ["line_id", "invoice_id", "description", "quantity", "unit_price", "line_total"];

let sheetsReadyFor = null;

async function ensureSheetsReady(api, spreadsheetId) {
  if (sheetsReadyFor === spreadsheetId) return;

  const meta = await api.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties.title",
  });
  const existing = new Set((meta.data.sheets || []).map((s) => s.properties.title));
  const created = new Set();
  const requests = [];

  for (const tab of ["Invoices", "Line Items"]) {
    if (!existing.has(tab)) {
      requests.push({ addSheet: { properties: { title: tab } } });
      created.add(tab);
    }
  }

  if (requests.length) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
    logger.info({ tabs: [...created] }, "created missing Google Sheets tabs");
  }

  for (const [tab, headers] of [
    ["Invoices", INVOICE_HEADERS],
    ["Line Items", LINE_HEADERS],
  ]) {
    if (created.has(tab)) {
      await api.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
      continue;
    }
    const res = await api.spreadsheets.values.get({
      spreadsheetId,
      range: `${tab}!A1`,
    });
    if (!res.data.values?.length) {
      await api.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  }

  sheetsReadyFor = spreadsheetId;
}

async function appendRow(api, spreadsheetId, tab, headers, obj) {
  const values = [headers.map((h) => obj[h] ?? "")];
  await api.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

export async function writeInvoice(invoiceRow, lineItemRows) {
  const caps = await getRuntimeCapabilities();
  if (!caps.hasGoogle) {
    logger.debug({ invoiceId: invoiceRow.invoice_id }, "skipping Sheets write (Google not configured)");
    return;
  }

  const api = await getSheets();
  const spreadsheetId = await getSpreadsheetId();
  if (!api || !spreadsheetId) return;

  await ensureSheetsReady(api, spreadsheetId);
  await appendRow(api, spreadsheetId, "Invoices", INVOICE_HEADERS, invoiceRow);
  for (const li of lineItemRows) {
    await appendRow(api, spreadsheetId, "Line Items", LINE_HEADERS, li);
  }
  logger.info({ invoiceId: invoiceRow.invoice_id }, "written to Google Sheets");
}

export default writeInvoice;
