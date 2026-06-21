import { z } from "zod";

const nullableString = z.string().nullable().optional().default(null);
const nullableNumber = z
  .union([z.number(), z.string()])
  .nullable()
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  });

export const lineItemSchema = z.object({
  description: nullableString,
  quantity: nullableNumber,
  unit_price: nullableNumber,
  line_total: nullableNumber,
});

export const invoiceSchema = z.object({
  invoice_number: nullableString,
  invoice_date: nullableString,
  invoice_time: nullableString,
  sender: z
    .object({
      name: nullableString,
      email: nullableString,
      address: nullableString,
    })
    .default({ name: null, email: null, address: null }),
  currency: nullableString,
  subtotal: nullableNumber,
  tax: nullableNumber,
  total: nullableNumber,
  payment_terms: nullableString,
  due_date: nullableString,
  line_items: z.array(lineItemSchema).default([]),
  extra_fields: z.record(z.any()).default({}),
});

/** Parses + coerces raw LLM JSON; throws if it cannot be made schema-valid. */
export function validateInvoice(raw) {
  return invoiceSchema.parse(raw);
}

export default invoiceSchema;
