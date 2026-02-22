-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('DIRECT', 'EXTERNAL', 'PERSONAL');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ABRITEL', 'AIRBNB', 'BOOKING_COM', 'PERSONNEL', 'FAMILLE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'FREE');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "booking_type" "BookingType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "external_amount" DECIMAL(10,2),
ADD COLUMN     "label" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "payment_status" "PaymentStatus",
ADD COLUMN     "source" "BookingSource",
ADD COLUMN     "source_custom_name" TEXT,
ALTER COLUMN "occupants_count" DROP NOT NULL,
ALTER COLUMN "occupants_count" DROP DEFAULT,
ALTER COLUMN "rental_price" DROP NOT NULL,
ALTER COLUMN "rental_price" DROP DEFAULT;
