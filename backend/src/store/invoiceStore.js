import logger from "../lib/logger.js";
import { prisma } from "../lib/db.js";
import { invoiceFromApi, invoiceToApi, lineItemFromApi, lineItemToApi } from "../lib/invoiceMapper.js";

class InvoiceStore {
  async findBySourceFileId(sourceFileId) {
    const row = await prisma.invoice.findFirst({ where: { sourceFileId } });
    return row ? invoiceToApi(row) : null;
  }

  async addInvoice(invoiceRow, lineItemRows) {
    const data = invoiceFromApi(invoiceRow);
    await prisma.invoice.create({
      data: {
        ...data,
        lineItems: {
          create: lineItemRows.map((li) => lineItemFromApi(li, { nested: true })),
        },
      },
    });
    logger.info({ invoiceId: invoiceRow.invoice_id }, "invoice stored");
    return invoiceRow;
  }

  async listInvoices({ status } = {}) {
    const rows = await prisma.invoice.findMany({
      where: status ? { status } : undefined,
      orderBy: { processedAt: "desc" },
    });
    return rows.map(invoiceToApi);
  }

  async listLineItems() {
    const rows = await prisma.lineItem.findMany();
    return rows.map(lineItemToApi);
  }

  async getInvoice(invoiceId) {
    const row = await prisma.invoice.findUnique({
      where: { invoiceId },
      include: { lineItems: true },
    });
    if (!row) return null;
    return {
      ...invoiceToApi(row),
      line_items: row.lineItems.map(lineItemToApi),
    };
  }

  async updateInvoice(invoiceId, patch) {
    try {
      const row = await prisma.invoice.update({
        where: { invoiceId },
        data: patch,
      });
      return invoiceToApi(row);
    } catch {
      return null;
    }
  }

  async stats() {
    const invoices = await prisma.invoice.findMany();
    const lineItems = await prisma.lineItem.count();
    const byStatus = {};
    for (const inv of invoices) {
      byStatus[inv.status] = (byStatus[inv.status] || 0) + 1;
    }
    const totalAmount = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    return {
      total: invoices.length,
      lineItems,
      byStatus,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  async load() {
    // kept for bootstrap compatibility
  }
}

export const invoiceStore = new InvoiceStore();
export default invoiceStore;
