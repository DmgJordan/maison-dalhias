---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# maison-dalhias - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for maison-dalhias, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1: Admin can choose between "Réservation directe" and "Réservation rapide" at the first step of the booking wizard
- FR2: Admin can create a quick booking by providing only dates and a source
- FR3: Admin can optionally provide a client name or label, amount received from the platform (externalAmount), number of occupants, adults count (for tourist tax calculation), and free-text notes when creating a quick booking
- FR4: Admin can create a quick booking in 2 steps (required fields, then optional fields with recap)
- FR5: Admin can select a source from a curated list (Abritel, Airbnb, Booking.com, Personnel, Famille) or enter a custom source via "Autre" — the selected source is stored on the booking as its origin identifier
- FR6: System auto-determines BookingType (EXTERNAL or PERSONAL) based on the selected source
- FR7: Admin can create a direct booking through the existing 6-step wizard with no changes to the current flow
- FR8: Quick bookings have no minimum nights constraint (only validation: end date > start date)
- FR9: Each booking has a type (DIRECT, EXTERNAL, or PERSONAL) permanently set at creation — never changes
- FR10: Existing fields (primaryClient, secondaryClient, occupantsCount, rentalPrice) are optional for quick bookings but required for direct bookings — differentiated validation by booking type
- FR11: System checks for date conflicts across all booking types using the same logic
- FR12: System displays conflict errors in plain French, explicitly naming the conflicting booking (source + client/label + dates)
- FR13: When a conflict is detected, entered data is preserved so admin can correct dates without re-entering other fields
- FR14: Admin can view all bookings (direct, external, personal) in a single chronological list
- FR15: Each booking displays a colored badge indicating source category (platforms: blue, personal/family: purple, direct: existing style)
- FR16: Badges display the source name for instant visual identification
- FR17: Admin can view a booking detail page that adapts content based on populated data fields
- FR18: Admin can edit quick booking fields (dates, source, label/name, amount, occupants, notes) through a modal containing only these editable fields
- FR19: Admin can progressively enrich a quick booking with full client details and pricing through a partial pre-filled wizard ("Compléter les informations")
- FR20: When enriching, all previously entered data is pre-filled — never requires re-entry
- FR21: Enrichment is unidirectional — quick bookings can be enriched but never downgraded
- FR22: Admin can set and update payment status (PENDING, PARTIAL, PAID, FREE) on any booking type — always optional on quick bookings
- FR23: Admin can add and edit free-text notes on any booking type (quick or direct)
- FR24: Contract generation enabled only when sufficient data present (complete client info, dates, rental price), regardless of booking type
- FR25: Invoice generation enabled only when sufficient data present (complete client info, dates, rental price, and options selection), regardless of booking type
- FR26: Email sending enabled only when client email address present, regardless of booking type
- FR27: Insufficient data: action button displayed in disabled state with explicit message indicating missing data
- FR28: Action buttons hidden entirely on cancelled bookings
- FR29: Existing 6-step direct booking wizard remains fully functional with no behavioral changes
- FR30: Existing production bookings automatically classified as DIRECT and continue to function correctly
- FR31: Public availability calendar reflects all booking types to show accurate availability
- FR32: Existing contract and invoice PDF generation continues to work with direct bookings

### NonFunctional Requirements

- NFR1: All new endpoints require JWT authentication and admin authorization, consistent with existing security
- NFR2: Client personal data accessible only to authenticated admin users — no public endpoint exposes client information
- NFR3: Strict input validation on all new DTOs — unauthorized fields rejected, expected types enforced — to prevent injection and ensure data integrity
- NFR4: externalAmount uses Decimal type with strict validation to prevent financial data corruption
- NFR5: Database migration is additive-only — no column removal, no type changes, no data loss on existing records
- NFR6: Existing production booking remains valid after migration, auto-classified as BookingType.DIRECT
- NFR7: Conflict checking is atomic — no race condition can allow overlapping bookings (10 simultaneous requests for same dates = exactly 1 accepted)
- NFR8: BookingType is immutable after creation — no endpoint or UI action can modify it
- NFR9: Source-to-BookingType mapping enforced server-side — frontend cannot send inconsistent combinations
- NFR10: All nullable fields introduced by migration handled safely in existing code paths — no null reference errors
- NFR11: New code follows existing conventions: ESLint strict TypeScript, Prettier (semi, single quotes, width 100), Vue 3 Composition API, NestJS modules
- NFR12: No `any` type — all new code uses strong, explicit TypeScript typing
- NFR13: New Pinia store for quick bookings separate from existing `newBookingForm` — no modification of existing store
- NFR14: New backend DTOs use validation decorators consistent with existing DTO patterns
- NFR15: Pre-commit hooks (Husky + lint-staged) pass on all new and modified files

### Additional Requirements

**From Architecture:**

- Brownfield project — no starter template needed. First implementation step is Prisma schema migration.
- Prisma native enums: BookingType (DIRECT, EXTERNAL, PERSONAL), BookingSource (ABRITEL, AIRBNB, BOOKING_COM, PERSONNEL, FAMILLE, OTHER), PaymentStatus (PENDING, PARTIAL, PAID, FREE)
- BookingSource.OTHER uses a companion `sourceCustomName String?` field for free-text custom source
- Separate endpoints: `POST /bookings/quick` (create), `PATCH /bookings/:id/quick` (edit), `PATCH /bookings/:id/enrich` (enrichment) — existing endpoints unchanged
- Separate DTOs per type: CreateQuickBookingDto, UpdateQuickBookingDto, EnrichBookingDto
- Conflict checking via Prisma `$transaction()` with sequential operations (check + create)
- New Pinia store `quickBookingForm` — zero coupling with existing `newBookingForm`
- Route-based steps: `/admin/nouveau` (type selector), `/admin/nouveau/rapide/1`, `/admin/nouveau/rapide/2`, `/admin/nouveau/rapide/succes`
- Pure utility functions in `utils/bookingCapabilities.ts` for conditional action logic (canGenerateContract, canGenerateInvoice, canSendEmail, getDisabledReason, etc.)
- Source-to-BookingType mapping: server-side authoritative via `mapSourceToType()`, frontend replicates for UX convenience
- All new Prisma fields must have `@map()` and new models must have `@@map()`
- DTO decorator order: `@IsOptional()` first, then type decorator, then constraint decorators
- Error handling: NestJS exceptions with French messages; frontend try/catch at call site
- Null-safe patterns: `booking.occupantsCount ?? '-'` for display, null check before PDF generation
- Conflict error returns 409 with `{ message, conflictingBooking: { id, source, label, startDate, endDate } }`
- BookingSource.OTHER defaults to BookingType.EXTERNAL (Important Gap #1 — may add secondary type selector in UI)
- Enrichment wizard step structure deferred to story-level specification (Important Gap #2)
- 15 new files, 9 modified files, 0 deleted files

**From UX Design:**

- Design Direction B (Compact & Efficient): stacked type selector rows, inline recap banner, unified list container, compact success screen
- Adopted from Direction C: dismissible info bubble on R2 ("Ces informations sont facultatives...") and side-by-side action cards for Modifier/Compléter on detail page
- 10 new components: SourceBadge, PaymentStatusBadge, TypeSelectorRow, StepIndicator, RecapBanner, QuickBookingEditModal, ActionCard, DisabledActionRow, SuccessScreen, InfoBubble
- 1 modified component: BookingCard (extended with source badge, nullable field handling)
- Senior-first accessibility: 48px min click targets, 16px min body text, WCAG AA contrast, no icon-only buttons, explicit French labels
- Desktop-first (Chrome latest), existing responsive patterns maintained
- Button hierarchy: one primary per screen, primary on the right, full-width on mobile
- Feedback tiers: Success Screen (persistent, critical actions), Toast (auto-dismiss, secondary), Inline error (validation), Error toast (API failures)
- Maximum one modal deep — quick booking creation is page flow, not modal
- Form validation: real-time on blur + server-side conflict check (debounced 300ms)
- Inline recap banner pattern between steps (R1 data shown as banner on R2 with "Modifier" link)
- Conflict check at R1 before user invests time in R2 optional fields
- State preservation on error — form data never lost
- Empty states informative with suggested next action
- Destructive actions require confirmation modal; non-destructive get toast feedback
- Component build order: P1 (core flow) → P2 (display) → P3 (edit & enrich)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Choix entre directe et rapide |
| FR2 | Epic 1 | Création rapide : dates + source |
| FR3 | Epic 1 | Champs optionnels quick booking |
| FR4 | Epic 1 | Flux 2 étapes |
| FR5 | Epic 1 | Liste de sources curée + "Autre" |
| FR6 | Epic 1 | Auto-détermination BookingType |
| FR7 | Epic 1 | Wizard direct inchangé |
| FR8 | Epic 1 | Pas de minimum nuits pour quick |
| FR9 | Epic 1 | Type immuable à la création |
| FR10 | Epic 1 | Validation différenciée par type |
| FR11 | Epic 1 | Conflits inter-types unifiés |
| FR12 | Epic 1 | Erreurs conflits en français |
| FR13 | Epic 1 | Préservation données sur conflit |
| FR14 | Epic 2 | Liste chronologique unifiée |
| FR15 | Epic 2 | Badges colorés par source |
| FR16 | Epic 2 | Nom source dans le badge |
| FR17 | Epic 2 | Page détail adaptative |
| FR18 | Epic 3 | Modal d'édition légère |
| FR19 | Epic 4 | Enrichissement progressif |
| FR20 | Epic 4 | Pré-remplissage enrichissement |
| FR21 | Epic 4 | Enrichissement unidirectionnel |
| FR22 | Epic 3 | Statut de paiement |
| FR23 | Epic 3 | Notes libres cross-type |
| FR24 | Epic 4 | Contrat conditionnel aux données |
| FR25 | Epic 4 | Facture conditionnelle aux données |
| FR26 | Epic 4 | Email conditionnel à l'adresse |
| FR27 | Epic 4 | Bouton désactivé + message explicite |
| FR28 | Epic 4 | Actions masquées si annulé |
| FR29 | Epic 1 | Wizard 6 étapes inchangé |
| FR30 | Epic 1 | Existants auto-classés DIRECT |
| FR31 | Epic 2 | Calendrier public tous types |
| FR32 | Epic 2 | PDFs existants fonctionnels |

## Epic List

### Epic 1: Quick Booking Creation
Admin can create quick bookings from any source (Abritel, Airbnb, Personnel, Famille...) in under 60 seconds via a 2-step flow, with full date conflict protection, while preserving the existing direct booking flow.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR29, FR30

### Epic 2: Unified Booking View & Source Badges
Admin can view all bookings (direct, external, personal) in a single chronological list with colored source badges for instant visual identification, and see adapted detail pages that handle both complete and partial booking data.
**FRs covered:** FR14, FR15, FR16, FR17, FR31, FR32

### Epic 3: Quick Booking Management
Admin can edit quick booking fields through a lightweight modal, manage payment status, and add notes on any booking type.
**FRs covered:** FR18, FR22, FR23

### Epic 4: Progressive Enrichment & Conditional Document Actions
Admin can progressively enrich quick bookings with full client details and pricing to unlock contract generation, invoice generation, and email sending — with clear visual feedback on what's available and what's missing.
**FRs covered:** FR19, FR20, FR21, FR24, FR25, FR26, FR27, FR28

---

## Epic 1: Quick Booking Creation

Admin can create quick bookings from any source (Abritel, Airbnb, Personnel, Famille...) in under 60 seconds via a 2-step flow, with full date conflict protection, while preserving the existing direct booking flow.

### Story 1.1: Extend Data Model for Multi-Source Bookings

As an admin,
I want the database schema extended with booking type, source, and payment tracking fields so that existing bookings are preserved as DIRECT and the system can support multi-source reservations.

**Acceptance Criteria:**

**Given** the existing Prisma schema with the Booking model
**When** the migration is applied
**Then** three new enums exist: BookingType (DIRECT, EXTERNAL, PERSONAL), BookingSource (ABRITEL, AIRBNB, BOOKING_COM, PERSONNEL, FAMILLE, OTHER), PaymentStatus (PENDING, PARTIAL, PAID, FREE)
**And** the Booking model has new fields: `bookingType` (default DIRECT), `source`, `sourceCustomName`, `label`, `externalAmount`, `notes`, `paymentStatus`, `adultsCount`
**And** `occupantsCount` is now nullable (`Int?`), `rentalPrice` is now nullable (`Decimal?`)
**And** all new fields have `@map()` decorators for snake_case SQL column names
**And** the migration is additive-only — no column removal, no type changes (NFR5)
**And** the existing production booking is auto-classified as `BookingType.DIRECT` with all new fields null (NFR6, FR30)
**And** `npm run db:generate` and `npm run db:migrate` succeed without errors

*FRs: FR9, FR10, FR30 | NFRs: NFR5, NFR6, NFR8*

### Story 1.2: Create Quick Booking Backend API

As an admin,
I want a backend endpoint to create quick bookings with source-based type determination and atomic conflict checking so that multi-source reservations are validated and stored reliably.

**Acceptance Criteria:**

**Given** an authenticated admin user
**When** a POST request is sent to `/api/bookings/quick` with `startDate`, `endDate`, and `source`
**Then** the system auto-determines `bookingType` from source (ABRITEL/AIRBNB/BOOKING_COM → EXTERNAL, PERSONNEL/FAMILLE → PERSONAL, OTHER → EXTERNAL) (FR6, NFR9)
**And** the booking is created with `bookingType` set immutably (FR9)
**And** no minimum nights constraint is applied — only validation that end date > start date (FR8)

**Given** a POST request with dates overlapping an existing non-cancelled booking
**When** the conflict check runs inside a Prisma `$transaction()` (NFR7)
**Then** the system returns 409 Conflict with `{ message: "Ces dates chevauchent une réservation existante...", conflictingBooking: { id, source, label, startDate, endDate } }` (FR11, FR12)

**Given** a POST request with optional fields (`label`, `sourceCustomName`, `externalAmount`, `occupantsCount`, `adultsCount`, `notes`)
**When** the booking is created
**Then** optional fields are saved when provided, null when omitted (FR3)
**And** `sourceCustomName` is required when `source` is OTHER, rejected otherwise

**Given** an unauthenticated user or non-admin user
**When** a POST request is sent to `/api/bookings/quick`
**Then** the system returns 401 or 403 (NFR1)

**Given** the CreateQuickBookingDto
**Then** it uses `@IsOptional()` as first decorator on optional fields, strict type validation, `whitelist: true` rejects unknown fields (NFR3, NFR14)
**And** `externalAmount` uses Decimal validation with max 2 decimal places (NFR4)

*FRs: FR2, FR3, FR5, FR6, FR8, FR9, FR10, FR11, FR12 | NFRs: NFR1, NFR3, NFR4, NFR7, NFR9*

### Story 1.3: Booking Type Selector at Wizard Entry

As an admin,
I want to choose between "Réservation directe" and "Réservation rapide" when creating a new booking so that I can use the appropriate flow for my situation.

**Acceptance Criteria:**

**Given** the admin navigates to `/admin/nouveau`
**When** the page loads
**Then** two clickable rows are displayed: "Réservation directe" (icon + "6 étapes — Client + tarification") and "Réservation rapide" (icon + "2 étapes — Dates + source") (FR1)
**And** rows follow Direction B design: stacked, min 72px height, full-width clickable area, hover state with primary border

**Given** the admin clicks "Réservation directe"
**When** the click is registered
**Then** the admin is navigated to the existing 6-step wizard flow with no behavioral changes (FR7, FR29)

**Given** the admin clicks "Réservation rapide"
**When** the click is registered
**Then** the admin is navigated to `/admin/nouveau/rapide/1` (quick flow step R1)

**Given** the TypeSelectorRow component
**Then** it has props: `icon`, `title`, `description`, `detail`, `selected`
**And** click targets are minimum 48px height (UX senior accessibility)
**And** labels are explicit French text — no icon-only elements

*FRs: FR1, FR7, FR29 | UX: TypeSelectorRow, Direction B stacked rows*

### Story 1.4: Quick Booking Step R1 — Dates & Source with Conflict Checking

As an admin,
I want to enter dates and select a booking source with immediate conflict feedback so that I can block dates with confidence knowing no overlap exists.

**Acceptance Criteria:**

**Given** the admin is on `/admin/nouveau/rapide/1`
**When** the page loads
**Then** a StepIndicator shows "Étape 1/2 — Dates & source"
**And** two date pickers (start/end) and a source dropdown are displayed
**And** the source dropdown contains: Abritel, Airbnb, Booking.com, Personnel, Famille, Autre (FR5)
**And** selecting "Autre" reveals a free text field for custom source name

**Given** valid dates are entered (end > start)
**When** dates change
**Then** a nights count is calculated and displayed
**And** the system checks for conflicts via API (debounced 300ms)

**Given** the conflict check returns a conflict
**When** the error is displayed
**Then** an inline error in plain French appears below the date fields: "Ces dates chevauchent une réservation existante ({source} — {label/client}, {dates})" (FR12)
**And** the "Suivant" button is disabled
**And** all entered data (source selection) is preserved (FR13)

**Given** valid dates with no conflict and a source selected
**When** the admin clicks "Suivant"
**Then** the admin is navigated to `/admin/nouveau/rapide/2`

**Given** the `quickBookingForm` Pinia store
**Then** it is a separate store from `newBookingForm` — zero imports or shared code (NFR13)
**And** it has state: `currentStep`, `source`, `sourceCustomName`, `startDate`, `endDate` + optional fields
**And** it has getters: `nightsCount`, `isStep1Valid`, `sourceDisplayName`
**And** it has action: `reset()`

*FRs: FR2, FR4, FR5, FR11, FR12, FR13 | NFR13 | UX: StepIndicator, conflict inline error*

### Story 1.5: Quick Booking Step R2 — Optional Details, Submission & Success

As an admin,
I want to optionally add details and confirm my quick booking so that it's created in the system immediately with a clear success confirmation.

**Acceptance Criteria:**

**Given** the admin is on `/admin/nouveau/rapide/2`
**When** the page loads
**Then** a RecapBanner displays the R1 data: SourceBadge + dates + nights count + "Modifier" link back to R1
**And** a StepIndicator shows "Étape 2/2 — Détails optionnels"
**And** optional fields are displayed with "Facultatif" labels: label/client name, external amount (€), occupants count, adults count, notes (textarea) (FR3)
**And** a dismissible InfoBubble says "Ces informations sont facultatives. Vous pourrez compléter plus tard..."

**Given** the admin clicks "Modifier" on the RecapBanner
**When** navigation occurs
**Then** the admin returns to R1 with all R2 data preserved in the store

**Given** the admin clicks "Créer la réservation" (with or without optional fields)
**When** the form submits
**Then** the primary button shows a loading spinner + "En cours..." and is disabled
**And** a POST request is sent to `/api/bookings/quick`

**Given** the API returns success
**When** the SuccessScreen renders at `/admin/nouveau/rapide/succes`
**Then** a centered confirmation displays: checkmark icon + "Réservation créée !" + booking summary (SourceBadge + dates + label if provided) (FR4)
**And** two buttons: "Retour aux réservations" (→ list) and "Voir la réservation" (→ detail)
**And** the screen persists until user clicks an action — no auto-dismiss

**Given** the API returns an error
**When** the error is handled
**Then** an error toast appears: "Erreur lors de la création. Veuillez réessayer."
**And** all form data is preserved — nothing is lost

*FRs: FR3, FR4 | UX: RecapBanner, InfoBubble, SuccessScreen, Direction B compact layout*

---

## Epic 2: Unified Booking View & Source Badges

Admin can view all bookings (direct, external, personal) in a single chronological list with colored source badges for instant visual identification, and see adapted detail pages that handle both complete and partial booking data.

### Story 2.1: Unified Booking List with Source Badges

As an admin,
I want to see all bookings in a single chronological list with colored source badges so that I can identify every reservation's origin at a glance — my "morning check" screen.

**Acceptance Criteria:**

**Given** the admin navigates to the bookings list
**When** the page loads
**Then** all booking types (DIRECT, EXTERNAL, PERSONAL) appear in the same chronological list (FR14)
**And** no booking type is hidden or filtered by default

**Given** a booking is displayed in the list
**When** it has a source set
**Then** a SourceBadge component displays the source name with category color: blue (`bg-blue-100 text-blue-800`) for EXTERNAL platforms, purple (`bg-purple-100 text-purple-800`) for PERSONAL, rose (`bg-rose-50 text-rose-700`) for DIRECT (FR15, FR16)
**And** the badge is a pill shape (`rounded-full text-xs font-medium px-2.5 py-0.5`)

**Given** a SourceBadge component
**Then** it accepts props: `source` (string), `bookingType` (BookingType), `size` ('sm' | 'md')
**And** it displays the source display name: "Abritel", "Airbnb", "Booking.com", "Personnel", "Famille", custom name for OTHER, "Direct" for DIRECT

**Given** a PaymentStatusBadge component
**Then** it displays payment status with colors: orange (PENDING/"En attente"), amber (PARTIAL/"Partiel"), emerald (PAID/"Payé"), slate (FREE/"Gratuit")
**And** it is only rendered when `paymentStatus` is non-null

**Given** a BookingCard for a quick booking with partial data
**When** client name is missing
**Then** the card displays `booking.label` or "Sans nom" as fallback
**When** rental price is missing
**Then** the card displays `booking.externalAmount` with "reçu de {source}" label, or hides the price section entirely

**Given** the frontend types in `api.ts`
**Then** the Booking interface is extended with: `bookingType`, `source`, `sourceCustomName`, `label`, `externalAmount`, `notes`, `paymentStatus`, `adultsCount`
**And** new type aliases exist: `BookingType`, `BookingSource`, `PaymentStatus`

*FRs: FR14, FR15, FR16 | UX: SourceBadge, PaymentStatusBadge, BookingCard modification*

### Story 2.2: Adaptive Booking Detail Page

As an admin,
I want the booking detail page to adapt its content based on available data so that both complete and partial bookings are displayed clearly without looking broken or empty.

**Acceptance Criteria:**

**Given** the admin opens a DIRECT booking detail page
**When** the page loads
**Then** all existing sections display as before — no visual or behavioral regression
**And** a SourceBadge "Direct" (rose) appears in the header alongside the status badge

**Given** the admin opens a quick booking (EXTERNAL/PERSONAL) detail page with only dates and source
**When** the page loads
**Then** the header shows the SourceBadge with source name and the status badge
**And** the dates section displays with nights count
**And** the client info section is hidden entirely (not shown as empty fields)
**And** the pricing section shows `externalAmount` with "Montant reçu de {source}" label if set, or is hidden if not set
**And** the notes section is visible when notes exist, hidden when empty
**And** the PaymentStatusBadge is shown next to the price if `paymentStatus` is set

**Given** a quick booking detail page
**When** the booking has label but no client
**Then** the name display shows the label value

**Given** the booking is cancelled (status = CANCELLED)
**When** the detail page loads
**Then** all document action buttons (contract, invoice, email) are hidden entirely (FR28)

*FRs: FR17, FR28 | UX: Adaptive layout, graceful data absence*

### Story 2.3: Null-Safe Existing Code Paths & Public Calendar

As an admin,
I want existing PDF generation and public calendar to work correctly with all booking types so that direct bookings remain fully functional and the public sees accurate availability.

**Acceptance Criteria:**

**Given** the `contractGenerator.ts` receives a booking
**When** a nullable field (`occupantsCount`, `rentalPrice`) is accessed
**Then** the generator handles null safely — never throws a null reference error (NFR10)
**And** PDF functions are never called with null required fields — a guard check prevents invocation

**Given** the `invoiceGenerator.ts` receives a booking
**When** a nullable field is accessed
**Then** the generator handles null safely (NFR10)

**Given** an existing DIRECT booking with all fields populated
**When** the admin generates a contract or invoice PDF
**Then** the PDF is generated correctly with no changes in output (FR32)

**Given** the public availability endpoint `GET /api/bookings/dates`
**When** bookings of all types exist (DIRECT, EXTERNAL, PERSONAL)
**Then** the endpoint returns blocked dates from ALL non-cancelled booking types (FR31)
**And** the public calendar on HomeView reflects accurate availability

**Given** a quick booking with status CONFIRMED
**When** its dates are checked by the public calendar
**Then** those dates appear as unavailable — same as a DIRECT confirmed booking

*FRs: FR31, FR32 | NFR10 | Files: contractGenerator.ts, invoiceGenerator.ts, bookings dates endpoint*

---

## Epic 3: Quick Booking Management

Admin can edit quick booking fields through a lightweight modal, manage payment status, and add notes on any booking type.

### Story 3.1: Quick Booking Edit Backend API

As an admin,
I want a backend endpoint to edit quick booking fields and manage payment status so that I can update reservation details after creation.

**Acceptance Criteria:**

**Given** an authenticated admin user
**When** a PATCH request is sent to `/api/bookings/:id/quick` with any combination of editable fields
**Then** the specified fields are updated: `startDate`, `endDate`, `source`, `sourceCustomName`, `label`, `externalAmount`, `occupantsCount`, `adultsCount`, `notes`, `paymentStatus`
**And** only provided fields are updated — omitted fields remain unchanged

**Given** a PATCH request with new dates that overlap an existing booking
**When** the conflict check runs (excluding the current booking being edited)
**Then** the system returns 409 Conflict with the same detailed error format as creation (FR11, FR12)

**Given** a PATCH request targeting a DIRECT booking
**When** the endpoint processes the request
**Then** the system returns 400 Bad Request — this endpoint is only for EXTERNAL/PERSONAL bookings

**Given** the UpdateQuickBookingDto
**Then** all fields are optional (`@IsOptional()` first)
**And** `sourceCustomName` is validated only when `source` is OTHER
**And** `paymentStatus` accepts only valid enum values (PENDING, PARTIAL, PAID, FREE) (FR22)
**And** `externalAmount` uses Decimal validation with max 2 decimal places (NFR4)

**Given** BookingType immutability (NFR8)
**When** any field is updated
**Then** `bookingType` is never modified — even if source changes category

*FRs: FR18, FR22 | NFRs: NFR1, NFR3, NFR4, NFR8*

### Story 3.2: Quick Booking Edit Modal & Cross-Type Notes

As an admin,
I want to edit quick booking fields through a lightweight modal and add notes on any booking type so that I can maintain and annotate all my reservations efficiently.

**Acceptance Criteria:**

**Given** the admin is on a quick booking (EXTERNAL/PERSONAL) detail page
**When** the admin clicks the "Modifier" action
**Then** a QuickBookingEditModal opens using BaseModal

**Given** the QuickBookingEditModal is open
**When** the modal loads
**Then** it displays all editable quick booking fields pre-filled with current values: dates (DatePicker x2), source (dropdown), label (text input), external amount (number input), occupants count (number input), adults count (number input), payment status (select), notes (textarea) (FR18)
**And** the modal is a single-section form — no section toggling like BookingEditModal
**And** all inputs have minimum 48px height and explicit French labels

**Given** the admin modifies dates in the modal
**When** the new dates conflict with another booking
**Then** an inline error appears with the conflict details in French
**And** the save button is disabled until dates are valid

**Given** the admin clicks "Enregistrer" with valid data
**When** the PATCH request succeeds
**Then** the modal closes, the detail page refreshes with updated data
**And** a success toast confirms: "Réservation modifiée"

**Given** a DIRECT booking detail page
**When** the page loads
**Then** a notes field is accessible for editing (FR23)
**And** notes are saved via the existing booking update endpoint

*FRs: FR18, FR22, FR23 | UX: QuickBookingEditModal, BaseModal, senior-first form patterns*

---

## Epic 4: Progressive Enrichment & Conditional Document Actions

Admin can progressively enrich quick bookings with full client details and pricing to unlock contract generation, invoice generation, and email sending — with clear visual feedback on what's available and what's missing.

### Story 4.1: Enrichment Backend API

As an admin,
I want a backend endpoint to enrich quick bookings with client details and pricing so that they can gain full document generation capabilities.

**Acceptance Criteria:**

**Given** an authenticated admin user
**When** a PATCH request is sent to `/api/bookings/:id/enrich` with client and/or pricing fields
**Then** the provided fields are merged into the booking: `primaryClientId`, `secondaryClientId`, `rentalPrice`, `cleaningIncluded`, `linenIncluded`, `touristTaxIncluded`, `occupantsCount`, `adultsCount`
**And** only provided fields are updated — omitted fields retain their current value

**Given** a PATCH request targeting a DIRECT booking
**When** the endpoint processes the request
**Then** the system returns 400 Bad Request — enrichment is only for EXTERNAL/PERSONAL bookings

**Given** the EnrichBookingDto
**Then** all fields are optional (progressive — partial enrichment supported)
**And** `rentalPrice` uses Decimal validation (NFR4)
**And** client IDs reference existing Client records

**Given** enrichment is unidirectional (FR21)
**When** a field that is already non-null is omitted from the request
**Then** the existing value is preserved — never set back to null
**When** a field that is already non-null is explicitly provided
**Then** the new value replaces the existing one (update is allowed, removal is not)

**Given** BookingType immutability (NFR8)
**When** enrichment is applied
**Then** `bookingType` remains unchanged — enriched EXTERNAL stays EXTERNAL

*FRs: FR19, FR20, FR21 | NFRs: NFR1, NFR3, NFR4, NFR8*

### Story 4.2: Booking Capabilities & Conditional Action Display

As an admin,
I want to see which document actions are available based on my booking's data completeness so that I know what I can do and what data is still needed.

**Acceptance Criteria:**

**Given** the `bookingCapabilities.ts` utility module
**Then** it exports pure functions (no API calls, no framework coupling):
- `canGenerateContract(booking)`: returns true when primaryClient is complete (firstName, lastName, address, city, postalCode, country, phone) + dates + rentalPrice are present (FR24)
- `canGenerateInvoice(booking)`: returns true when contract requirements met + cleaningIncluded, linenIncluded, touristTaxIncluded are set (FR25)
- `canSendEmail(booking)`: returns true when primaryClient has email address (FR26)
- `getDisabledReason(booking, action)`: returns French string explaining what's missing, or null if enabled (FR27)
- `isQuickBooking(booking)`: returns true for EXTERNAL/PERSONAL
- `getSourceDisplayName(booking)`: returns human-readable source name
- `getSourceBadgeColor(booking)`: returns `{ bg, text }` color classes

**Given** the admin views a quick booking detail page with incomplete data
**When** document actions are displayed
**Then** each action (contract, invoice, email) appears as a DisabledActionRow: gray icon (40x40), gray label, small French text explaining what's missing below (FR27)
**And** example disabled messages: "Informations client complètes requises", "Informations client et tarification requises", "Adresse email du client requise"

**Given** the admin views a booking with sufficient data for an action
**When** the action is displayed
**Then** the DisabledActionRow renders as an enabled clickable button with colored icon and dark label

**Given** a quick booking (EXTERNAL/PERSONAL) that has not been fully enriched
**When** the detail page loads
**Then** two side-by-side ActionCard components are displayed: "Modifier" (outline variant, gray border) and "Compléter les informations" (primary variant, tinted background with primary border)
**And** ActionCards have icon + title + description, min 48px click targets

**Given** a cancelled booking
**When** the detail page loads
**Then** all document action buttons/rows are hidden entirely (FR28)

*FRs: FR24, FR25, FR26, FR27, FR28 | UX: DisabledActionRow, ActionCard, bookingCapabilities.ts*

### Story 4.3: Progressive Enrichment Wizard

As an admin,
I want to enrich a quick booking through a pre-filled wizard so that I can add client details and pricing without re-entering existing data, unlocking contract and invoice generation.

**Acceptance Criteria:**

**Given** the admin clicks the "Compléter les informations" ActionCard on a quick booking detail page
**When** the enrichment wizard opens
**Then** a multi-step form is displayed with pre-filled data from the existing booking (FR20)
**And** dates are displayed read-only (editing dates is done via "Modifier" modal only)
**And** if `booking.label` exists, it is pre-filled as client lastName (or split into firstName/lastName if "Prénom Nom" pattern detected)
**And** `occupantsCount` and `adultsCount` are pre-filled if already set

**Given** the enrichment wizard step structure
**Then** Step 1 is "Informations client": firstName, lastName, address, city, postalCode, country, phone, email (with existing client creation/selection pattern)
**And** Step 2 is "Tarification & options": rentalPrice, cleaningIncluded, linenIncluded, touristTaxIncluded, occupantsCount, adultsCount
**And** Step 3 is "Récapitulatif": summary of all data with confirmation button

**Given** the admin completes the wizard and clicks "Enregistrer"
**When** a PATCH request is sent to `/api/bookings/:id/enrich`
**Then** the booking is updated with the enriched data
**And** the detail page refreshes showing newly available capabilities

**Given** a successful enrichment that completes client info + pricing
**When** the detail page reloads
**Then** the "Générer le contrat" button transitions from disabled to enabled (FR24)
**And** the "Compléter les informations" ActionCard is no longer shown (or shows "Informations complètes")
**And** the user experiences a visible reward: previously locked capabilities are now accessible

**Given** enrichment is unidirectional (FR21)
**When** the enrichment wizard loads for a partially enriched booking
**Then** previously enriched fields are pre-filled and editable (can update, cannot remove)
**And** there is no option to "downgrade" or remove previously set data

**Given** the admin clicks "Annuler" or navigates away during enrichment
**When** the wizard closes
**Then** no data is saved — the booking remains unchanged

*FRs: FR19, FR20, FR21 | UX: Enrichment wizard, pre-fill strategy, Direction C action cards*
