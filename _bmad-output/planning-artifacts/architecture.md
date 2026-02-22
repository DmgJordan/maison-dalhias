---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-21'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/prd-validation-report.md'
  - '_bmad-output/planning-artifacts/product-brief-maison-dalhias-2026-02-20.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-19.md'
workflowType: 'architecture'
project_name: 'maison-dalhias'
user_name: 'Jordan'
date: '2026-02-20'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

39 FRs organized into 7 groups:

| Group | FRs | Architectural Implication |
|-------|-----|--------------------------|
| Booking Creation | FR1-FR10 | Dual creation flow (6-step vs 2-step), BookingType enum, source-to-type auto-mapping, differentiated DTO validation |
| Conflict Management | FR11-FR13 | Unified conflict checking across all types, explicit error messages with booking identification, data preservation on error |
| Display & Navigation | FR14-FR17 | Single chronological list with mixed types, colored source badges, adapted detail page with conditional content |
| Booking Modification | FR18-FR23 | Lightweight edit modal (quick fields only), progressive enrichment wizard (partial pre-fill), payment status tracking, cross-cutting notes field |
| Document Generation | FR24-FR28 | Data-driven conditional actions (contract/invoice/email enabled by data completeness, not type), disabled states with explicit messages, hidden on cancelled |
| Existing Compatibility | FR29-FR32 | Zero regression on 6-step wizard, existing bookings auto-classified as DIRECT, public calendar reflects all types, PDF generation unchanged |

**Non-Functional Requirements:**

15 NFRs in 3 groups:

| Group | Key NFRs | Architectural Impact |
|-------|----------|---------------------|
| Security | NFR1-4 | JWT+Admin on all new endpoints, no public client data, strict DTO validation, Decimal type for financial data |
| Data Integrity | NFR5-10 | Additive-only migration, atomic conflict checking (concurrent safety), immutable BookingType, server-enforced source-to-type mapping, null-safe handling for newly optional fields |
| Maintainability | NFR11-15 | Existing conventions (ESLint, Prettier, Composition API), no `any` types, separate Pinia store for quick bookings, validation decorators consistent with existing DTOs, pre-commit hooks pass |

**UX Specification:**

- Design Direction B (Compact & Efficient) — stacked type selector, inline recap banner, unified list container
- 10 new components: SourceBadge, PaymentStatusBadge, TypeSelectorRow, StepIndicator, RecapBanner, QuickBookingEditModal, ActionCard, DisabledActionRow, SuccessScreen, InfoBubble
- 1 modified component: BookingCard (extended with source badge, nullable field handling)
- Senior-first accessibility: 48px min targets, 16px min body text, WCAG AA contrast, no icon-only buttons
- Desktop-first (Chrome latest), existing responsive patterns maintained

**Scale & Complexity:**

- Primary domain: Full-stack web (Vue 3 + NestJS + PostgreSQL)
- Complexity level: Low-moderate (single entity extension, 2 users, no real-time, no multi-tenancy)
- Estimated architectural components: ~15 (10 new Vue components, 2-3 new backend DTOs, 1 Prisma migration, 1 new Pinia store)

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|-----------|--------|--------|
| Brownfield monorepo | Existing codebase | All new code must follow existing conventions (Composition API, NestJS modules, Prisma ORM) |
| Additive-only migration | NFR5-6 | No column removal, no type changes. New columns nullable or with defaults. |
| Existing Pinia store untouched | NFR13 | `newBookingForm` store must not be modified. New `quickBookingForm` store is separate. |
| Solo developer | Project context | Build order must allow each layer to be independently testable. No parallel workstreams. |
| 2-user system | Project context | No performance benchmarks, no load testing, no cross-browser. Standard best practices sufficient. |
| Production data | Risk mitigation | 1 existing booking must survive migration intact. Post-migration verification required. |
| Pre-commit hooks | NFR15 | All new/modified files must pass ESLint + Prettier via Husky/lint-staged. |

### Cross-Cutting Concerns Identified

| Concern | Affected Layers | Description |
|---------|----------------|-------------|
| **Null-safety for optional fields** | Backend (DTOs, services), Frontend (components, stores, PDF generators) | Fields previously required (primaryClientId, occupantsCount, rentalPrice) become nullable. All existing code paths reading these must be audited and made null-safe. |
| **Differentiated validation by BookingType** | Backend (DTOs), Frontend (stores) | DIRECT bookings require full client+pricing data. EXTERNAL/PERSONAL require only dates+source. Validation logic must branch by type without duplication. |
| **Source-to-BookingType mapping** | Backend (service layer), Frontend (store) | Mapping enforced server-side (NFR9). Frontend auto-maps for UX convenience but server is authoritative. Must stay consistent. |
| **Conflict checking uniformity** | Backend (bookings service) | Same conflict logic for all BookingType values. Must be atomic to prevent race conditions (NFR7). |
| **Conditional action enablement** | Frontend (BookingDetailView) | Contract/invoice/email buttons enabled by data completeness checks. Logic must be centralized (shared function or computed) to avoid drift between components. |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Vue 3 SPA + NestJS API + PostgreSQL) — brownfield project.

### Starter Options Considered

**N/A — Brownfield project.** The application is already in production with an established technology stack. No starter template evaluation needed. All new code extends the existing codebase following established conventions.

### Existing Foundation (In Lieu of Starter)

**Rationale:** This is a feature extension of a running production application. The existing stack is stable, well-structured, and already handles the core domain (direct bookings, PDF generation, email sending). All architectural decisions below are inherited from the existing codebase.

**Language & Runtime:**
- TypeScript 5.5 (strict, no `any`)
- Node.js >= 18
- Vue 3.4 (Composition API, `<script setup>`)
- NestJS 10 (modules, guards, ValidationPipe)

**Styling Solution:**
- Tailwind CSS 3.3 with custom configuration (primary #FF385C, Circular font)
- PostCSS + Autoprefixer
- Scoped CSS for component-specific styles

**Build Tooling:**
- Vite 5.4 (frontend, alias `@` → `./src`)
- NestJS CLI (backend build)
- Docker multi-stage build for Railway deployment

**ORM & Database:**
- Prisma 5 (binaryTargets: native + debian-openssl-3.0.x)
- PostgreSQL 16 (Neon prod, Docker local)

**State Management:**
- Pinia 2.1 (existing `newBookingForm` store — untouched per NFR13)
- @vueuse/core 10.7

**Code Quality:**
- ESLint strict TypeScript + Vue
- Prettier (semi, single quotes, width 100)
- Husky + lint-staged (pre-commit)

**Development Experience:**
- `npm run dev:web` (Vite dev server, port 5173)
- `npm run dev:api` (NestJS watch mode, port 3000)
- `docker-compose up -d` (local PostgreSQL + pgAdmin)
- Prisma Studio for DB inspection

**Note:** No project initialization story needed. First implementation step is the Prisma schema migration (Layer 1 of PRD build order).

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D1 | BookingType storage | Prisma native enum | Type safety at DB level, stable set of 3 values, TS types auto-generated |
| D2 | BookingSource storage | Prisma native enum + `sourceCustomName` field | Type safety for known sources, `OTHER` + free text field for custom sources |
| D3 | Conflict checking atomicity | Prisma sequential transaction (check + create) | Sufficient for 2-user system, simple implementation, near-zero concurrent conflict probability |
| D4 | Endpoint strategy | Separate endpoints (`POST /bookings` unchanged, `POST /bookings/quick` new) | Zero regression risk on existing endpoint, clean separation of concerns |
| D5 | DTO strategy | Separate DTOs per type (`CreateQuickBookingDto`, `UpdateQuickBookingDto`) | Explicit validation per type, no conditional logic, each DTO is self-documenting |

**Important Decisions (Shape Architecture):**

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| D6 | Quick booking Pinia store | Separate minimal store (`quickBookingForm`), no shared composables with existing store | NFR13 compliance (existing store untouched), minimal duplication acceptable given small store size |
| D7 | Quick flow routing | Route-based steps (`/admin/nouveau/type`, `/admin/nouveau/rapide/1`, `/admin/nouveau/rapide/2`) | Browser back button support, UX spec alignment, natural navigation |
| D8 | Conditional action logic | Pure utility functions in `utils/bookingCapabilities.ts` | Testable, no framework coupling, reusable across components without composable overhead |

**Deferred Decisions (Post-MVP):**

| Decision | Rationale |
|----------|-----------|
| Source memorization (custom sources remembered) | Static curated enum sufficient for MVP, per PRD scope |
| Source as filter/analysis dimension | Requires accumulated season data |
| Calendar-based booking creation | Deferred to future calendar module |

### Data Architecture

**BookingType Enum (Prisma native):**
```prisma
enum BookingType {
  DIRECT
  EXTERNAL
  PERSONAL
}
```
- Immutable after creation (NFR8)
- Auto-determined from source selection (NFR9, server-enforced)
- Existing bookings default to `DIRECT` via migration

**BookingSource Enum (Prisma native + custom field):**
```prisma
enum BookingSource {
  ABRITEL
  AIRBNB
  BOOKING_COM
  PERSONNEL
  FAMILLE
  OTHER
}
```
- `source BookingSource?` on Booking model
- `sourceCustomName String?` for `OTHER` — stores free text entered by user
- Source-to-type mapping (server-side):

| Source | BookingType |
|--------|------------|
| ABRITEL, AIRBNB, BOOKING_COM | EXTERNAL |
| PERSONNEL, FAMILLE | PERSONAL |
| OTHER | Determined by user selection or default to EXTERNAL |

**PaymentStatus Enum (Prisma native):**
```prisma
enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  FREE
}
```
- `paymentStatus PaymentStatus?` — nullable, always optional on quick bookings

**Migration Strategy:**
- Additive-only (NFR5): new columns, new enums, no removals
- Fields made optional: `occupantsCount Int?`, `rentalPrice Decimal?`
- New fields: `bookingType`, `source`, `sourceCustomName`, `label`, `externalAmount`, `notes`, `paymentStatus`, `adultsCount`
- Existing booking auto-classified: `bookingType = DIRECT`, all new fields null

**Conflict Checking:**
- Prisma `$transaction()` with sequential operations: query overlapping bookings → if none, create
- Same logic for all BookingType values (FR11)
- Excludes CANCELLED bookings from conflict check

### Authentication & Security

**No new decisions.** All new endpoints follow existing patterns:
- `POST /bookings/quick` → `@UseGuards(JwtAuthGuard, AdminGuard)`
- `PATCH /bookings/:id` (enrichment) → existing guard chain
- DTOs use `class-validator` with `whitelist: true, forbidNonWhitelisted: true`
- `externalAmount` validated as `@IsDecimal()` or `@IsNumber({ maxDecimalPlaces: 2 })`

### API & Communication Patterns

**Endpoint Architecture:**

| Method | Route | Purpose | Auth | DTO |
|--------|-------|---------|------|-----|
| POST | `/bookings/quick` | Create quick booking | JWT+Admin | `CreateQuickBookingDto` |
| PATCH | `/bookings/:id/quick` | Edit quick booking fields | JWT+Admin | `UpdateQuickBookingDto` |
| PATCH | `/bookings/:id/enrich` | Progressive enrichment | JWT+Admin | `EnrichBookingDto` |

Existing endpoints unchanged:
- `POST /bookings` → direct booking creation (existing `CreateBookingDto`)
- `PATCH /bookings/:id` → direct booking edit (existing `UpdateBookingDto`)
- All GET endpoints return all booking types (unified list)

**DTO Structure:**

| DTO | Required Fields | Optional Fields |
|-----|----------------|-----------------|
| `CreateQuickBookingDto` | `startDate`, `endDate`, `source` | `label`, `sourceCustomName` (required if source=OTHER), `externalAmount`, `occupantsCount`, `adultsCount`, `notes` |
| `UpdateQuickBookingDto` | — | All quick fields editable: `startDate`, `endDate`, `source`, `sourceCustomName`, `label`, `externalAmount`, `occupantsCount`, `adultsCount`, `notes`, `paymentStatus` |
| `EnrichBookingDto` | — | Client fields (`primaryClientId`, `secondaryClientId`), pricing fields (`rentalPrice`, `cleaningIncluded`, `linenIncluded`, `touristTaxIncluded`), `occupantsCount`, `adultsCount` |

**Error Handling:**
- Conflict errors return `409 Conflict` with body: `{ message: "...", conflictingBooking: { id, source, label, startDate, endDate } }`
- Validation errors: standard NestJS 400 with field-level details
- Source/type mismatch: 400 with explicit message

### Frontend Architecture

**New Pinia Store: `quickBookingForm`**
- Location: `apps/web/src/stores/quickBookingForm.ts`
- State: `currentStep`, `bookingType`, `source`, `sourceCustomName`, `startDate`, `endDate`, `label`, `externalAmount`, `occupantsCount`, `adultsCount`, `notes`
- Getters: `nightsCount`, `isStep1Valid`, `isStep2Valid`, `sourceDisplayName`
- Actions: `reset()`, `setSource()`, `submit()`
- No imports from or shared code with `newBookingForm`

**Routing:**

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/nouveau` | `BookingTypeSelector.vue` | Type selection (step 0) |
| `/admin/nouveau/rapide/1` | `QuickBookingStep1.vue` | Dates + source |
| `/admin/nouveau/rapide/2` | `QuickBookingStep2.vue` | Optional fields + recap |
| `/admin/nouveau/rapide/succes` | `QuickBookingSuccess.vue` | Success screen |

Existing route `/admin/nouveau` redirects to type selector. Selecting "Directe" navigates to existing wizard flow (unchanged).

**Utility Functions: `utils/bookingCapabilities.ts`**
```typescript
canGenerateContract(booking): boolean
canGenerateInvoice(booking): boolean
canSendEmail(booking): boolean
getDisabledReason(booking, action): string | null
isQuickBooking(booking): boolean
getSourceDisplayName(booking): string
getSourceBadgeColor(booking): { bg: string, text: string }
```

**New Components Location:** All in `apps/web/src/components/admin/`

### Infrastructure & Deployment

**No new decisions.** Existing infrastructure handles the extension:
- Prisma migration auto-runs on Railway deploy (Dockerfile `npx prisma migrate deploy`)
- Frontend auto-deploys on Cloudflare Pages from `main`
- No new environment variables needed
- No new third-party services

### Decision Impact Analysis

**Implementation Sequence (aligned with PRD build order):**

1. **Layer 1 — Data Migration:** D1 (BookingType enum), D2 (BookingSource enum), PaymentStatus enum, schema changes, migration
2. **Layer 2 — Backend API:** D4 (new endpoints), D5 (new DTOs), D3 (conflict checking in transaction), source-to-type mapping
3. **Layer 3 — Quick Flow:** D6 (new Pinia store), D7 (route-based steps), type selector, R1/R2 components
4. **Layer 4 — Display:** BookingCard modification, SourceBadge, badges in list
5. **Layer 5 — Edit & Enrichment:** QuickBookingEditModal, enrichment wizard, D8 (conditional action functions)

**Cross-Component Dependencies:**

| Decision | Depends On | Blocks |
|----------|-----------|--------|
| D1 (BookingType enum) | — | D4, D5, D6 (all need the type) |
| D2 (BookingSource enum) | — | D4, D5, D6 (source mapping) |
| D3 (Conflict transaction) | D1 | D4 (endpoint uses it) |
| D4 (Separate endpoints) | D1, D2, D3, D5 | D6 (store calls endpoints) |
| D5 (Separate DTOs) | D1, D2 | D4 (endpoints use DTOs) |
| D6 (Separate store) | D4 | D7 (routes use store) |
| D7 (Route-based steps) | D6 | — |
| D8 (Utility functions) | D1 | — (can be built independently) |

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices without explicit guidance.

### Naming Patterns

**Database Naming (Prisma):**
- Models: PascalCase singular (`Booking`, `DatePeriod`) — new models follow same pattern
- Fields: camelCase in Prisma (`bookingType`, `sourceCustomName`)
- SQL tables: snake_case plural via `@@map("bookings")` — **all new models must have `@@map()`**
- SQL columns: snake_case via `@map("booking_type")` — **all new fields must have `@map()`**
- Enums: PascalCase name, SCREAMING_SNAKE_CASE values (`enum BookingType { DIRECT EXTERNAL PERSONAL }`)

**API Naming:**
- Endpoints: kebab-case plural (`/bookings`, `/bookings/quick`, `/date-periods`)
- Sub-actions as path segments: `/bookings/:id/confirm`, `/bookings/:id/quick`, `/bookings/:id/enrich`
- Query parameters: camelCase (`?year=2026`)
- JSON response fields: camelCase (Prisma generates camelCase, passed through directly)

**Code Naming:**
- Vue components: PascalCase files and tags (`BookingCard.vue`, `<BookingCard />`)
- TypeScript files: camelCase (`bookingCapabilities.ts`, `quickBookingForm.ts`)
- DTOs: kebab-case files (`create-quick-booking.dto.ts`), PascalCase classes (`CreateQuickBookingDto`)
- Pinia stores: `useXxxStore` pattern (`useQuickBookingFormStore`), store id camelCase (`'quickBookingForm'`)
- Interfaces: PascalCase, no `I` prefix (`BookingWithRelations`, not `IBookingWithRelations`)
- API group objects: camelCase suffixed with `Api` (`bookingsApi`, `pricingApi`)

### Structure Patterns

**Backend File Organization:**
```
apps/api/src/bookings/
├── bookings.controller.ts    # Routes + guards, delegates to service
├── bookings.module.ts        # NestJS module declaration
├── bookings.service.ts       # All business logic
└── dto/
    ├── create-booking.dto.ts
    ├── update-booking.dto.ts
    ├── create-quick-booking.dto.ts   # NEW
    ├── update-quick-booking.dto.ts   # NEW
    └── enrich-booking.dto.ts         # NEW
```
- New DTOs go in the existing `dto/` folder within the `bookings` module
- No new NestJS module needed — extend existing `BookingsModule`
- No separate service file — extend existing `BookingsService` with new methods

**Frontend File Organization:**
```
apps/web/src/
├── components/admin/
│   ├── BookingCard.vue           # MODIFIED (add source badge)
│   ├── SourceBadge.vue           # NEW
│   ├── PaymentStatusBadge.vue    # NEW
│   ├── TypeSelectorRow.vue       # NEW
│   ├── StepIndicator.vue         # NEW
│   ├── RecapBanner.vue           # NEW
│   ├── QuickBookingEditModal.vue # NEW
│   ├── ActionCard.vue            # NEW
│   ├── DisabledActionRow.vue     # NEW
│   ├── SuccessScreen.vue         # NEW
│   └── InfoBubble.vue            # NEW
├── stores/
│   ├── newBookingForm.ts         # UNTOUCHED
│   └── quickBookingForm.ts       # NEW
├── utils/
│   ├── formatting.ts             # EXISTING
│   └── bookingCapabilities.ts    # NEW
└── views/admin/
    ├── BookingTypeSelector.vue   # NEW (route: /admin/nouveau)
    ├── QuickBookingStep1.vue     # NEW (route: /admin/nouveau/rapide/1)
    ├── QuickBookingStep2.vue     # NEW (route: /admin/nouveau/rapide/2)
    └── QuickBookingSuccess.vue   # NEW (route: /admin/nouveau/rapide/succes)
```
- All new components in `components/admin/` (not nested subdirectories)
- All new views in `views/admin/` (flat structure, matching existing pattern)
- Quick booking views prefixed `QuickBooking` for grouping

### Format Patterns

**API Response Formats:**
- Direct response body (no wrapper): `POST /bookings/quick` returns the `Booking` object directly
- Error responses use NestJS standard format: `{ statusCode: 409, message: "...", error: "Conflict" }`
- Conflict error enriched with: `{ message: "...", conflictingBooking: { id, source, label, startDate, endDate } }`
- Dates in JSON: ISO 8601 strings (`"2026-07-12T00:00:00.000Z"`) — Prisma default, no transformation

**DTO Decorator Order (critical for consistency):**
```typescript
// 1. @IsOptional() ALWAYS FIRST on optional fields
// 2. Type decorator (@IsString, @IsNumber, @IsEnum, @IsDateString)
// 3. Constraint decorators (@Min, @Max, @MinLength)
// 4. @Type() for nested objects

@IsOptional()
@IsEnum(BookingSource)
source?: BookingSource;

@IsOptional()
@IsString()
@MinLength(1)
sourceCustomName?: string;

@IsOptional()
@IsNumber({ maxDecimalPlaces: 2 })
@Min(0)
externalAmount?: number;
```

**Frontend Type Definitions (in `api.ts`):**
- New types added to `apps/web/src/lib/api.ts` alongside existing types
- Follow existing pattern: interfaces for responses, type aliases for enums
```typescript
// Enum types as string unions (matching Prisma enums)
type BookingType = 'DIRECT' | 'EXTERNAL' | 'PERSONAL';
type BookingSource = 'ABRITEL' | 'AIRBNB' | 'BOOKING_COM' | 'PERSONNEL' | 'FAMILLE' | 'OTHER';
type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'FREE';

// Booking interface extended with new nullable fields
interface Booking {
  // ... existing fields ...
  bookingType: BookingType;
  source: BookingSource | null;
  sourceCustomName: string | null;
  // ...
}
```

### Communication Patterns

**State Management (Pinia):**
- Initial state via factory function: `const getInitialState = (): QuickBookingFormState => ({ ... })`
- Reset by property reassignment (not `Object.assign`) for Vue reactivity
- Async actions follow pattern: set loading flag → reset error → try/catch/finally
- Getters access state via `this` (options API syntax within `defineStore`)
- Loading flags: `isSubmitting`, `isCheckingConflicts` (camelCase, `is` prefix for booleans)

**API Client Methods (in `api.ts`):**
```typescript
// Follow existing pattern — all methods in api group objects
const bookingsApi = {
  // ... existing methods ...
  createQuick(data: CreateQuickBookingData): Promise<Booking> {
    const { data: result } = await api.post<Booking>('/bookings/quick', data);
    return result;
  },
  updateQuick(id: string, data: UpdateQuickBookingData): Promise<Booking> {
    const { data: result } = await api.patch<Booking>(`/bookings/${id}/quick`, data);
    return result;
  },
  enrich(id: string, data: EnrichBookingData): Promise<Booking> {
    const { data: result } = await api.patch<Booking>(`/bookings/${id}/enrich`, data);
    return result;
  },
};
```

### Process Patterns

**Error Handling:**

| Layer | Pattern | Example |
|-------|---------|---------|
| Backend service | Throw NestJS exceptions with French messages | `throw new ConflictException('Ces dates chevauchent une réservation existante')` |
| Backend controller | No try/catch — NestJS global exception filter handles | Controller delegates directly to service |
| Frontend API client | Errors propagate (no catch in API methods) | `return api.post(...)` without try/catch |
| Frontend views/stores | try/catch at call site, set error ref/state | `catch { error.value = 'Message en français' }` |
| Frontend catch | `catch { }` or `catch (err: unknown)` — never `catch (err)` without type | Match existing pattern |

**Loading State Pattern:**
```typescript
// Store pattern (Pinia)
this.isSubmitting = true;
this.submitError = null;
try {
  await bookingsApi.createQuick(data);
} catch {
  this.submitError = 'Erreur lors de la création';
} finally {
  this.isSubmitting = false;
}

// View pattern (ref-based)
const loading = ref(false);
const error = ref<string | null>(null);
```

**Null-Safety for Newly Optional Fields:**

| Field | Previously | Now | Null-safe pattern |
|-------|-----------|-----|-------------------|
| `occupantsCount` | `Int @default(1)` | `Int?` | `booking.occupantsCount ?? '-'` in display, `booking.occupantsCount ?? 1` in calculations |
| `rentalPrice` | `Decimal` | `Decimal?` | `booking.rentalPrice ? formatPrice(booking.rentalPrice) : '-'` in display |
| `primaryClientId` | `String?` (already nullable) | No change | Already handled |

- **Rule**: Display nullable fields with `?? '-'` or conditional rendering (`v-if`)
- **Rule**: Never pass nullable fields to PDF generators without null check — PDF functions receive only validated non-null data
- **Rule**: Existing code paths that assume non-null must be audited and updated before the feature is deployed

**Source-to-Type Mapping (Server-Side Enforcement):**
```typescript
// In BookingsService — single source of truth
private mapSourceToType(source: BookingSource): BookingType {
  switch (source) {
    case BookingSource.ABRITEL:
    case BookingSource.AIRBNB:
    case BookingSource.BOOKING_COM:
      return BookingType.EXTERNAL;
    case BookingSource.PERSONNEL:
    case BookingSource.FAMILLE:
      return BookingType.PERSONAL;
    case BookingSource.OTHER:
      return BookingType.EXTERNAL; // Default for unknown sources
  }
}
```
- Frontend replicates this mapping for instant UI feedback but server is authoritative
- Frontend mapping lives in `quickBookingForm` store `setSource()` action
- If mappings diverge, server wins (DTO validation rejects mismatches)

### Enforcement Guidelines

**All AI Agents MUST:**
1. Run `npm run lint:fix && npm run format` on all new/modified files before committing
2. Add `@map()` to every new Prisma field and `@@map()` to every new model
3. Use `@IsOptional()` as FIRST decorator on optional DTO fields
4. Never import from or modify `newBookingForm.ts`
5. Add explicit return types to all new functions and methods
6. Write error messages in French
7. Use `catch { }` (no variable) or `catch (err: unknown)` — never untyped `catch (err)`
8. Follow existing component structure: `<script setup lang="ts">` → `<template>` → `<style scoped>`

**Pattern Verification:**
- Pre-commit hooks (`npm run lint:fix` + `npm run format`) enforce code style automatically
- `npm run typecheck` verifies type safety — must pass before merge
- Manual review: verify `@map()` on new Prisma fields, French error messages, no `any` types

## Project Structure & Boundaries

### Complete Project Directory Structure

Files marked `# NEW` are created by the multi-source extension. Files marked `# MODIFIED` are extended.

```
maison-dalhias/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── schema.prisma                          # MODIFIED (enums + fields)
│   │   │   ├── migrations/
│   │   │   │   └── YYYYMMDD_add_multi_source_booking/  # NEW (single migration)
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── prisma/
│   │       │   └── prisma.service.ts
│   │       ├── auth/
│   │       │   └── guards/
│   │       │       ├── jwt-auth.guard.ts
│   │       │       └── admin.guard.ts
│   │       ├── bookings/
│   │       │   ├── bookings.module.ts
│   │       │   ├── bookings.controller.ts              # MODIFIED (3 new routes)
│   │       │   ├── bookings.service.ts                 # MODIFIED (new methods)
│   │       │   └── dto/
│   │       │       ├── create-booking.dto.ts
│   │       │       ├── update-booking.dto.ts
│   │       │       ├── client.dto.ts
│   │       │       ├── create-quick-booking.dto.ts     # NEW
│   │       │       ├── update-quick-booking.dto.ts     # NEW
│   │       │       └── enrich-booking.dto.ts           # NEW
│   │       ├── contacts/
│   │       ├── email/
│   │       ├── seasons/
│   │       ├── date-periods/
│   │       ├── pricing/
│   │       ├── settings/
│   │       └── users/
│   │
│   └── web/
│       └── src/
│           ├── lib/
│           │   └── api.ts                              # MODIFIED (new types + methods)
│           ├── router/
│           │   └── index.ts                            # MODIFIED (new routes)
│           ├── stores/
│           │   ├── newBookingForm.ts                    # UNTOUCHED
│           │   └── quickBookingForm.ts                  # NEW
│           ├── utils/
│           │   ├── formatting.ts
│           │   └── bookingCapabilities.ts               # NEW
│           ├── constants/
│           │   ├── property.ts
│           │   └── pricing.ts
│           ├── services/pdf/
│           │   ├── contractGenerator.ts                 # MODIFIED (null-safe)
│           │   ├── invoiceGenerator.ts                  # MODIFIED (null-safe)
│           │   ├── posterGenerator.ts
│           │   └── pricingGridGenerator.ts
│           ├── components/
│           │   └── admin/
│           │       ├── BookingCard.vue                  # MODIFIED (source badge)
│           │       ├── BookingEditModal.vue
│           │       ├── BaseModal.vue
│           │       ├── EmailSendModal.vue
│           │       ├── EmailHistoryCard.vue
│           │       ├── SourceBadge.vue                  # NEW
│           │       ├── PaymentStatusBadge.vue            # NEW
│           │       ├── TypeSelectorRow.vue               # NEW
│           │       ├── StepIndicator.vue                 # NEW
│           │       ├── RecapBanner.vue                   # NEW
│           │       ├── QuickBookingEditModal.vue         # NEW
│           │       ├── ActionCard.vue                    # NEW
│           │       ├── DisabledActionRow.vue             # NEW
│           │       ├── SuccessScreen.vue                 # NEW
│           │       └── InfoBubble.vue                    # NEW
│           └── views/
│               ├── HomeView.vue
│               ├── LoginView.vue
│               └── admin/
│                   ├── AdminLayout.vue
│                   ├── BookingsView.vue                 # MODIFIED (badge display)
│                   ├── BookingDetailView.vue             # MODIFIED (conditional actions, action cards)
│                   ├── MessagesView.vue
│                   ├── NewBookingView.vue                # MODIFIED (redirect to type selector)
│                   ├── PricingView.vue
│                   ├── BookingTypeSelector.vue           # NEW
│                   ├── QuickBookingStep1.vue             # NEW
│                   ├── QuickBookingStep2.vue             # NEW
│                   └── QuickBookingSuccess.vue           # NEW
├── docker-compose.yml
├── Dockerfile
├── package.json
├── eslint.config.mjs
├── .prettierrc
└── .husky/
    └── pre-commit
```

**File count summary:** 15 new files, 9 modified files, 0 deleted files.

### Architectural Boundaries

**API Boundaries:**

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vue 3 SPA)                   │
│                                                           │
│  quickBookingForm ──→ bookingsApi ──→ HTTP requests       │
│  newBookingForm ──→ bookingsApi ──→ HTTP requests         │
│  bookingCapabilities.ts (pure functions, no API calls)    │
└──────────────────────────┬────────────────────────────────┘
                           │ Axios (Bearer JWT)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (NestJS API)                     │
│                                                           │
│  ┌─── BookingsController ───────────────────────────┐    │
│  │  POST /bookings          (existing, DIRECT only)  │    │
│  │  POST /bookings/quick    (NEW, EXTERNAL/PERSONAL) │    │
│  │  PATCH /bookings/:id/quick  (NEW, quick edit)     │    │
│  │  PATCH /bookings/:id/enrich (NEW, enrichment)     │    │
│  │  GET /bookings           (existing, ALL types)    │    │
│  │  GET /bookings/dates     (existing, ALL types)    │    │
│  └───────────────┬──────────────────────────────────┘    │
│                  │                                        │
│  ┌─── BookingsService ──────────────────────────────┐    │
│  │  create()         → existing, unchanged            │    │
│  │  createQuick()    → NEW, source→type mapping       │    │
│  │  updateQuick()    → NEW, quick fields only         │    │
│  │  enrich()         → NEW, progressive enrichment    │    │
│  │  checkConflicts() → existing, ALL types            │    │
│  │  mapSourceToType()→ NEW, private helper            │    │
│  └───────────────┬──────────────────────────────────┘    │
│                  │                                        │
│  ┌─── Prisma ORM ──────────────────────────────────────┐ │
│  │  Booking model (extended with new fields)            │ │
│  │  BookingType enum | BookingSource enum | PaymentStatus│ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────┬────────────────────────────────┘
                           │
                           ▼
              ┌─── PostgreSQL (Neon) ───┐
              │  bookings table          │
              │  (extended, additive)    │
              └─────────────────────────┘
```

**Component Boundaries (Frontend):**

| Boundary | Rule |
|----------|------|
| `quickBookingForm` store ↔ `newBookingForm` store | Zero coupling. No shared imports, no shared state, no shared composables. |
| `bookingCapabilities.ts` ↔ API | Pure functions only. No API calls. Receives `Booking` object, returns booleans/strings. |
| `SourceBadge` / `PaymentStatusBadge` | Presentational only. Receive props, render badge. No business logic. |
| `QuickBookingEditModal` ↔ `BookingEditModal` | Separate components. No shared code. QuickBookingEditModal uses BaseModal. |
| Views ↔ Store | Views call store actions and read store getters. Views never call API directly for quick booking operations. |
| `BookingDetailView` | Adapts display based on `booking.bookingType`. Uses `bookingCapabilities.ts` for action enablement. Renders ActionCard pair for quick bookings, existing buttons for direct. |

**Data Boundaries:**

| Boundary | Constraint |
|----------|-----------|
| Migration | Additive-only. Single migration file. No column drops, no type changes. |
| BookingType | Set once at creation via `mapSourceToType()`. No endpoint or DTO allows modification. |
| Conflict checking | Operates inside `$transaction()`. Queries all non-CANCELLED bookings regardless of type. |
| PDF generation | Only receives validated non-null data. Never called with a booking that has null required fields. Guard check in `bookingCapabilities.ts`. |

### Requirements to Structure Mapping

| FR Group | Backend Files | Frontend Files |
|----------|--------------|----------------|
| **FR1-FR10** (Booking Creation) | `schema.prisma`, `create-quick-booking.dto.ts`, `bookings.service.ts` (createQuick, mapSourceToType) | `quickBookingForm.ts`, `BookingTypeSelector.vue`, `QuickBookingStep1.vue`, `QuickBookingStep2.vue`, `TypeSelectorRow.vue`, `StepIndicator.vue`, `RecapBanner.vue` |
| **FR11-FR13** (Conflict Management) | `bookings.service.ts` (checkConflicts — existing, extended) | `QuickBookingStep1.vue` (inline error display), `quickBookingForm.ts` (conflict check action) |
| **FR14-FR17** (Display & Navigation) | — (GET endpoints unchanged) | `BookingCard.vue` (modified), `SourceBadge.vue`, `PaymentStatusBadge.vue`, `BookingsView.vue` (modified), `BookingDetailView.vue` (modified) |
| **FR18-FR23** (Modification) | `update-quick-booking.dto.ts`, `enrich-booking.dto.ts`, `bookings.service.ts` (updateQuick, enrich) | `QuickBookingEditModal.vue`, `ActionCard.vue`, `BookingDetailView.vue` (modified) |
| **FR24-FR28** (Document Generation) | — (existing PDF/email endpoints unchanged) | `bookingCapabilities.ts`, `DisabledActionRow.vue`, `BookingDetailView.vue` (modified) |
| **FR29-FR32** (Compatibility) | Migration defaults existing data to DIRECT | `NewBookingView.vue` (redirect to type selector), PDF generators (null-safe modifications) |

**Cross-Cutting Concerns Mapping:**

| Concern | Files Affected |
|---------|---------------|
| Null-safety | `BookingCard.vue`, `BookingDetailView.vue`, `contractGenerator.ts`, `invoiceGenerator.ts`, `api.ts` (type updates) |
| Source-to-type mapping | `bookings.service.ts` (server, authoritative), `quickBookingForm.ts` (client, UX convenience) |
| Conditional actions | `bookingCapabilities.ts` (logic), `DisabledActionRow.vue` (display), `BookingDetailView.vue` (orchestration) |
| French labels | `SourceBadge.vue`, `PaymentStatusBadge.vue`, `QuickBookingStep1.vue`, `QuickBookingStep2.vue`, `bookingCapabilities.ts` |

### Integration Points

**Internal Communication:**

| From | To | Method | Data |
|------|----|--------|------|
| `QuickBookingStep1.vue` | `quickBookingForm` store | Pinia action | Dates, source selection |
| `quickBookingForm` store | `bookingsApi.createQuick()` | HTTP POST | `CreateQuickBookingData` |
| `bookingsApi` | Backend `/bookings/quick` | Axios + JWT | JSON body |
| `BookingsController` | `BookingsService.createQuick()` | Method call | Validated DTO + userId |
| `BookingsService` | Prisma `$transaction` | ORM | Conflict check + create |
| `BookingDetailView` | `bookingCapabilities.ts` | Function call | `Booking` object → booleans |

**External Integrations:**

| Service | Purpose | Integration Point |
|---------|---------|-------------------|
| Neon (PostgreSQL) | Data persistence | Prisma ORM via `DATABASE_URL` |
| Resend | Email sending | Existing `EmailService` — unchanged |
| Railway | Backend hosting | Dockerfile, auto-deploy on `main` |
| Cloudflare Pages | Frontend hosting | Vite build, auto-deploy on `main` |

**Data Flow — Quick Booking Creation:**

```
User input (dates + source)
    → QuickBookingStep1.vue (validation)
    → quickBookingForm store (state + conflict check)
    → bookingsApi.createQuick() (HTTP POST)
    → BookingsController (guards + DTO validation)
    → BookingsService.createQuick() (source→type mapping)
    → Prisma $transaction (conflict check + insert)
    → PostgreSQL (new row in bookings table)
    → Response: Booking object
    → quickBookingForm store (success state)
    → QuickBookingSuccess.vue (display)
```

## Architecture Validation

### Coherence Check

| Dimension | Status | Notes |
|-----------|--------|-------|
| Decisions ↔ Requirements | ✅ Pass | All 8 decisions trace to specific FRs/NFRs |
| Decisions ↔ Structure | ✅ Pass | Every decision maps to concrete files in the project structure |
| Patterns ↔ Existing Codebase | ✅ Pass | All patterns extracted from actual codebase analysis |
| Structure ↔ Requirements | ✅ Pass | All 39 FRs mapped to specific files (see Requirements to Structure Mapping) |
| Cross-cutting concerns ↔ Patterns | ✅ Pass | Null-safety, source mapping, conditional actions all have explicit pattern rules |

### Requirements Coverage

| FR Group | Coverage | Gaps |
|----------|----------|------|
| FR1-FR10 (Creation) | 100% | None |
| FR11-FR13 (Conflicts) | 100% | None |
| FR14-FR17 (Display) | 100% | None |
| FR18-FR23 (Modification) | 100% | None |
| FR24-FR28 (Documents) | 100% | None |
| FR29-FR32 (Compatibility) | 100% | None |

| NFR Group | Coverage | Gaps |
|-----------|----------|------|
| NFR1-4 (Security) | 100% | None |
| NFR5-10 (Data Integrity) | 100% | None |
| NFR11-15 (Maintainability) | 100% | None |

### Implementation Readiness Assessment

**Critical Gaps: 0**

**Important Gaps: 2**

| # | Gap | Impact | Proposed Resolution |
|---|-----|--------|---------------------|
| 1 | `BookingSource.OTHER` → `BookingType` mapping ambiguity | When source is OTHER, type defaults to EXTERNAL but user might intend PERSONAL use | Add secondary type selector in UI when OTHER is selected; server mapping remains EXTERNAL as default, frontend overrides with user choice |
| 2 | Enrichment wizard step structure not fully specified | Steps and field grouping for the enrichment flow are not detailed in architecture | Reuse existing 6-step wizard components in modal/embedded context; exact step composition deferred to story-level specification |

**Confidence Level: HIGH**

**Verdict: READY FOR IMPLEMENTATION**

The architecture document provides comprehensive guidance for AI agent implementation. All critical decisions are documented with rationale, all patterns are extracted from actual codebase analysis, and the project structure maps every requirement to specific files. The 2 important gaps are non-blocking and can be resolved at the story/implementation level without architectural changes.
