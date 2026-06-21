import { nanoid } from "nanoid";

/**
 * Maps validated invoice JSON + Drive metadata into the two-table row model:
 * one invoice row and N line-item rows (linked by invoice_id).
 */
export function toRows(invoice, meta = {}, status = "OK") {
  const invoiceId = nanoid();
  const processedAt = new Date().toISOString();

  const invoiceRow = {
    invoice_id: invoiceId,
    processed_at: processedAt,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    invoice_time: invoice.invoice_time,
    sender_name: invoice.sender?.name ?? null,
    sender_email: invoice.sender?.email ?? null,
    sender_address: invoice.sender?.address ?? null,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    payment_terms: invoice.payment_terms,
    due_date: invoice.due_date,
    source_file_name: meta.name ?? null,
    source_file_id: meta.id ?? meta.fileId ?? null,
    status,
    extra_fields_json: JSON.stringify(invoice.extra_fields ?? {}),
  };

  const lineItemRows = (invoice.line_items ?? []).map((li) => ({
    line_id: nanoid(),
    invoice_id: invoiceId,
    description: li.description,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: li.line_total,
  }));

  return { invoiceRow, lineItemRows };
}

export default toRows;
