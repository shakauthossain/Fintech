-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_setup" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "google_json" JSONB,
    "watch_folder_id" TEXT NOT NULL DEFAULT '',
    "watch_folder_name" TEXT NOT NULL DEFAULT '',
    "processed_folder_id" TEXT NOT NULL DEFAULT '',
    "processed_folder_name" TEXT NOT NULL DEFAULT '',
    "spreadsheet_id" TEXT NOT NULL DEFAULT '',
    "spreadsheet_name" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3),
    "updated_by" TEXT,

    CONSTRAINT "app_setup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL,
    "invoice_number" TEXT,
    "invoice_date" TEXT,
    "invoice_time" TEXT,
    "sender_name" TEXT,
    "sender_email" TEXT,
    "sender_address" TEXT,
    "currency" TEXT,
    "subtotal" DOUBLE PRECISION,
    "tax" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "payment_terms" TEXT,
    "due_date" TEXT,
    "source_file_name" TEXT,
    "source_file_id" TEXT,
    "status" TEXT NOT NULL,
    "extra_fields_json" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "line_items" (
    "line_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT,
    "quantity" DOUBLE PRECISION,
    "unit_price" DOUBLE PRECISION,
    "line_total" DOUBLE PRECISION,

    CONSTRAINT "line_items_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "processed_files" (
    "file_id" TEXT NOT NULL,

    CONSTRAINT "processed_files_pkey" PRIMARY KEY ("file_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "invoices_source_file_id_idx" ON "invoices"("source_file_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "line_items_invoice_id_idx" ON "line_items"("invoice_id");

-- AddForeignKey
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE CASCADE ON UPDATE CASCADE;
