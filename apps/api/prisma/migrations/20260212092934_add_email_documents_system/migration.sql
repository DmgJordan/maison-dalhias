/*
  Warnings:

  - Added the required column `updated_at` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "updated_at" TIMESTAMP(3);
UPDATE "bookings" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "bookings" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "document_types" TEXT[],
    "subject" TEXT NOT NULL,
    "personal_message" TEXT,
    "resend_message_id" TEXT,
    "status" "EmailStatus" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "contract_snapshot_id" TEXT,
    "invoice_snapshot_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_snapshots" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "client_first_name" TEXT NOT NULL,
    "client_last_name" TEXT NOT NULL,
    "client_address" TEXT NOT NULL,
    "client_city" TEXT NOT NULL,
    "client_postal_code" TEXT NOT NULL,
    "client_country" TEXT NOT NULL,
    "client_email" TEXT,
    "client_phone" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "occupants_count" INTEGER NOT NULL,
    "rental_price" DECIMAL(10,2) NOT NULL,
    "cleaning_included" BOOLEAN NOT NULL,
    "linen_included" BOOLEAN NOT NULL,
    "tourist_tax_included" BOOLEAN NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_snapshots" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "client_first_name" TEXT NOT NULL,
    "client_last_name" TEXT NOT NULL,
    "client_address" TEXT NOT NULL,
    "client_city" TEXT NOT NULL,
    "client_postal_code" TEXT NOT NULL,
    "client_country" TEXT NOT NULL,
    "rental_price" DECIMAL(10,2) NOT NULL,
    "nights_count" INTEGER NOT NULL,
    "cleaning_price" DECIMAL(10,2),
    "linen_price" DECIMAL(10,2),
    "tourist_tax_price" DECIMAL(10,2),
    "total_price" DECIMAL(10,2) NOT NULL,
    "deposit_amount" DECIMAL(10,2) NOT NULL,
    "balance_amount" DECIMAL(10,2) NOT NULL,
    "price_details_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_booking_id_idx" ON "email_logs"("booking_id");

-- CreateIndex
CREATE INDEX "contract_snapshots_booking_id_idx" ON "contract_snapshots"("booking_id");

-- CreateIndex
CREATE INDEX "invoice_snapshots_booking_id_idx" ON "invoice_snapshots"("booking_id");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_contract_snapshot_id_fkey" FOREIGN KEY ("contract_snapshot_id") REFERENCES "contract_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_invoice_snapshot_id_fkey" FOREIGN KEY ("invoice_snapshot_id") REFERENCES "invoice_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_snapshots" ADD CONSTRAINT "contract_snapshots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_snapshots" ADD CONSTRAINT "invoice_snapshots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
