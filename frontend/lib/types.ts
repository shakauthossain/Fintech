export type InvoiceStatus = "OK" | "NEEDS_REVIEW" | "ERROR";

export interface Invoice {
  invoice_id: string;
  processed_at: string;
  invoice_number: string | null;
  invoice_date: string | null;
  invoice_time: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_address: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  payment_terms: string | null;
  due_date: string | null;
  source_file_name: string | null;
  source_file_id: string | null;
  status: InvoiceStatus;
  extra_fields_json: string;
}

export interface LineItem {
  line_id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
}

export interface InvoiceDetail extends Invoice {
  line_items: LineItem[];
}

export interface Stats {
  total: number;
  lineItems: number;
  byStatus: Record<string, number>;
  totalAmount: number;
}

export interface Health {
  ok: boolean;
  mockMode: boolean;
  detectionMode: string;
  capabilities: { hasGoogle: boolean; hasOpenRouter: boolean };
  model: string;
}
