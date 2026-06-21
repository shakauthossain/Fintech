const VENDORS = [
  { name: "Acme Supplies Ltd.", email: "billing@acme.com", address: "12 Market St, Springfield, 11223" },
  { name: "Globex Corporation", email: "ar@globex.com", address: "500 Industrial Ave, Metropolis, 40404" },
  { name: "Initech LLC", email: "accounts@initech.io", address: "77 TPS Drive, Austin, TX 78701" },
  { name: "Umbrella Trading", email: "invoices@umbrella.co", address: "9 Raccoon Plaza, Raccoon City, 55501" },
];

const ITEMS = [
  ["Widget A", 50], ["Service B", 700], ["Consulting hours", 120],
  ["License (annual)", 999], ["Shipping", 35], ["Support plan", 250],
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Produces plausible invoice JSON so the full stack is demonstrable without a
 * real LLM call. Shape matches the extraction schema exactly.
 */
export function mockExtraction(meta = {}) {
  const vendor = rand(VENDORS);
  const count = 1 + Math.floor(Math.random() * 3);
  const line_items = Array.from({ length: count }, () => {
    const [description, unit_price] = rand(ITEMS);
    const quantity = 1 + Math.floor(Math.random() * 5);
    return { description, quantity, unit_price, line_total: quantity * unit_price };
  });
  const subtotal = line_items.reduce((s, i) => s + i.line_total, 0);
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const now = new Date();

  return {
    invoice_number: `INV-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    invoice_date: now.toISOString().slice(0, 10),
    invoice_time: now.toTimeString().slice(0, 5),
    sender: vendor,
    currency: "USD",
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    payment_terms: "Net 30",
    due_date: new Date(now.getTime() + 30 * 864e5).toISOString().slice(0, 10),
    line_items,
    extra_fields: {
      po_number: `PO-${Math.floor(1000 + Math.random() * 9000)}`,
      source_file: meta.name || "mock-invoice.pdf",
    },
  };
}

export default mockExtraction;
