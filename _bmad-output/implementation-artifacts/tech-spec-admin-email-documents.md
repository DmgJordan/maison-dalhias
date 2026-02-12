---
title: 'Admin Email Document System'
slug: 'admin-email-documents'
created: '2026-02-12'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
adversarial_review: 'completed — 17 findings, all addressed'
tech_stack: ['NestJS 10', 'Prisma 5', 'Resend', 'jsPDF 2.5', 'Vue 3.4 Composition API', 'TypeScript 5.5', 'Tailwind CSS 3.3', 'Axios', 'Pinia']
files_to_modify:
  - 'apps/api/prisma/schema.prisma'
  - 'apps/api/src/bookings/dto/client.dto.ts'
  - 'apps/api/src/email/email.service.ts'
  - 'apps/api/src/email/email.module.ts'
  - 'apps/api/src/app.module.ts'
  - 'apps/web/src/lib/api.ts'
  - 'apps/web/src/views/admin/BookingDetailView.vue'
  - 'apps/web/src/constants/property.ts'
  - 'apps/web/src/stores/newBookingForm.ts'
files_to_create:
  - 'apps/api/src/email/email.controller.ts'
  - 'apps/api/src/email/dto/send-document-email.dto.ts'
  - 'apps/api/src/pdf/pdf.module.ts'
  - 'apps/api/src/pdf/pdf.service.ts'
  - 'apps/api/src/pdf/contract-generator.service.ts'
  - 'apps/api/src/pdf/invoice-generator.service.ts'
  - 'apps/api/src/pdf/constants/property.ts'
  - 'apps/api/src/pdf/fonts/Roboto-Regular.ttf'
  - 'apps/api/src/pdf/fonts/Roboto-Bold.ttf'
  - 'apps/web/src/components/admin/EmailSendModal.vue'
  - 'apps/web/src/components/admin/EmailHistoryCard.vue'
code_patterns:
  - 'NestJS: method-level @UseGuards(JwtAuthGuard, AdminGuard), explicit Promise<T> returns'
  - 'NestJS: @Injectable() services with constructor DI (PrismaService, etc.)'
  - 'NestJS: Feature modules with imports/exports, PrismaModule is @Global()'
  - 'NestJS: DTOs with class-validator decorators, ValidationPipe whitelist+forbidNonWhitelisted+transform'
  - 'NestJS: Typed exceptions (NotFoundException, BadRequestException, ConflictException)'
  - 'Prisma: .include() for relations, .select() to limit fields, no transactions used'
  - 'Prisma: Client create on booking creation (not upsert), conditional update/create on booking update'
  - 'Vue: <script setup lang="ts"> Composition API'
  - 'Vue: ref() for state, computed() for derived, onMounted() for init'
  - 'Vue: Scoped styles with Tailwind utility classes'
  - 'API client: Axios with JWT interceptor + 401 redirect, typed async functions'
test_patterns: ['No tests exist in the codebase currently']
---

# Tech-Spec: Admin Email Document System

**Created:** 2026-02-12

## Overview

### Problem Statement

Admins (seniors 60+, parents of the developer) must manually download PDF contracts/invoices, open their email client, attach files, and send — a 4-5 step multi-app process that is frustrating, error-prone, and creates anxiety about whether documents were actually sent. There is no tracking of what was sent, to whom, or when.

Additionally, the Client model is missing an `email` field — the email is collected in the frontend booking wizard but silently dropped both by the Pinia store's `getBookingData()` method (which uses `Omit<ClientFormData, 'email'>`) and by the backend ValidationPipe (whitelist mode), meaning client emails are never persisted.

### Solution

Integrated email system in the admin dashboard enabling contract/invoice sending in 1-2 clicks with preview, message customization, and per-booking email history. PDF generation migrated server-side (NestJS) for direct attachment to Resend emails. Data snapshots at send time ensure full traceability and PDF regeneration capability.

### Scope

**In Scope:**

- **Bug fix:** Add `email` field to Client model, ClientDto, Pinia store `getBookingData()`, and Prisma migration
- **Data model:** New EmailLog, ContractSnapshot, InvoiceSnapshot models with Prisma migration + `updatedAt` on Booking model
- **Server-side PDF:** Migrate contract and invoice PDF generation to NestJS backend
- **Email API:** Endpoint for sending documents (contract/invoice/both) with PDF attachments via Resend
- **Send UI:** Send buttons on booking detail page (per document + "send both")
- **Preview/Customize:** Preview screen showing recipient, subject, attachments, with optional personal message area
- **Success screen:** Full confirmation screen post-send (replaces preview, shows recap: what, to whom, when)
- **Email history:** Mini-cards per booking showing sent emails with status (SENT/FAILED) and resend button
- **"Modified since last send" alert:** Visual indicator when booking data changed after last email (uses `booking.updatedAt`)
- **Data completeness check:** Greyed-out send button when required data is missing or booking is CANCELLED
- **Recipient selector:** Radio buttons (primary client / secondary client / custom address)
- **Snapshot system:** Typed ContractSnapshot and InvoiceSnapshot collections for data traceability

**Out of Scope:**

- Resend webhook for delivery tracking (DELIVERED status) — keep simple SENT/FAILED
- Automatic/scheduled email sending — all sends are manual admin actions
- Multiple email templates — single professional template
- Bulk email sending across multiple bookings
- Email analytics or open tracking

## Context for Development

### Codebase Patterns

**Backend (NestJS):**
- Controllers use method-level `@UseGuards(JwtAuthGuard, AdminGuard)` for admin routes
- Services are `@Injectable()` with constructor DI (`PrismaService`, other services)
- Feature modules follow standard NestJS pattern with `imports/controllers/providers/exports`
- `PrismaModule` is `@Global()` — available everywhere without explicit import
- DTOs use `class-validator` decorators (`@IsString()`, `@IsOptional()`, `@ValidateNested()`, `@Type()`)
- Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`
- Error handling via typed NestJS exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`)
- Client persistence: direct `prisma.client.create()` on booking creation, conditional update/create on booking update
- No transactions used currently
- Global prefix: `/api`
- `BookingsModule` exports `BookingsService` — available for injection when module is imported

**Frontend (Vue 3):**
- `<script setup lang="ts">` Composition API throughout
- `ref()` for local state, `computed()` for derived values, `onMounted()` for init
- `useRoute()` and `useRouter()` composables for navigation
- Scoped styles with Tailwind utility classes + custom CSS
- Current toast pattern: 3s auto-dismiss `successMessage` ref (NOTE: brainstorming says NO toasts for seniors — need full-screen persistent feedback)
- API client: Axios instance with Bearer token interceptor + 401 redirect to `/login`
- Typed async functions in `api.ts` organized by domain (`bookingsApi`, `authApi`, etc.)

**PDF Generation (currently frontend-only):**
- `jsPDF` with manual coordinate-based layout (`doc.text()`, `doc.setFont()`, y-tracking)
- Roboto font loaded async from GitHub, cached at module level, fallback to Helvetica
- `PDF_COLORS` constant for consistent styling
- Contract: takes `ContractData` (booking + computed prices), uses Helvetica (no special font). **NOTE:** The existing contract PDF sections skip from 14 to 16 (section 15 is absent) — this is intentional and must be preserved in the backend port.
- Invoice: takes `InvoiceData` (booking + prices + optional priceDetails), uses Roboto via `configurePdfWithFrenchFont()`
- Both generators call `doc.save()` to trigger browser download

### Files to Reference

| File | Purpose |
|------|---------|
| `apps/api/prisma/schema.prisma` | Current DB schema — add email to Client, updatedAt to Booking, add EmailLog/ContractSnapshot/InvoiceSnapshot |
| `apps/api/src/bookings/bookings.controller.ts` | Controller pattern reference (guards, decorators, return types) |
| `apps/api/src/bookings/bookings.service.ts` | Service pattern reference (Prisma queries, client create/update, error handling). `BookingsService` is exported from `BookingsModule`. |
| `apps/api/src/bookings/bookings.module.ts` | Module reference — exports `BookingsService` for use in other modules |
| `apps/api/src/bookings/dto/client.dto.ts` | DTO to modify — add `@IsEmail()` email field |
| `apps/api/src/bookings/dto/create-booking.dto.ts` | DTO reference — `@ValidateNested()` + `@Type()` pattern for nested objects |
| `apps/api/src/email/email.service.ts` | Existing Resend service — extend with document email sending + attachments |
| `apps/api/src/email/email.module.ts` | Module to extend with controller + PdfModule + BookingsModule imports |
| `apps/api/src/app.module.ts` | Root module — add PdfModule import |
| `apps/web/src/lib/api.ts` | API client — add `email` to Client type, add `emailApi` operations |
| `apps/web/src/views/admin/BookingDetailView.vue` | Booking detail — add send buttons (Documents section ~lines 611-680), email history section. Also contains BookingEditModal reference. |
| `apps/web/src/services/pdf/contractGenerator.ts` | Contract PDF logic to port server-side (ContractData interface, layout, sections 1-18 with section 15 missing intentionally) |
| `apps/web/src/services/pdf/invoiceGenerator.ts` | Invoice PDF logic to port server-side (InvoiceData interface, table layout, payment conditions) |
| `apps/web/src/services/pdf/fontLoader.ts` | Font loading pattern — replicate server-side for Roboto using bundled .ttf files |
| `apps/web/src/constants/property.ts` | BAILLEUR, LOGEMENT, TARIFS, PDF_COLORS — duplicate to backend constants |
| `apps/web/src/stores/newBookingForm.ts` | **BUG:** `getBookingData()` (line ~310) uses `Omit<ClientFormData, 'email'>` and never includes email. Must be fixed. |
| `apps/web/assets/templates/signature.png` | Signature image used in contract PDF — must be copied to backend or embedded as base64 |

### Technical Decisions

- **PDF generation server-side:** Migrate from frontend jsPDF to backend NestJS to enable direct email attachment without client-to-server base64 transfer. Use same jsPDF library server-side (works in Node.js). Port existing generator logic preserving exact layout.
- **Snapshot architecture:** Typed Prisma models (ContractSnapshot, InvoiceSnapshot) instead of JSON blobs — queryable, maintainable, enables exact PDF regeneration from historical data. InvoiceSnapshot includes a `priceDetailsJson` field (Json type) to store seasonal price breakdown for faithful regeneration.
- **Simple status model:** SENT/FAILED only (no DELIVERED) — avoids Resend webhook complexity.
- **Client email fix:** Add `email` field to existing Client model as part of this feature (prerequisite). Field is `String?` (optional) for backwards compatibility with existing clients without email. Fix both backend (DTO + schema) AND frontend (Pinia store `getBookingData()`).
- **Booking updatedAt:** Add `updatedAt DateTime @updatedAt` to Booking model to enable "modified since last send" detection.
- **Cascade delete:** EmailLog, ContractSnapshot, InvoiceSnapshot use `onDelete: Cascade` on their Booking relation to prevent foreign key errors when a booking is deleted.
- **Senior UX principles:** One button = one action, persistent feedback (full-screen success, NOT 3s toast), app remembers for you, no silent point of no return.
- **Email sending endpoint:** New controller in email module (`POST /api/emails/send`) rather than adding to bookings controller — separation of concerns. `EmailModule` imports `BookingsModule` to inject `BookingsService`.
- **Frontend components:** Modal-based preview/send flow (EmailSendModal) + inline history cards (EmailHistoryCard) on booking detail page.
- **Constants duplication:** BAILLEUR/LOGEMENT/TARIFS constants duplicated to backend for server-side PDF generation. Single source of truth is acceptable since these are rarely-changing business constants.
- **jsPDF `output('arraybuffer')`:** Server-side PDF returns `Buffer` instead of triggering `doc.save()`. Buffer is passed as attachment to Resend `emails.send()`.
- **Signature image:** Copy `apps/web/assets/templates/signature.png` to `apps/api/src/pdf/assets/signature.png` and load with `fs.readFileSync()` + base64 conversion. Do NOT use browser APIs (canvas, Image).
- **Roboto fonts:** Download Roboto-Regular.ttf and Roboto-Bold.ttf from Google Fonts, place in `apps/api/src/pdf/fonts/`. Load with `fs.readFileSync()` and register with jsPDF via `addFileToVFS()`.
- **Partial PDF failure on "send both":** If one PDF generation fails, abort the entire send and return an error. Do NOT send partial documents — it would confuse seniors. The user can retry or send each document individually.
- **CANCELLED bookings:** Email send buttons are hidden for bookings with status CANCELLED. No business reason to send documents for a cancelled reservation.

## Implementation Plan

### Tasks

#### Phase 1: Data Model & Bug Fix

- [x]**Task 1: Add `email` field to Client model + fix frontend email bug**
  - File: `apps/api/prisma/schema.prisma`
  - Action: Add `email String? @map("email")` to the `Client` model. Field is optional (`String?`) for backwards compatibility with existing client records that have no email.
  - File: `apps/api/src/bookings/dto/client.dto.ts`
  - Action: Add `@IsOptional() @IsEmail() email?: string;` field. Import `IsEmail` from `class-validator`.
  - File: `apps/web/src/lib/api.ts`
  - Action: Add `email?: string;` to the `Client` interface. (Note: `CreateBookingData.primaryClient` uses `Omit<Client, 'id'>` so the email field will automatically propagate to create/update types.)
  - **File: `apps/web/src/stores/newBookingForm.ts`** *(F1 fix)*
  - **Action:** In the `getBookingData()` method (~line 310), the return type uses `Omit<ClientFormData, 'email'> & { email?: string }` and the method body never assigns `email`. Fix: include `email: this.primaryClient.email` (and same for secondaryClient) in the returned object. The email should be included when it is non-empty.
  - Run: `npm run db:migrate` to generate migration `add-client-email`.

- [x]**Task 2: Add EmailLog, ContractSnapshot, InvoiceSnapshot models + Booking updatedAt**
  - File: `apps/api/prisma/schema.prisma`
  - Action: Add `updatedAt DateTime @updatedAt @map("updated_at")` to the `Booking` model. *(F2 fix)*
  - Action: Add the three new models:
    - `EmailLog`: id, bookingId (relation to Booking, **onDelete: Cascade**), recipientEmail, recipientName, documentTypes (String[]), subject, personalMessage?, resendMessageId?, status (EmailStatus enum: SENT/FAILED), sentAt, failedAt?, failureReason?, contractSnapshotId? (relation), invoiceSnapshotId? (relation), createdAt. Index on bookingId. Use `@@map("email_logs")`.
    - `ContractSnapshot`: id, bookingId (relation to Booking, **onDelete: Cascade**), clientFirstName, clientLastName, clientAddress, clientCity, clientPostalCode, clientCountry, clientEmail, clientPhone, startDate, endDate, occupantsCount, rentalPrice (Decimal), cleaningIncluded (Boolean), linenIncluded (Boolean), touristTaxIncluded (Boolean), depositAmount (Decimal), createdAt. Index on bookingId. Use `@@map("contract_snapshots")`. *(F13 fix: onDelete: Cascade)*
    - `InvoiceSnapshot`: id, bookingId (relation to Booking, **onDelete: Cascade**), clientFirstName, clientLastName, clientAddress, clientCity, clientPostalCode, clientCountry, rentalPrice (Decimal), nightsCount (Int), cleaningPrice (Decimal?), linenPrice (Decimal?), touristTaxPrice (Decimal?), totalPrice (Decimal), depositAmount (Decimal), balanceAmount (Decimal), **priceDetailsJson Json?** *(F6 fix: stores PriceDetailForInvoice[] as JSON for faithful PDF regeneration)*, createdAt. Index on bookingId. Use `@@map("invoice_snapshots")`.
    - `EmailStatus` enum: SENT, FAILED.
  - Action: Add reverse relations to `Booking` model: `emailLogs EmailLog[]`, `contractSnapshots ContractSnapshot[]`, `invoiceSnapshots InvoiceSnapshot[]`.
  - Run: `npm run db:migrate` to generate migration `add-email-system`.
  - Run: `npm run db:generate` to regenerate Prisma client.

#### Phase 2: Server-Side PDF Generation

- [x]**Task 3: Create backend property constants + assets**
  - File (new): `apps/api/src/pdf/constants/property.ts`
  - Action: Duplicate BAILLEUR, LOGEMENT, TARIFS, and PDF_COLORS objects from `apps/web/src/constants/property.ts`. Export with same interfaces. These are static business constants that rarely change.
  - **File (copy): `apps/api/src/pdf/assets/signature.png`** *(F5 fix)*
  - **Action:** Copy `apps/web/assets/templates/signature.png` to `apps/api/src/pdf/assets/signature.png`. This image is used in the contract PDF for the landlord's signature.
  - **Files (download): `apps/api/src/pdf/fonts/Roboto-Regular.ttf`, `apps/api/src/pdf/fonts/Roboto-Bold.ttf`** *(F7 fix)*
  - **Action:** Download Roboto Regular and Bold .ttf files from Google Fonts (https://fonts.google.com/specimen/Roboto, Apache License 2.0). Place in `apps/api/src/pdf/fonts/`. These fonts are used by the invoice generator for UTF-8 French character support.

- [x]**Task 4: Create contract PDF generator service**
  - File (new): `apps/api/src/pdf/contract-generator.service.ts`
  - Action: Create `@Injectable() ContractGeneratorService` that ports the logic from `apps/web/src/services/pdf/contractGenerator.ts`. Key changes from frontend version:
    - Replace `doc.save(filename)` with `return Buffer.from(doc.output('arraybuffer'))` returning a `Buffer`.
    - **Replace browser-specific `loadImage()` function:** *(F5 fix)* Load `apps/api/src/pdf/assets/signature.png` using `fs.readFileSync()`, convert to base64 data URL (`data:image/png;base64,...`), and pass to `doc.addImage()`. Do NOT use `HTMLCanvasElement` or `new Image()` (browser-only APIs).
    - Accept a typed `ContractGenerateData` interface (similar to frontend `ContractData` but using snapshot data instead of Booking relation).
    - Use BAILLEUR/LOGEMENT/TARIFS from backend constants.
    - **Keep exact same PDF layout including the section 15 skip** (sections go 14 → 16). This is intentional in the original, do NOT "fix" it. *(F9 clarification)*
  - Notes: jsPDF works in Node.js. Contract uses Helvetica (no need for Roboto font loading). Signature image path should be resolved relative to the service file using `path.join(__dirname, '..', 'assets', 'signature.png')`.

- [x]**Task 5: Create invoice PDF generator service**
  - File (new): `apps/api/src/pdf/invoice-generator.service.ts`
  - Action: Create `@Injectable() InvoiceGeneratorService` that ports the logic from `apps/web/src/services/pdf/invoiceGenerator.ts`. Key changes:
    - Replace `doc.save()` with `return Buffer.from(doc.output('arraybuffer'))` returning a `Buffer`.
    - **Port Roboto font loading server-side:** *(F7 fix)* Load `apps/api/src/pdf/fonts/Roboto-Regular.ttf` and `Roboto-Bold.ttf` using `fs.readFileSync()`. Convert to base64 string. Register with jsPDF via `doc.addFileToVFS('Roboto-Regular.ttf', base64Regular)` then `doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')`. Same for bold. Cache the base64 strings at module level (read once, reuse).
    - Accept a typed `InvoiceGenerateData` interface using snapshot data. **Include `priceDetails?: PriceDetailForInvoice[]` parsed from `InvoiceSnapshot.priceDetailsJson`.** *(F6 fix)*
    - Port `generateInvoiceNumber()` function.
    - Keep exact same PDF layout (header, client info, table, payment conditions).

- [x]**Task 6: Create PDF module**
  - File (new): `apps/api/src/pdf/pdf.module.ts`
  - Action: Create NestJS module exporting `ContractGeneratorService` and `InvoiceGeneratorService`.
  - File (new): `apps/api/src/pdf/pdf.service.ts`
  - Action: Create facade `PdfService` that orchestrates both generators. Methods: `generateContract(data): Promise<Buffer>`, `generateInvoice(data): Promise<Buffer>`. This service is injected by EmailController.
  - File: `apps/api/src/app.module.ts`
  - Action: Add `PdfModule` to imports array.

#### Phase 3: Email Sending Backend

- [x]**Task 7: Create email sending DTO**
  - File (new): `apps/api/src/email/dto/send-document-email.dto.ts`
  - Action: Create `SendDocumentEmailDto` with class-validator decorators:
    - `@IsUUID() bookingId: string` — the booking to send documents for
    - `@IsArray() @IsIn(['contract', 'invoice'], { each: true }) documentTypes: string[]` — which documents to attach
    - `@IsEmail() recipientEmail: string` — destination email address
    - `@IsString() recipientName: string` — recipient display name
    - `@IsOptional() @IsString() personalMessage?: string` — optional personal note added to email body

- [x]**Task 8: Extend EmailService with document sending**
  - File: `apps/api/src/email/email.service.ts`
  - Action: Add new method `sendDocumentEmail(params)` that:
    1. Receives: bookingId, documentTypes, recipientEmail, recipientName, personalMessage?, contract PDF buffer?, invoice PDF buffer?
    2. Builds HTML email body: professional template with Maison Dalhias branding, booking summary (dates, property), optional personal message section, list of attached documents.
    3. Calls `this.resend.emails.send()` with:
       - `from`: senderEmail (existing)
       - `to`: recipientEmail
       - `subject`: `[Maison Dalhias] Votre contrat de location` / `Votre facture` / `Vos documents de réservation` (based on documentTypes)
       - `html`: built template
       - `attachments`: array of `{ filename: string, content: Buffer }` for each PDF buffer
    4. Returns `{ resendMessageId: string }` or throws on failure.
  - Notes: Resend SDK accepts Buffer directly in `attachments[].content`.

- [x]**Task 9: Create EmailController**
  - File (new): `apps/api/src/email/email.controller.ts`
  - Action: Create controller with prefix `emails`. Inject `BookingsService` (from imported `BookingsModule`), `PdfService` (from imported `PdfModule`), `EmailService`, and `PrismaService` (global).
    - `POST /api/emails/send` — `@UseGuards(JwtAuthGuard, AdminGuard)`. Accepts `SendDocumentEmailDto`. Orchestrates:
      1. Fetch booking with relations (primaryClient, secondaryClient) via `BookingsService.findById()`
      2. **Validate booking status is not CANCELLED** — return `BadRequestException` if cancelled *(F17 fix)*
      3. Validate booking has required data for requested documents (client info complete, email present)
      4. Create ContractSnapshot and/or InvoiceSnapshot from current booking data. **For InvoiceSnapshot, compute price details and store as `priceDetailsJson`** *(F6 fix)*
      5. Generate PDF(s) via `PdfService`. **If "send both" and one PDF generation fails, abort entirely and return error — do NOT send partial documents** *(F10 fix)*
      6. Send email via `EmailService.sendDocumentEmail()`
      7. Create `EmailLog` record with status SENT (or FAILED if send throws)
      8. Return EmailLog with snapshot IDs
    - `GET /api/emails/booking/:bookingId` — `@UseGuards(JwtAuthGuard, AdminGuard)`. Returns all EmailLog records for a booking, ordered by sentAt desc. Include contractSnapshot and invoiceSnapshot relations.
  - Notes: Use try/catch around Resend send — on failure, still create EmailLog with status FAILED and failureReason.

- [x]**Task 10: Update EmailModule**
  - File: `apps/api/src/email/email.module.ts`
  - Action: Add `EmailController` to controllers. Import `PdfModule` and `BookingsModule` (for `BookingsService` injection into `EmailController`). `PrismaService` is globally available (no explicit import needed).

#### Phase 4: Frontend — API Client & Types

- [x]**Task 11: Add email types and API operations to frontend**
  - File: `apps/web/src/lib/api.ts`
  - Action:
    - Add `email?: string;` to `Client` interface (if not already done in Task 1)
    - Add `EmailLog` interface: `{ id: string, bookingId: string, recipientEmail: string, recipientName: string, documentTypes: string[], subject: string, personalMessage?: string, status: 'SENT' | 'FAILED', sentAt: string, failedAt?: string, failureReason?: string, contractSnapshotId?: string, invoiceSnapshotId?: string, createdAt: string }`
    - Add `SendDocumentEmailRequest` interface: `{ bookingId: string, documentTypes: ('contract' | 'invoice')[], recipientEmail: string, recipientName: string, personalMessage?: string }`
    - Add `emailApi` object with:
      - `async send(data: SendDocumentEmailRequest): Promise<EmailLog>` — POST `/emails/send`
      - `async getByBooking(bookingId: string): Promise<EmailLog[]>` — GET `/emails/booking/${bookingId}`

#### Phase 5: Frontend — Email Send Modal

- [x]**Task 12: Create EmailSendModal component**
  - File (new): `apps/web/src/components/admin/EmailSendModal.vue`
  - Action: Create modal component with `<script setup lang="ts">`. Props: `booking: Booking`, `initialDocumentTypes: ('contract' | 'invoice')[]`, `show: boolean`. Emits: `close`, `sent(emailLog: EmailLog)`.
  - **Modal content (single screen, preview + customize merged):**
    - **Context reminder** (top): Booking dates + client name in bold — prevents wrong-booking confusion
    - **Recipient selector**: Radio buttons — "Client principal: {name} ({email})" (pre-selected) / "Client secondaire: {name} ({email})" (if exists) / "Autre adresse" (reveals text input). Disable radio if client has no email (show warning).
    - **Document selection**: Checkboxes for "Contrat de location" and "Facture", pre-checked based on `initialDocumentTypes` prop
    - **Subject line**: Read-only, auto-generated based on document selection: "Votre contrat de location" / "Votre facture" / "Vos documents de réservation"
    - **Professional message**: Read-only preview of the standard email body text
    - **Personal message**: Optional textarea labeled "Ajouter un mot personnel (optionnel)" with placeholder. **"Effacer le message"** button clears the field. *(F16 fix: renamed from "Remettre le texte par défaut" which was confusing)*
    - **Attachments preview**: List showing document names + file type icon (PDF)
    - **Action buttons**: Large "Envoyer" primary button (min 48px height, explicit text) + "Annuler" secondary button. "Envoyer" disabled if: no documents selected, no recipient email, or sending in progress.
    - **Loading state**: On send click, button shows spinner + "Envoi en cours...", all inputs disabled.
    - **Error state**: On failure, display error message inline (large, red, persistent) with "Réessayer" button.
  - **On successful send**: Emit `sent` event with EmailLog data. Parent component handles success screen.
  - **UX Notes**: Large fonts (min 16px body), high contrast, no auto-closing, explicit labels on every field.

#### Phase 6: Frontend — Success Screen & History

- [x]**Task 13: Create EmailHistoryCard component**
  - File (new): `apps/web/src/components/admin/EmailHistoryCard.vue`
  - Action: Create component with `<script setup lang="ts">`. Props: `emailLog: EmailLog`. Emits: `resend(emailLog: EmailLog)`.
  - **Card content:**
    - **Status badge**: Green "Envoyé" for SENT, Red "Erreur" for FAILED
    - **Date**: `sentAt` formatted as "12 fev. 2026 a 14h30"
    - **Recipient**: `recipientName` (`recipientEmail`)
    - **Documents**: Chips/tags for each documentType ("Contrat", "Facture")
    - **Personal message**: If present, truncated preview (1 line)
    - **Resend button**: "Renvoyer" secondary button, emits `resend` event
    - **Failure reason**: If FAILED, show `failureReason` in red text

- [x]**Task 14: Integrate email features into BookingDetailView**
  - File: `apps/web/src/views/admin/BookingDetailView.vue`
  - Action:
    - **Import** EmailSendModal, EmailHistoryCard, emailApi
    - **State**: Add refs: `emailLogs: ref<EmailLog[]>([])`, `showEmailModal: ref(false)`, `emailModalDocTypes: ref<string[]>([])`, `showSuccessScreen: ref(false)`, `lastSentEmail: ref<EmailLog | null>(null)`, `loadingEmails: ref(false)`
    - **Data loading**: In `onMounted`, after `fetchBooking()`, call `fetchEmailHistory()` which loads `emailApi.getByBooking(bookingId)`.
    - **Documents section modification** (~lines 611-680): After existing PDF download buttons, add email send buttons:
      - "Envoyer le contrat par email" button → opens modal with `['contract']`
      - "Envoyer la facture par email" button → opens modal with `['invoice']`
      - "Envoyer les deux par email" button → opens modal with `['contract', 'invoice']`
      - Buttons use same `.document-btn` styling pattern with email icon
      - **Data completeness check**: Buttons disabled (greyed out) with tooltip if `booking.primaryClient?.email` is missing. Show inline message: "Adresse email du client requise pour l'envoi."
      - **CANCELLED booking check**: Hide all email send buttons entirely when `booking.status === 'CANCELLED'`. *(F17 fix)*
    - **EmailSendModal integration**: Render `<EmailSendModal>` with `v-if="showEmailModal"`. On `@sent` event: hide modal, set `lastSentEmail`, show success screen, refresh email history.
    - **Success screen**: Full-width section (replaces/overlays document area) showing:
      - Large green checkmark icon
      - "Email envoyé avec succès !" heading (large, bold)
      - Recap: "Destinataire: {name} ({email})"
      - Recap: "Documents: Contrat, Facture"
      - Recap: "Envoyé le: {date formatted}"
      - "Retour à la réservation" button to dismiss
      - This section is persistent (no auto-dismiss). User must click to go back.
    - **Email history section**: New section below Documents titled "Historique des emails". Render `<EmailHistoryCard>` for each emailLog. On `@resend`: open modal pre-filled with same documentTypes and recipient.
    - **"Modified since last send" alert**: Computed property comparing `booking.updatedAt` against the most recent emailLog's `sentAt`. If `booking.updatedAt > lastEmailLog.sentAt`, show yellow alert banner: "La réservation a été modifiée depuis le dernier envoi. Pensez à renvoyer les documents." *(F2 fix: now uses real `updatedAt` field)*

- [x]**Task 15: Add email field to booking edit form** *(F14 fix — new task)*
  - File: `apps/web/src/views/admin/BookingDetailView.vue` (or the BookingEditModal component if separate)
  - Action: In the booking edit form/modal, add an "Email" input field for the primary client (and secondary client if present). This allows admins to add/edit the email address for existing clients that were created before the email field existed. Follow the same form field pattern as other client fields (firstName, lastName, phone, etc.).

## Acceptance Criteria

### Client Email Fix
- [x]AC 1: Given a new booking created via the wizard, when the admin fills in the client email field, then the email is persisted in the Client record in the database.
- [x]AC 2: Given an existing client without email, when the booking detail page loads, then the send email buttons are disabled with a message "Adresse email du client requise pour l'envoi."
- [x]AC 3: Given an existing booking, when the admin edits the client info, then they can add/modify the client's email address.

### Email Sending
- [x]AC 4: Given a booking with a client who has an email, when the admin clicks "Envoyer le contrat par email", then a modal opens pre-filled with the client's email, name, and "Contrat de location" selected.
- [x]AC 5: Given the email send modal is open, when the admin clicks "Envoyer", then a PDF contract is generated server-side, attached to an email via Resend, and sent to the recipient.
- [x]AC 6: Given the email was sent successfully, when the modal closes, then a full-screen success confirmation displays showing recipient, documents sent, and timestamp. The screen does NOT auto-dismiss.
- [x]AC 7: Given the admin selects "Envoyer les deux par email", when the email is sent, then both contract and invoice PDFs are generated and attached to a single email.
- [x]AC 8: Given the email send fails (Resend error), when the error occurs, then an EmailLog with status FAILED is created, and the modal shows a persistent error message with a "Réessayer" button.
- [x]AC 9: Given "send both" is selected and one PDF generation fails, when the error occurs, then the entire send is aborted (no partial email), and an error is shown.

### Recipient Selection
- [x]AC 10: Given a booking with both primary and secondary clients, when the modal opens, then radio buttons show both clients with their names and emails, with primary client pre-selected.
- [x]AC 11: Given the admin selects "Autre adresse", when they enter a custom email, then the email is sent to that address without modifying the booking's client data.

### Preview & Customization
- [x]AC 12: Given the modal is open, when the admin types a personal message, then it is included in the email body below the standard professional text.
- [x]AC 13: Given the admin typed a personal message, when they click "Effacer le message", then the personal message field is cleared.

### Snapshots
- [x]AC 14: Given an email is sent with a contract, when the send completes, then a ContractSnapshot is created with all current booking/client data frozen at that moment.
- [x]AC 15: Given a ContractSnapshot exists, when the booking data is later modified, then the snapshot retains the original values at time of send.
- [x]AC 16: Given an email is sent with an invoice, when the send completes, then an InvoiceSnapshot is created including `priceDetailsJson` with the seasonal price breakdown.

### Email History
- [x]AC 17: Given a booking has 3 previously sent emails, when the booking detail page loads, then all 3 emails appear as cards in the "Historique des emails" section, ordered newest first.
- [x]AC 18: Given an email in history, when the admin clicks "Renvoyer", then the send modal opens pre-filled with the same document types and recipient as the original email.

### Modified Since Last Send Alert
- [x]AC 19: Given a booking whose `updatedAt` is after the last email's `sentAt`, when the booking detail page loads, then a yellow alert banner shows "La réservation a été modifiée depuis le dernier envoi."
- [x]AC 20: Given a booking with no emails sent yet, when the page loads, then no modification alert is shown.

### Data Completeness & Status
- [x]AC 21: Given a booking where the primary client has no address or name, when the admin tries to send a contract, then the send button is disabled and a validation message indicates which fields are missing.
- [x]AC 22: Given a booking with status CANCELLED, when the booking detail page loads, then email send buttons are hidden.

### PDF Fidelity
- [x]AC 23: Given a contract PDF generated server-side, when compared to a contract PDF generated by the existing frontend generator for the same booking, then the layout, content, and styling are identical (including intentional section 15 skip).
- [x]AC 24: Given an invoice PDF generated server-side, when compared to a frontend-generated invoice, then the layout, content, and styling are identical (including Roboto font rendering and seasonal price detail).

### Data Integrity
- [x]AC 25: Given a booking with associated EmailLogs and Snapshots, when the booking is deleted, then all related EmailLogs, ContractSnapshots, and InvoiceSnapshots are cascade-deleted without foreign key errors.

## Additional Context

### Dependencies

**NPM packages (backend):**
- `resend` — already in `apps/api/package.json`
- `jspdf` — needs to be added to `apps/api/package.json` (currently only in `apps/web`)
- `class-validator`, `class-transformer` — already installed

**No new frontend dependencies needed.**

**Static assets to add (backend):**
- `apps/api/src/pdf/assets/signature.png` — copied from `apps/web/assets/templates/signature.png`
- `apps/api/src/pdf/fonts/Roboto-Regular.ttf` — downloaded from Google Fonts
- `apps/api/src/pdf/fonts/Roboto-Bold.ttf` — downloaded from Google Fonts

**Service dependencies:**
- Resend API key must be configured (`RESEND_API_KEY` env var — already set up)
- `SENDER_EMAIL` env var — already configured as `contact@maison-dalhias.fr`

**Internal dependencies (task order):**
- Task 1 (Client email) must complete before Task 9 (EmailController validates email presence)
- Task 2 (DB models) must complete before Task 9 (EmailController creates snapshots and logs)
- Task 3 (constants + assets + fonts) must complete before Tasks 4-5 (PDF generators use them)
- Tasks 4-5 (PDF services) must complete before Task 6 (PdfModule)
- Task 6 (PdfModule) must complete before Task 10 (EmailModule imports it)
- Task 7 (DTO) must complete before Task 9 (EmailController uses DTO)
- Task 8 (EmailService extension) must complete before Task 9 (EmailController calls sendDocumentEmail)
- Task 11 (frontend API client) must complete before Tasks 12-15 (frontend components use emailApi)

### Testing Strategy

**No automated tests** (consistent with current codebase — no test files exist).

**Manual testing checklist:**
1. Create a booking with client email via the wizard — verify email is persisted in DB (check with Prisma Studio)
2. Edit an existing booking — verify you can add/modify client email
3. Open booking detail — verify send buttons appear and are enabled when client has email
4. Open a CANCELLED booking — verify send buttons are hidden
5. Click "Envoyer le contrat" — verify modal opens with correct pre-fill
6. Send email — verify PDF received in actual email inbox, layout matches frontend-generated PDF
7. Verify success screen appears and does NOT auto-dismiss
8. Verify EmailLog record created in DB with status SENT
9. Verify ContractSnapshot/InvoiceSnapshot created with correct frozen data
10. Refresh page — verify email appears in history section
11. Click "Renvoyer" on history card — verify modal opens with same config
12. Modify booking data — verify "modified since last send" alert appears
13. Test with client without email — verify buttons are disabled with message
14. Test "Autre adresse" recipient — verify email sent to custom address
15. Test personal message — verify it appears in received email
16. Test "Effacer le message" button — verify it clears the personal message
17. Test error case — temporarily use invalid Resend API key, verify FAILED status and error display
18. Delete a booking with email history — verify cascade delete works (no DB errors)

### Notes

- Source brainstorming: `_bmad-output/brainstorming/brainstorming-session-2026-02-11.md`
- Target users: Seniors (60+), parents of the developer, non-technical
- Primary usage: Desktop PC, mobile as fallback
- Existing email infrastructure: Resend API already configured in `apps/api/src/email/email.service.ts`
- Existing PDF generators (frontend): `apps/web/src/services/pdf/contractGenerator.ts`, `invoiceGenerator.ts`
- No tests in current codebase — no test patterns to follow
- Current BookingDetailView Documents section (~lines 611-680): two PDF download buttons with loading states — send buttons to be added alongside
- **Existing bug in contract PDF:** Section numbering skips 15 (goes 14 → 16). This is intentional per original template and must be preserved.
- **Risk: jsPDF server-side font rendering** — Roboto font loading uses `fs.readFileSync()` with bundled .ttf files. Cache base64 at module level for performance. Test PDF output carefully against frontend version.
- **Risk: Signature image in contract** — Uses `fs.readFileSync()` with base64 conversion. Path resolution via `path.join(__dirname, ...)`. Ensure the file is included in the build output (may need to adjust `tsconfig.json` or copy in build step).
- **Risk: Resend attachment size limit** — Resend allows up to 40MB total attachments. Contract + invoice PDFs are typically < 200KB combined. No issue expected.
- **Risk: Font files in Docker build** — The Roboto .ttf files (~170KB each) and signature.png must be included in the Docker image. Verify they are not excluded by `.dockerignore`.
- **Future consideration:** If email volume grows, consider adding a dedicated email queue (Bull/BullMQ) to handle sends asynchronously. Not needed for current low-volume use case.
