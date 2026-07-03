import invoiceStore from "../store/invoiceStore.js";
import { getRuntimeCapabilities } from "../lib/capabilities.js";
import { readFromGoogleSheet } from "../output/sheetsReader.js";

function mergeInvoices(local, sheets) {
  const byId = new Map();
  for (const inv of sheets) {
    if (inv.invoice_id) byId.set(inv.invoice_id, inv);
  }
  for (const inv of local) {
    const existing = byId.get(inv.invoice_id);
    byId.set(inv.invoice_id, existing ? { ...existing, ...inv } : inv);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.processed_at || 0).getTime() - new Date(a.processed_at || 0).getTime()
  );
}

function mergeLineItems(local, sheets) {
  const byId = new Map();
  for (const li of sheets) {
    if (li.line_id) byId.set(li.line_id, li);
  }
  for (const li of local) {
    byId.set(li.line_id, li);
  }
  return [...byId.values()];
}

async function mergedData() {
  const localInvoices = await invoiceStore.listInvoices();
  const caps = await getRuntimeCapabilities();
  if (!caps.setup?.ready) {
    return {
      invoices: localInvoices,
      lineItems: await invoiceStore.listLineItems(),
    };
  }

  const { invoices: sheetInvoices, lineItems: sheetLineItems } = await readFromGoogleSheet();
  return {
    invoices: mergeInvoices(localInvoices, sheetInvoices),
    lineItems: mergeLineItems(await invoiceStore.listLineItems(), sheetLineItems),
  };
}

export async function listInvoices({ status } = {}) {
  let { invoices } = await mergedData();
  if (status) invoices = invoices.filter((r) => r.status === status);
  return invoices;
}

export async function getInvoice(invoiceId) {
  const local = await invoiceStore.getInvoice(invoiceId);
  if (local) return local;

  const { invoices, lineItems } = await mergedData();
  const invoice = invoices.find((r) => r.invoice_id === invoiceId);
  if (!invoice) return null;
  return {
    ...invoice,
    line_items: lineItems.filter((l) => l.invoice_id === invoiceId),
  };
}

export async function getStats() {
  const { invoices, lineItems } = await mergedData();
  const byStatus = {};
  for (const inv of invoices) {
    byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
  }
  const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  return {
    total: invoices.length,
    lineItems: lineItems.length,
    byStatus,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export default { listInvoices, getInvoice, getStats };
