import { google } from "googleapis";
import config from "../config/env.js";
import logger from "../lib/logger.js";

let sheets = null;

const INVOICE_HEADERS = [
  "invoice_id", "processed_at", "invoice_number", "invoice_date", "invoice_time",
  "sender_name", "sender_email", "sender_address", "currency", "subtotal", "tax",
  "total", "payment_terms", "due_date", "source_file_name", "source_file_id",
  "status", "extra_fields_json",
];
const LINE_HEADERS = ["line_id", "invoice_id", "description", "quantity", "unit_price", "line_total"];

async function getSheets() {
  if (config.mockMode) return null;
  if (sheets) return sheets;
  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.credentialsPath,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  sheets = google.sheets({ version: "v4", auth: await auth.getClient() });
  return sheets;
}

async function appendRow(api, tab, headers, obj) {
  const values = [headers.map((h) => obj[h] ?? "")];
  await api.spreadsheets.values.append({
    spreadsheetId: config.google.spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values },
  });
}

/**
 * Appends one row to the Invoices tab and N rows to the Line Items tab.
 * In mock mode this is a no-op (the local store is the source of truth).
 */
export async function writeInvoice(invoiceRow, lineItemRows) {
  if (config.mockMode) {
    logger.debug({ invoiceId: invoiceRow.invoice_id }, "mock: skipping Sheets write");
    return;
  }
  const api = await getSheets();
  await appendRow(api, "Invoices", INVOICE_HEADERS, invoiceRow);
  for (const li of lineItemRows) {
    await appendRow(api, "Line Items", LINE_HEADERS, li);
  }
  logger.info({ invoiceId: invoiceRow.invoice_id }, "written to Google Sheets");
}

export default writeInvoice;
