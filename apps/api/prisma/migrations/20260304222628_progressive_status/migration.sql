-- Step 1: Create new Status enum type
CREATE TYPE "Status_new" AS ENUM ('DRAFT', 'VALIDATED', 'CONTRACT_SENT', 'DEPOSIT_PAID', 'FULLY_PAID', 'CANCELLED');

-- Step 2: Remove default constraint on status column
ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT;

-- Step 3: Migrate data using text cast via the new enum
ALTER TABLE "bookings"
  ALTER COLUMN "status" TYPE "Status_new"
  USING (
    CASE
      WHEN "status"::text = 'PENDING' THEN 'DRAFT'
      WHEN "status"::text = 'CONFIRMED' AND "payment_status"::text = 'PAID' THEN 'FULLY_PAID'
      WHEN "status"::text = 'CONFIRMED' AND "payment_status"::text = 'PARTIAL' THEN 'DEPOSIT_PAID'
      WHEN "status"::text = 'CONFIRMED' THEN 'VALIDATED'
      WHEN "status"::text = 'CANCELLED' THEN 'CANCELLED'
      ELSE 'DRAFT'
    END
  )::"Status_new";

-- Step 4: Set new default
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"Status_new";

-- Step 5: Drop old enum and rename new one
DROP TYPE "Status";
ALTER TYPE "Status_new" RENAME TO "Status";

-- Step 6: Drop payment_status column
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_status";

-- Step 7: Drop PaymentStatus enum
DROP TYPE IF EXISTS "PaymentStatus";
