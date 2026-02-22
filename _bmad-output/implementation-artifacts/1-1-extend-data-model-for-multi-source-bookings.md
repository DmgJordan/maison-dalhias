# Story 1.1: Extend Data Model for Multi-Source Bookings

Status: done

## Story

As an admin,
I want the database schema extended with booking type, source, and payment tracking fields,
so that existing bookings are preserved as DIRECT and the system can support multi-source reservations.

## Acceptance Criteria

1. **Given** the existing Prisma schema with the Booking model
   **When** the migration is applied
   **Then** three new Prisma native enums exist:
   - `BookingType` (DIRECT, EXTERNAL, PERSONAL)
   - `BookingSource` (ABRITEL, AIRBNB, BOOKING_COM, PERSONNEL, FAMILLE, OTHER)
   - `PaymentStatus` (PENDING, PARTIAL, PAID, FREE)

2. **Given** the Booking model
   **When** the schema is updated
   **Then** new fields are added:
   - `bookingType BookingType @default(DIRECT)` — required, immutable after creation
   - `source BookingSource?` — optional
   - `sourceCustomName String?` — optional, used when source = OTHER
   - `label String?` — optional user label for quick bookings
   - `externalAmount Decimal? @db.Decimal(10, 2)` — optional amount from external platform
   - `notes String?` — optional free-text notes
   - `paymentStatus PaymentStatus?` — optional payment tracking

3. **Given** the existing `occupantsCount` field (currently `Int @default(1)`)
   **When** the migration is applied
   **Then** `occupantsCount` becomes nullable (`Int?`) — no default

4. **Given** the existing `rentalPrice` field (currently `Decimal @default(0)`)
   **When** the migration is applied
   **Then** `rentalPrice` becomes nullable (`Decimal? @db.Decimal(10, 2)`) — no default

5. **Given** all new Prisma fields
   **Then** each has a `@map()` decorator for snake_case SQL column names

6. **Given** the migration is additive-only (NFR5)
   **Then** no column removal, no type changes, no data loss on existing records

7. **Given** the existing production booking
   **When** the migration completes
   **Then** it is auto-classified as `BookingType.DIRECT` (via default) with all new nullable fields as null (NFR6, FR30)

8. **Given** the migration
   **When** `npm run db:generate` and `npm run db:migrate` are run
   **Then** both succeed without errors

## Tasks / Subtasks

- [x] Task 1: Update Prisma schema (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Add three enums: BookingType, BookingSource, PaymentStatus
  - [x] 1.2 Add new fields to Booking model with @map() decorators
  - [x] 1.3 Make occupantsCount nullable (remove @default(1))
  - [x] 1.4 Make rentalPrice nullable (remove @default(0))
- [x] Task 2: Generate and run migration (AC: #6, #7, #8)
  - [x] 2.1 Run `npm run db:generate` — verify Prisma client generation
  - [x] 2.2 Run `npm run db:migrate` — verify migration applies cleanly
  - [x] 2.3 Verify existing bookings have bookingType=DIRECT, new fields=null
- [x] Task 3: Update frontend Booking type (AC: #2)
  - [x] 3.1 Extend Booking interface in api.ts with new optional fields
  - [x] 3.2 Add BookingType, BookingSource, PaymentStatus type aliases
  - [x] 3.3 Make occupantsCount and rentalPrice optional in Booking interface
- [x] Task 4: Null-safety audit on existing code paths (AC: #3, #4)
  - [x] 4.1 Audit booking-price-compute.service.ts for null occupantsCount/rentalPrice access
  - [x] 4.2 Audit contract-generator.service.ts for null field access
  - [x] 4.3 Audit invoice-generator.service.ts for null field access
  - [x] 4.4 Audit email.controller.ts for null field access
  - [x] 4.5 Add null guards where needed (do NOT change behavior for existing DIRECT bookings)
- [x] Task 5: Verify no regressions (AC: #6, #8)
  - [x] 5.1 Run `npm run typecheck` — zero errors
  - [x] 5.2 Run `npm run lint` — zero errors
  - [x] 5.3 Verify `npm run dev:api` starts without errors
  - [x] 5.4 Verify `npm run dev:web` starts without errors

## Dev Notes

### Scope Boundaries

**IN SCOPE:** Prisma schema + migration + frontend type updates + null-safety fixes.
**OUT OF SCOPE:** New DTOs, new endpoints, new components, new stores, new views. Those are Stories 1.2–1.5.

### Current Prisma Schema (apps/api/prisma/schema.prisma)

The Booking model currently looks like this — key fields to modify:

```prisma
model Booking {
  id                   String              @id @default(uuid())
  startDate            DateTime            @map("start_date")
  endDate              DateTime            @map("end_date")
  status               Status              @default(PENDING)
  userId               String              @map("user_id")
  user                 User                @relation(fields: [userId], references: [id])
  primaryClientId      String?             @map("primary_client_id")
  primaryClient        Client?             @relation("PrimaryClient", fields: [primaryClientId], references: [id])
  secondaryClientId    String?             @map("secondary_client_id")
  secondaryClient      Client?             @relation("SecondaryClient", fields: [secondaryClientId], references: [id])
  occupantsCount       Int                 @default(1) @map("occupants_count")      // → Make nullable (Int?)
  adultsCount          Int                 @default(1) @map("adults_count")          // Already exists — NO change
  rentalPrice          Decimal             @default(0) @map("rental_price") @db.Decimal(10, 2)  // → Make nullable (Decimal?)
  touristTaxIncluded   Boolean             @default(false) @map("tourist_tax_included")
  cleaningIncluded     Boolean             @default(false) @map("cleaning_included")
  cleaningOffered      Boolean             @default(false) @map("cleaning_offered")
  linenIncluded        Boolean             @default(false) @map("linen_included")
  linenOffered         Boolean             @default(false) @map("linen_offered")
  createdAt            DateTime            @default(now()) @map("created_at")
  updatedAt            DateTime            @updatedAt @map("updated_at")
  emailLogs            EmailLog[]
  contractSnapshots    ContractSnapshot[]
  invoiceSnapshots     InvoiceSnapshot[]
  @@map("bookings")
}
```

**CRITICAL:** `adultsCount` already exists with `@default(1)`. The epic AC mentions it but it's already there — do NOT re-add it.

### Target Prisma Schema Changes

Add these three enums BEFORE the Booking model:

```prisma
enum BookingType {
  DIRECT
  EXTERNAL
  PERSONAL
}

enum BookingSource {
  ABRITEL
  AIRBNB
  BOOKING_COM
  PERSONNEL
  FAMILLE
  OTHER
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  FREE
}
```

Add these fields to the Booking model (place after `userId`/user relation, before `primaryClientId`):

```prisma
  bookingType          BookingType          @default(DIRECT) @map("booking_type")
  source               BookingSource?       @map("source")
  sourceCustomName     String?              @map("source_custom_name")
  label                String?              @map("label")
  externalAmount       Decimal?             @map("external_amount") @db.Decimal(10, 2)
  notes                String?              @map("notes")
  paymentStatus        PaymentStatus?       @map("payment_status")
```

Modify existing fields:

```prisma
  occupantsCount       Int?                 @map("occupants_count")      // Remove @default(1)
  rentalPrice          Decimal?             @map("rental_price") @db.Decimal(10, 2)  // Remove @default(0)
```

### Migration Pattern

Follow the existing migration naming pattern observed in the codebase:
- `20260218201545_add_offered_options`
- `20260212093840_add_adults_count`

The migration will be auto-generated by Prisma. Expected SQL:

```sql
-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('DIRECT', 'EXTERNAL', 'PERSONAL');
CREATE TYPE "BookingSource" AS ENUM ('ABRITEL', 'AIRBNB', 'BOOKING_COM', 'PERSONNEL', 'FAMILLE', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'FREE');

-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "booking_type" "BookingType" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "source" "BookingSource",
  ADD COLUMN "source_custom_name" TEXT,
  ADD COLUMN "label" TEXT,
  ADD COLUMN "external_amount" DECIMAL(10,2),
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "payment_status" "PaymentStatus",
  ALTER COLUMN "occupants_count" DROP NOT NULL,
  ALTER COLUMN "occupants_count" DROP DEFAULT,
  ALTER COLUMN "rental_price" DROP NOT NULL,
  ALTER COLUMN "rental_price" DROP DEFAULT;
```

### Frontend Type Updates (apps/web/src/lib/api.ts)

Add type aliases near the top of the file (next to existing type definitions):

```typescript
export type BookingType = 'DIRECT' | 'EXTERNAL' | 'PERSONAL';
export type BookingSource = 'ABRITEL' | 'AIRBNB' | 'BOOKING_COM' | 'PERSONNEL' | 'FAMILLE' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'FREE';
```

Extend the existing `Booking` interface — add new optional fields and make occupantsCount/rentalPrice optional:

```typescript
export interface Booking {
  // ... existing fields ...
  occupantsCount?: number;    // Was required, now optional
  rentalPrice?: number;       // Was required, now optional
  // New fields:
  bookingType: BookingType;
  source?: BookingSource;
  sourceCustomName?: string;
  label?: string;
  externalAmount?: number;
  notes?: string;
  paymentStatus?: PaymentStatus;
}
```

### Null-Safety Audit — Critical Files

These files access `occupantsCount` and/or `rentalPrice` directly and MUST be audited:

**1. `apps/api/src/bookings/booking-price-compute.service.ts`**
- Line ~33: `const rentalPrice = Number(booking.rentalPrice);` → Guard with null check
- Line ~46: `TARIFS.linge * booking.occupantsCount` → Guard with null check
- Line ~49: `TARIFS.taxeSejour * booking.adultsCount * nightsCount` → adultsCount stays required, OK
- **Fix pattern:** Add early return or throw if required fields are null:
  ```typescript
  if (booking.rentalPrice === null || booking.occupantsCount === null) {
    throw new BadRequestException('Données de tarification incomplètes pour cette réservation');
  }
  ```

**2. `apps/api/src/pdf/contract-generator.service.ts`** and **`invoice-generator.service.ts`**
- Access booking fields for PDF generation
- **Fix pattern:** These are already called behind capability checks (Story 4.2), but add defensive null guards now:
  ```typescript
  const occupants = booking.occupantsCount ?? 0;
  const price = booking.rentalPrice ? Number(booking.rentalPrice) : 0;
  ```

**3. `apps/api/src/email/email.controller.ts`**
- Lines ~81, ~103: passes `rentalPrice: booking.rentalPrice` to email templates
- **Fix pattern:** Add null check before passing to email service

**4. Frontend components accessing these fields**
- `BookingDetailView.vue`, `BookingCard.vue` — display `occupantsCount`, `rentalPrice`
- **Fix pattern:** Use `booking.occupantsCount ?? '-'` for display, `v-if="booking.rentalPrice"` for conditional sections

### Existing Patterns to Follow

| Pattern | Convention | Example |
|---------|-----------|---------|
| Field mapping | `@map("snake_case")` on all fields | `@map("booking_type")` |
| Model mapping | `@@map("table_name")` on all models | `@@map("bookings")` |
| Enum values | SCREAMING_SNAKE_CASE | `BOOKING_COM` |
| Enum names | PascalCase | `BookingType` |
| Decimal fields | `@db.Decimal(10, 2)` | `externalAmount Decimal? @db.Decimal(10, 2)` |
| Optional fields | `Type?` (question mark suffix) | `String?` |
| DTO decorator order | `@IsOptional()` → type → constraints | Already established |
| Error messages | French language | `'Données incomplètes'` |

### DO NOT

- Do NOT add `adultsCount` — it already exists in the schema
- Do NOT create new DTOs (Story 1.2)
- Do NOT create new endpoints (Story 1.2)
- Do NOT create new Vue components (Story 1.3+)
- Do NOT create `quickBookingForm` store (Story 1.4)
- Do NOT modify the existing `newBookingForm` store (NFR13)
- Do NOT modify `CreateBookingDto` or `UpdateBookingDto` (existing DTOs unchanged)
- Do NOT use `any` type anywhere (NFR12)
- Do NOT remove or rename existing columns (NFR5)
- Do NOT change the existing `Status` enum (PENDING, CONFIRMED, CANCELLED)

### Project Structure Notes

Files to modify:
- `apps/api/prisma/schema.prisma` — Add enums + fields + modify nullable
- `apps/web/src/lib/api.ts` — Extend Booking interface + add type aliases
- `apps/api/src/bookings/booking-price-compute.service.ts` — Null-safety guards
- `apps/api/src/pdf/contract-generator.service.ts` — Null-safety guards
- `apps/api/src/pdf/invoice-generator.service.ts` — Null-safety guards
- `apps/api/src/email/email.controller.ts` — Null-safety guards

Files auto-generated:
- `apps/api/prisma/migrations/[timestamp]_add_multi_source_booking/migration.sql`

Files NOT to modify:
- `apps/api/src/bookings/bookings.controller.ts` — No new endpoints in this story
- `apps/api/src/bookings/bookings.service.ts` — No new methods in this story
- `apps/api/src/bookings/dto/*.ts` — No new DTOs in this story
- `apps/web/src/stores/newBookingForm.ts` — Never touch existing store (NFR13)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Model] — Enum definitions, @map() requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Migration Strategy] — Additive-only constraint
- [Source: _bmad-output/planning-artifacts/architecture.md#Null-Safety] — Null-safe patterns
- [Source: apps/api/prisma/schema.prisma] — Current schema to modify
- [Source: apps/api/prisma/migrations/] — Migration naming pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes List

- Added 3 Prisma enums (BookingType, BookingSource, PaymentStatus) and 7 new fields to the Booking model
- Made occupantsCount and rentalPrice nullable to support quick/external bookings without full pricing data
- Migration `20260222013028_add_multi_source_booking` generated and applied — additive-only, zero data loss
- Extended frontend Booking interface with new type aliases and optional fields
- Null-safety audit completed across 5 backend files and 2 frontend components
- Added BadRequestException guards in booking-price-compute, email.controller, and pdf.controller for null pricing fields
- Frontend components use nullish coalescing (`?? 0`, `?? '-'`, `?? 1`) for safe display/form initialization
- All existing DIRECT booking behavior preserved — null guards only block operations when pricing data is genuinely missing
- Zero TypeScript errors, zero lint errors, both frontend and backend build successfully

### Change Log

- 2026-02-22: Story 1.1 implemented — Prisma schema extended with multi-source booking support, migration applied, frontend types updated, null-safety guards added across codebase

### File List

- apps/api/prisma/schema.prisma — Added BookingType, BookingSource, PaymentStatus enums + 7 new fields + made occupantsCount/rentalPrice nullable
- apps/api/prisma/migrations/20260222013028_add_multi_source_booking/migration.sql — Auto-generated migration (additive-only)
- apps/web/src/lib/api.ts — Added BookingType, BookingSource, PaymentStatus type aliases + updated Booking interface
- apps/api/src/bookings/booking-price-compute.service.ts — Added null guard for occupantsCount/rentalPrice
- apps/api/src/email/email.controller.ts — Added null guard + typed variables for occupantsCount/rentalPrice
- apps/api/src/pdf/pdf.controller.ts — Added null guard for occupantsCount + BadRequestException import
- apps/web/src/components/admin/BookingEditModal.vue — Added fallback defaults for nullable fields in form initialization
- apps/web/src/views/admin/BookingDetailView.vue — Added null coalescing for rentalPrice and occupantsCount display
