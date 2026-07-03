export function invoiceToApi(row) {
  if (!row) return null;
  return {
    invoice_id: row.invoiceId,
    processed_at: row.processedAt?.toISOString?.() ?? row.processedAt,
    invoice_number: row.invoiceNumber,
    invoice_date: row.invoiceDate,
    invoice_time: row.invoiceTime,
    sender_name: row.senderName,
    sender_email: row.senderEmail,
    sender_address: row.senderAddress,
    currency: row.currency,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    payment_terms: row.paymentTerms,
    due_date: row.dueDate,
    source_file_name: row.sourceFileName,
    source_file_id: row.sourceFileId,
    status: row.status,
    extra_fields_json: row.extraFieldsJson,
  };
}

export function lineItemToApi(row) {
  return {
    line_id: row.lineId,
    invoice_id: row.invoiceId,
    description: row.description,
    quantity: row.quantity,
    unit_price: row.unitPrice,
    line_total: row.lineTotal,
  };
}

export function invoiceFromApi(row) {
  return {
    invoiceId: row.invoice_id,
    processedAt: new Date(row.processed_at),
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    invoiceTime: row.invoice_time,
    senderName: row.sender_name,
    senderEmail: row.sender_email,
    senderAddress: row.sender_address,
    currency: row.currency,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    paymentTerms: row.payment_terms,
    dueDate: row.due_date,
    sourceFileName: row.source_file_name,
    sourceFileId: row.source_file_id,
    status: row.status,
    extraFieldsJson: row.extra_fields_json || "{}",
  };
}

export function lineItemFromApi(row, { nested = false } = {}) {
  const data = {
    lineId: row.line_id,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    lineTotal: row.line_total,
  };
  if (!nested) data.invoiceId = row.invoice_id;
  return data;
}
