export type InvoiceStatus = "OK" | "NEEDS_REVIEW" | "ERROR";

export type UserRole = "user" | "superadmin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  ok: boolean;
  user: User;
  token?: string;
}

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
  capabilities: {
    hasGoogle: boolean;
    hasOpenRouter: boolean;
    canProcess: boolean;
    oauthConfigured: boolean;
  };
  setup: SetupStatus;
  model: string;
}

export interface SetupStatus {
  connected: boolean;
  ready: boolean;
  oauthConfigured?: boolean;
  canProcess?: boolean;
  hasGoogle?: boolean;
  canManageIntegrations?: boolean;
  googleEmail: string | null;
  watchFolder: { id: string; name: string; url?: string } | null;
  processedFolder: { id: string; name: string; url?: string } | null;
  spreadsheet: { id: string; name: string; url: string } | null;
  updatedAt: string | null;
}

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveSpreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
  url?: string;
}
