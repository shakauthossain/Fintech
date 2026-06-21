import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const DATA_FILE = path.join(DATA_DIR, "invoices.json");

/**
 * Lightweight JSON-file store. It is the read source for the REST API and a local
 * mirror of what is written to Google Sheets. In a future phase this is the seam
 * where a real database would slot in (same public methods).
 */
class InvoiceStore {
  constructor() {
    this.state = { invoices: [], lineItems: [] };
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(DATA_FILE, "utf8");
      this.state = JSON.parse(raw);
    } catch {
      this.state = { invoices: [], lineItems: [] };
      await this._persist();
    }
    this.loaded = true;
  }

  async _persist() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(this.state, null, 2), "utf8");
  }

  async addInvoice(invoiceRow, lineItemRows) {
    await this.load();
    this.state.invoices.unshift(invoiceRow);
    this.state.lineItems.push(...lineItemRows);
    await this._persist();
    logger.info({ invoiceId: invoiceRow.invoice_id }, "invoice stored");
    return invoiceRow;
  }

  async listInvoices({ status } = {}) {
    await this.load();
    let rows = [...this.state.invoices];
    if (status) rows = rows.filter((r) => r.status === status);
    return rows;
  }

  async getInvoice(invoiceId) {
    await this.load();
    const invoice = this.state.invoices.find((r) => r.invoice_id === invoiceId);
    if (!invoice) return null;
    const lineItems = this.state.lineItems.filter((l) => l.invoice_id === invoiceId);
    return { ...invoice, line_items: lineItems };
  }

  async updateInvoice(invoiceId, patch) {
    await this.load();
    const idx = this.state.invoices.findIndex((r) => r.invoice_id === invoiceId);
    if (idx === -1) return null;
    this.state.invoices[idx] = { ...this.state.invoices[idx], ...patch };
    await this._persist();
    return this.state.invoices[idx];
  }

  async stats() {
    await this.load();
    const byStatus = {};
    for (const inv of this.state.invoices) {
      byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
    }
    const totalAmount = this.state.invoices.reduce(
      (sum, inv) => sum + (Number(inv.total) || 0),
      0
    );
    return {
      total: this.state.invoices.length,
      lineItems: this.state.lineItems.length,
      byStatus,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }
}

export const invoiceStore = new InvoiceStore();
export default invoiceStore;
