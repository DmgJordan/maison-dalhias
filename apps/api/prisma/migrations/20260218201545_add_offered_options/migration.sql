-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "cleaning_offered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linen_offered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "contract_snapshots" ADD COLUMN     "cleaning_offered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linen_offered" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "invoice_snapshots" ADD COLUMN     "cleaning_offered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linen_offered" BOOLEAN NOT NULL DEFAULT false;
