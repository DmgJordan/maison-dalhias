---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-19.md'
  - '_bmad-output/planning-artifacts/product-brief-maison-dalhias-2026-02-20.md'
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 1
projectDocsCount: 0
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: brownfield
---

# Product Requirements Document - maison-dalhias

**Author:** Jordan
**Date:** 2026-02-20

## Executive Summary

Maison Dalhias is a vacation rental management app for a single property (Maison Dalhias 19, Grospierres, Ardèche). The existing system handles direct bookings through a 6-step wizard with automated contract/invoice generation and email sending. However, ~50% of bookings come from external platforms (primarily Abritel) or are personal/family blocks — and these cannot be tracked without going through the full wizard, leading to split tracking and paper fallback.

**This PRD defines the multi-source booking system:** a unified booking model with differentiated creation flows that enables all reservation types to coexist in a single view.

**Core Differentiators:**
- **Senior-first UX:** Large buttons (48px+), explicit labels, 2-step quick flow — designed for users approaching 60 with zero technical background
- **One ecosystem:** Quick bookings participate in the same calendar, conflict checking, and future features as direct bookings
- **Progressive complexity:** Start with 2 required fields, enrich to full detail over time
- **Immutable type, data-driven capabilities:** Booking type reflects origin and never changes; available actions depend on data completeness, not type

**Target users:** Christelle (57, sole property manager, primary user on desktop PC) and Jordan (developer, configuration/support).

**North Star:** *"Je veux ouvrir l'appli et voir toute ma saison d'un coup d'oeil, sans avoir à vérifier sur un papier à côté."*

## Success Criteria

### User Success

| Criteria | Target | Measurement |
|----------|--------|-------------|
| **Booking coverage** | 100% of season bookings (all sources) in the app | App bookings vs. actual bookings at end of season |
| **User autonomy** | Christelle creates all bookings independently | Zero support calls for booking creation |
| **Paper abandonment** | No parallel paper-based tracking | Christelle confirms paper retired |
| **Quick booking speed** | Under 60 seconds from "Nouvelle réservation" to confirmation | Observed during first weeks |
| **Quick flow adoption** | All EXTERNAL and PERSONAL bookings created via the quick flow, not the full wizard | Ratio of quick flow vs. full wizard for non-direct bookings |
| **Complete season view** | All bookings visible at a glance with instant source recognition | Colored badges make source obvious without reading details |

### Business Success

| Objective | Target | Timeframe |
|-----------|--------|-----------|
| **Full adoption** | App is the single source of truth for all bookings | End of summer 2026 |
| **Zero double-bookings** | No date conflicts between sources | Ongoing from launch |
| **Feature foundation** | Data model supports future features without migrations | Validated at architecture level |
| **Support elimination** | Zero developer interventions for booking management | End of summer 2026 |

### Technical Success

| Criteria | Target | Vérification |
|----------|--------|--------------|
| **Code quality** | Tous les fichiers nouveaux et modifiés passent `npm run lint`, `npm run format:check` et `npm run typecheck` sans erreur | CI ou exécution manuelle pré-merge |
| **Zero regressions** | Checklist de régression : (1) création réservation directe 6 étapes, (2) modification réservation existante, (3) génération contrat PDF, (4) génération facture PDF, (5) envoi email, (6) calendrier public à jour — tous fonctionnels après déploiement | Test manuel post-déploiement, chaque item coché |
| **Data reliability** | Conflict checking empêche tout chevauchement ; montants stockés en Decimal(10,2) ; dates normalisées à minuit UTC | Test concurrent (10 requêtes simultanées, 1 seule acceptée) + vérification types en base |
| **Scalability** | Review architecture confirme : nouveaux champs accessibles sans migration structurelle ; aucun couplage entre quick booking store et newBookingForm | Revue de code documentée avant merge |
| **Maintainability** | Zéro usage de `any` ; tous les nouveaux DTOs suivent le pattern existant (CreateBookingDto) ; pre-commit hooks passent sur tous les fichiers modifiés | `npm run typecheck` + hooks Husky/lint-staged |

### Measurable Outcomes

**Leading indicators (first month):**
- Christelle creates her first quick booking without assistance
- At least one Abritel booking tracked via quick flow within the first week
- No fallback to paper for any booking type
- Progressive enrichment used at least once on a quick booking

**Lagging indicators (end of season):**
- 100% of season bookings present in the app (DIRECT + EXTERNAL + PERSONAL)
- Zero support interventions from Jordan for booking creation
- Paper tracking system fully retired
- Public availability calendar reflects actual availability at all times

## Product Scope

### Implementation Scope (Single Pass)

All 9 capabilities delivered together as one cohesive release. No phased rollout.

**Justification du périmètre élargi.** Le Product Brief avait initialement reporté trois capacités en v2 : l'enrichissement progressif, le suivi des paiements et le champ notes. Après analyse, ces trois capacités sont intégrées au périmètre unique pour les raisons suivantes :
- **Enrichissement progressif** : c'est le pont fonctionnel entre le quick flow et le direct flow — sans lui, les réservations rapides restent des entrées incomplètes sans possibilité de générer contrats ou factures, ce qui limite fortement la valeur du système unifié.
- **Suivi des paiements** : l'ajout se limite à un enum optionnel (4 valeurs) et un champ sur le formulaire — complexité technique minimale, mais indispensable pour que Christelle puisse suivre l'état financier de ses réservations Abritel sans recourir au papier.
- **Champ notes** : un seul champ texte libre, présent sur tous les types de réservation — coût d'implémentation négligeable, mais élimine le dernier recours au papier pour les annotations.

La livraison en un seul passage évite les coûts d'intégration incrémentale (migrations multiples, tests de compatibilité inter-versions) particulièrement pénalisants pour un développeur solo. Le périmètre reste maîtrisé : aucune de ces trois additions n'implique de nouvelle entité, de nouvel endpoint complexe, ou de refonte d'interface.

**1. Extended Data Model**
- BookingType enum (DIRECT / EXTERNAL / PERSONAL), source, label, externalAmount, notes, paymentStatus, adultsCount
- Existing fields made optional for quick bookings; strict conflict checking for all types

**2. Type Selector at Wizard Step 1**
- Two large visual cards: "Réservation directe" / "Réservation rapide"
- Senior-friendly design (large icons, explicit text)

**3. Quick Booking Flow (2 Steps)**
- Step R1: dates + source (required)
- Step R2: optional fields (name/label, amount, occupants, notes) + recap
- Source auto-determines BookingType

**4. Booking List with Source Badges**
- Colored badges by source category (platforms: blue, personal/family: purple)
- Single chronological list

**5. Lightweight Edit Modal**
- Quick edit for quick booking fields; same validation rules as creation

**6. Conditional Action Buttons**
- Contract/invoice/email buttons appear based on data completeness, not booking type
- Disabled state with explicit message when data insufficient; hidden on cancelled bookings

**7. Progressive Enrichment ("Compléter les informations")**
- Partial pre-filled wizard accessible from quick booking detail
- Unidirectional: enrich only, never downgrade; type remains immutable
- Smart pre-fill: data entered once is never re-entered

**8. Payment Tracking**
- Universal PaymentStatus enum (PENDING / PARTIAL / PAID / FREE)
- Available on all booking types, always optional on quick bookings; contextual display per type

**9. Cross-cutting Notes Field**
- Free text field available on all bookings (quick and direct)

### Build Order

Backend-first: database and API stable before frontend. Each layer validates the previous one.

| Layer | Steps | Content |
|-------|-------|---------|
| **1 — Data Migration** | 1-4 | Prisma schema extension, fields made optional, additive-only migration, production data verification |
| **2 — Backend API** | 5-9 | DTOs, differentiated validation, conflict checking, source-to-type mapping, payment status |
| **3 — Quick Booking Flow** | 10-13 | Pinia store, type selector, R1/R2 steps, source dropdown |
| **4 — Display & List** | 14-16 | Badges, adapted detail page, notes field |
| **5 — Edit & Enrichment** | 17-19 | Edit modal, enrichment wizard, payment status UI |

### Growth Features (Post-Implementation)

| Feature | Rationale |
|---------|-----------|
| **Memorized source suggestions** | Static curated list sufficient initially |
| **Source as filter/analysis dimension** | Requires accumulated season data |

### Vision (Future)

| Feature | Description |
|---------|-------------|
| **Calendar-based booking creation** | Create bookings by selecting dates on a calendar view |
| **Seasonal accounting module** | Revenue aggregation by source, occupancy rates, export for accountant |
| **Smart notifications** | Alerts for upcoming arrivals, pending payments, incomplete bookings |

### Risk Mitigation

**Production Data Migration:**
- One existing booking must survive intact. Strategy: additive-only migration — new columns nullable or with defaults. Existing booking auto-classified as DIRECT. No column removal, no type changes. Validation: post-migration check on all existing endpoints and UI.

**Regression on Direct Booking Flow:**
- The 6-step wizard must remain 100% functional. Strategy: existing `newBookingForm` Pinia store untouched; new quick booking store is separate. Type selector routes to appropriate flow. Validation: manual regression test.

**Schema Optionality:**
- Fields becoming optional could cause null reference errors in existing code. Strategy: audit all code paths reading these fields; add null-safe handling. DIRECT bookings still require full fields via DTO validation. Validation: verify PDF generation with existing data. (See also NFR5, NFR6, NFR10.)

**Solo Developer:**
- Build order structured so each layer is independently testable. If interrupted, any completed layer provides stable foundation.

## User Journeys

### Journey 1: Christelle — Quick Booking from Abritel (Happy Path)

**Opening Scene:** It's a Tuesday morning. Christelle checks her email on the PC and sees a notification from Abritel: a family has booked the house for a week in July. She needs to block those dates immediately so no one else can book them — directly or on another platform.

**Rising Action:** She opens the admin dashboard and clicks "Nouvelle réservation." Two large cards appear: "Réservation directe" and "Réservation rapide." She picks "Rapide" without hesitation — she knows this isn't a direct booking she needs to manage herself. On the first screen, she enters the dates (July 12–19) and selects "Abritel" from the source dropdown. One screen, two fields, done. The second screen offers optional fields: client name, amount received, number of occupants, notes. She types "Famille Martin" and "850€" — information she has from the Abritel email — and skips the rest.

**Climax:** She hits "Valider." The booking appears instantly in the list with a blue "Abritel" badge. She sees it sitting between a direct June booking and a personal August block. For the first time, her entire summer is visible in one place.

**Resolution:** No paper note needed. No risk of forgetting. The dates are blocked across all systems. She closes the laptop with confidence — everything is under control. Total time: 35 seconds.

*Capabilities: FR1-FR6, FR8, FR11, FR14-FR16*

### Journey 2: Christelle — Progressive Enrichment to Contract Generation

**Opening Scene:** Three weeks after creating the quick Abritel booking for Famille Martin, Christelle receives a phone call. It's M. Martin — he wants to book directly for next year and asks about linen options. During the conversation, Christelle realizes she should formalize this year's booking with a proper contract too.

**Rising Action:** She opens the Abritel booking detail page. She sees two distinct buttons: "Modifier" (for quick edits) and "Compléter les informations" (for full enrichment). She clicks "Compléter les informations." A partial wizard opens — the dates (July 12–19) and client name ("Martin") are already pre-filled. She adds the client's full details: address, phone, email. She fills in the pricing section. The fields she already entered are never asked again.

**Climax:** Once client info and pricing are complete, the detail page transforms. The "Générer contrat" button that was previously grayed out with a message "Informations client requises" is now active and clickable. She generates the contract, then sends it by email — all from the same booking that started as a 2-field quick entry.

**Resolution:** The booking is still marked as "EXTERNAL" with its blue Abritel badge — it hasn't changed nature. But it now has all the capabilities of a fully detailed booking. Christelle didn't need to create a new booking or re-enter any data.

*Capabilities: FR9, FR17, FR19-FR21, FR24, FR26-FR27*

### Journey 3: Christelle — Date Conflict on Quick Booking (Edge Case)

**Opening Scene:** Christelle receives another Abritel notification — a booking for July 15–22. She opens the quick booking flow and enters the dates, selects "Abritel."

**Rising Action:** When she validates step R1, the system immediately flags a conflict: "Ces dates chevauchent une réservation existante (Abritel — Famille Martin, 12–19 juillet)." The message is clear, in plain French, with the conflicting booking named explicitly. The dates fields are highlighted but nothing is lost — she can adjust them.

**Climax:** Christelle doesn't panic. She reads the message, understands immediately, and goes back to check her Abritel dashboard to clarify the situation. She realizes the new booking is actually for July 20–27 — she misread the email. She corrects the dates and validates successfully.

**Resolution:** The conflict checking protected her from a double booking. The error message was clear enough that she didn't need to call Jordan. She resolved it on her own in under a minute.

*Capabilities: FR11-FR13*

### Journey 4: Jordan — Configuration, Verification & Troubleshooting

**Opening Scene:** It's early March. Jordan is preparing the app for the upcoming rental season. He needs to verify that seasons and pricing periods are correctly configured for 2026, and check that all existing data is consistent after the multi-source update.

**Rising Action:** Jordan logs into the admin dashboard. He reviews the season configuration (pricing, min nights per season) and copies date periods from 2025 to 2026, adjusting as needed. He then checks the booking list — scanning for any data inconsistencies: bookings without proper dates, orphaned client references, or amounts that don't add up. He spots a quick booking his mother created where she accidentally entered "85" instead of "850" for the amount. He opens the lightweight edit modal and corrects it.

**Climax:** His mother calls — she tried to create a quick booking but "something went wrong." Jordan opens the app, checks recent bookings, and sees no new entry. He walks her through the process on the phone, discovers she had accidentally selected overlapping dates. He explains the conflict message and she successfully creates the booking herself on the second attempt.

**Resolution:** Jordan's role is threefold: seasonal configuration before the season starts, occasional data verification and correction during the season, and rare phone support when Christelle encounters an unfamiliar situation. The goal is for this third role to shrink to zero over time as Christelle gains confidence.

*Capabilities: FR14, FR18, FR23, FR29-FR32*

### Journey-to-FR Traceability

| Journey | Functional Requirements |
|---------|------------------------|
| Quick Booking (Happy Path) | FR1-FR6, FR8, FR11, FR14-FR16 |
| Progressive Enrichment | FR9, FR17, FR19-FR21, FR24, FR26-FR27 |
| Date Conflict (Edge Case) | FR11-FR13 |
| Admin/Developer | FR14, FR18, FR23, FR29-FR32 |

**Coverage:** 30/32 FRs referenced by at least one journey. FR10 (differentiated validation) is a creation-time constraint validated through FR2/FR7. FR22 (payment status) is demonstrated implicitly in Journey 2 (enrichment enables all actions). Primary happy path ✓ · Enrichment path ✓ · Edge case/error recovery ✓ · Admin/developer ✓

## Web App Technical Requirements

### Platform

Brownfield SPA (Vue 3 + Vite) with NestJS backend. Multi-source booking extends the existing admin dashboard — no changes to public site. Desktop-first, Chrome-only, targeting two senior users (late 50s).

| Aspect | Requirement |
|--------|-------------|
| **Browser** | Chrome (latest) only — no cross-browser testing or polyfills |
| **Responsive** | Desktop-first for admin. Existing mobile layout maintained, not a priority for new screens |
| **Performance** | No specific benchmarks (2 users). Standard best practices: <1s transitions, optimized Prisma queries |
| **SEO** | N/A — all features behind authentication |

### Accessibility — Senior-Friendly Design

| Guideline | Requirement |
|-----------|-------------|
| **Click targets** | Minimum 48px height for all interactive elements |
| **Font size** | Minimum 16px base, 14px absolute minimum for secondary text |
| **Contrast** | WCAG AA minimum (4.5:1 text, 3:1 UI components) |
| **Labels** | Explicit French labels on every field — no icon-only buttons, no placeholder-as-label |
| **Feedback** | Visual confirmation after every action. No silent failures |
| **Error messages** | Plain French, naming the problem and conflicting element explicitly |
| **Layout** | Airy spacing, one primary action per screen, clear visual hierarchy |
| **Navigation** | No deep nesting — quick booking flow is 2 steps maximum |

### Implementation Conventions

- Vue 3 Composition API, separate Pinia store for quick bookings (existing `newBookingForm` untouched)
- Tailwind CSS with existing design system colors
- Real-time form validation (not just on submit)
- All UI text in French — hardcoded, no i18n

## Functional Requirements

### Booking Creation

- **FR1:** Admin can choose between "Réservation directe" and "Réservation rapide" at the first step of the booking wizard
- **FR2:** Admin can create a quick booking by providing only dates and a source
- **FR3:** Admin can optionally provide a client name or label, amount received from the platform (externalAmount), number of occupants, adults count (for tourist tax calculation), and free-text notes when creating a quick booking
- **FR4:** Admin can create a quick booking in 2 steps (required fields, then optional fields with recap)
- **FR5:** Admin can select a source from a curated list (Abritel, Airbnb, Booking.com, Personnel, Famille) or enter a custom source via "Autre" — the selected source is stored on the booking as its origin identifier
- **FR6:** System auto-determines BookingType (EXTERNAL or PERSONAL) based on the selected source
- **FR7:** Admin can create a direct booking through the existing 6-step wizard with no changes to the current flow
- **FR8:** Quick bookings have no minimum nights constraint (only validation: end date > start date)
- **FR9:** Each booking has a type (DIRECT, EXTERNAL, or PERSONAL) permanently set at creation — never changes
- **FR10:** Existing fields (primaryClient, secondaryClient, occupantsCount, rentalPrice) are optional for quick bookings but required for direct bookings — differentiated validation by booking type

### Conflict Management

- **FR11:** System checks for date conflicts across all booking types using the same logic
- **FR12:** System displays conflict errors in plain French, explicitly naming the conflicting booking (source + client/label + dates)
- **FR13:** When a conflict is detected, entered data is preserved so admin can correct dates without re-entering other fields

### Booking Display & Navigation

- **FR14:** Admin can view all bookings (direct, external, personal) in a single chronological list
- **FR15:** Each booking displays a colored badge indicating source category (platforms: blue, personal/family: purple, direct: existing style)
- **FR16:** Badges display the source name for instant visual identification
- **FR17:** Admin can view a booking detail page that adapts content based on populated data fields

### Booking Modification

- **FR18:** Admin can edit quick booking fields (dates, source, label/name, amount, occupants, notes) through a modal containing only these editable fields
- **FR19:** Admin can progressively enrich a quick booking with full client details and pricing through a partial pre-filled wizard ("Compléter les informations")
- **FR20:** When enriching, all previously entered data is pre-filled — never requires re-entry
- **FR21:** Enrichment is unidirectional — quick bookings can be enriched but never downgraded
- **FR22:** Admin can set and update payment status (PENDING, PARTIAL, PAID, FREE) on any booking type — always optional on quick bookings
- **FR23:** Admin can add and edit free-text notes on any booking type (quick or direct)

### Document Generation & Actions

- **FR24:** Contract generation enabled only when sufficient data present (complete client info, dates, rental price), regardless of booking type
- **FR25:** Invoice generation enabled only when sufficient data present (complete client info, dates, rental price, and options selection — cleaningIncluded, linenIncluded, touristTaxIncluded), regardless of booking type
- **FR26:** Email sending enabled only when client email address present, regardless of booking type
- **FR27:** Insufficient data: action button displayed in disabled state with explicit message indicating missing data
- **FR28:** Action buttons hidden entirely on cancelled bookings

### Existing System Compatibility

- **FR29:** Existing 6-step direct booking wizard remains fully functional with no behavioral changes
- **FR30:** Existing production bookings automatically classified as DIRECT and continue to function correctly
- **FR31:** Public availability calendar reflects all booking types to show accurate availability
- **FR32:** Existing contract and invoice PDF generation continues to work with direct bookings

## Non-Functional Requirements

### Security

- **NFR1:** All new endpoints require JWT authentication and admin authorization, consistent with existing security
- **NFR2:** Client personal data accessible only to authenticated admin users — no public endpoint exposes client information
- **NFR3:** Strict input validation on all new DTOs — unauthorized fields rejected, expected types enforced — to prevent injection and ensure data integrity
- **NFR4:** externalAmount uses Decimal type with strict validation to prevent financial data corruption

### Data Integrity

- **NFR5:** Database migration is additive-only — no column removal, no type changes, no data loss on existing records
- **NFR6:** Existing production booking remains valid after migration, auto-classified as BookingType.DIRECT
- **NFR7:** Conflict checking is atomic — no race condition can allow overlapping bookings. Verified by concurrent creation test: 10 simultaneous requests for the same dates must result in exactly 1 accepted booking
- **NFR8:** BookingType is immutable after creation — no endpoint or UI action can modify it
- **NFR9:** Source-to-BookingType mapping enforced server-side — frontend cannot send inconsistent combinations
- **NFR10:** All nullable fields introduced by migration handled safely in existing code paths — no null reference errors

### Maintainability

- **NFR11:** New code follows existing conventions: ESLint strict TypeScript, Prettier (semi, single quotes, width 100), Vue 3 Composition API, NestJS modules
- **NFR12:** No `any` type — all new code uses strong, explicit TypeScript typing
- **NFR13:** New Pinia store for quick bookings separate from existing `newBookingForm` — no modification of existing store
- **NFR14:** New backend DTOs use validation decorators consistent with existing DTO patterns (CreateBookingDto, UpdateBookingDto)
- **NFR15:** Pre-commit hooks (Husky + lint-staged) pass on all new and modified files
