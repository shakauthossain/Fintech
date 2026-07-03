import logger from "../lib/logger.js";
import { getSheets, getSpreadsheetId } from "../lib/googleAuth.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import { INVOICE_HEADERS, LINE_HEADERS } from "./sheetsWriter.js";

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let v = row[i];
    if (v === undefined || v === "") v = null;
    obj[h] = v;
  });
  return obj;
}

function parseNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseInvoiceRow(obj) {
  return {
    ...obj,
    subtotal: parseNumber(obj.subtotal),
    tax: parseNumber(obj.tax),
    total: parseNumber(obj.total),
  };
}

function parseLineItemRow(obj) {
  return {
    ...obj,
    quantity: parseNumber(obj.quantity),
    unit_price: parseNumber(obj.unit_price),
    line_total: parseNumber(obj.line_total),
  };
}

export async function readFromGoogleSheet() {
  const caps = await getRuntimeCapabilities();
  if (!caps.setup?.ready) {
    return { invoices: [], lineItems: [] };
  }

  const api = await getSheets();
  const spreadsheetId = await getSpreadsheetId();
  if (!api || !spreadsheetId) {
    return { invoices: [], lineItems: [] };
  }

  try {
    const [invRes, lineRes] = await Promise.all([
      api.spreadsheets.values.get({
        spreadsheetId,
        range: "Invoices!A2:R",
      }),
      api.spreadsheets.values.get({
        spreadsheetId,
        range: "Line Items!A2:F",
      }),
    ]);

    const invoices = (invRes.data.values || [])
      .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
      .map((row) => parseInvoiceRow(rowToObject(INVOICE_HEADERS, row)))
      .filter((inv) => inv.invoice_id);

    const lineItems = (lineRes.data.values || [])
      .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
      .map((row) => parseLineItemRow(rowToObject(LINE_HEADERS, row)))
      .filter((li) => li.line_id && li.invoice_id);

    return { invoices, lineItems };
  } catch (err) {
    logger.warn({ err }, "failed to read Google Sheet");
    return { invoices: [], lineItems: [] };
  }
}

export default readFromGoogleSheet;
