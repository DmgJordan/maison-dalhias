---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflow_completed: true
inputDocuments:
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-11.md'
  - '_bmad-output/brainstorming/brainstorming-session-2026-02-19.md'
  - '_bmad-output/implementation-artifacts/tech-spec-admin-email-documents.md'
date: 2026-02-20
author: Jordan
---

# Product Brief: maison-dalhias

## Executive Summary

Maison Dalhias is a purpose-built vacation rental management application for a single property (Maison Dalhias 19, Domaine du Rouret, Grospierres, Ardèche). It replaces a fragmented ecosystem of paper-based tracking, manually edited Word contracts, a paid third-party invoicing service, and disconnected computer folders with a single centralized platform.

The application already handles the core value proposition: direct booking management with automated contract and invoice generation, and one-click document emailing to clients. However, approximately 50% of bookings come from external platforms (primarily Abritel), and these cannot currently be tracked in the application without going through the full 6-step booking wizard — a process that is disproportionately complex for simply blocking dates.

This product brief defines the **multi-source booking system**: a quick booking flow that enables all reservation types (platform bookings, personal/family blocks) to be tracked alongside direct bookings in a single unified view. Without this capability, adoption remains partial and the application fails to deliver its central promise — one place for everything.

Target users are seniors (60+), the developer's parents, who are non-technical and manage the property from a desktop PC.

---

## Core Vision

### Problem Statement

Property owners managing a vacation rental currently lack a unified system to track all bookings regardless of source. The existing application requires a complete 6-step wizard (dates, client details, occupants, options, pricing, summary) for every booking entry. When a reservation arrives from Abritel or dates need to be blocked for family use, this level of detail creates unnecessary friction — leading owners to skip the app entirely and fall back to paper-based tracking for roughly half their bookings.

### Problem Impact

- **Split tracking**: Half the bookings live in the app, half on paper — the planning view never reflects reality
- **Double-booking risk**: Without all reservations in one system, date conflicts become invisible
- **Adoption failure**: If the app doesn't cover all use cases, users revert to old habits entirely
- **Lost value**: The contract/invoice generation and email features (already built) become inaccessible for external bookings that could eventually be enriched with full client details

### Why Existing Solutions Fall Short

The current application treats all bookings identically — every reservation requires full client information, pricing details, and options. This one-size-fits-all approach works perfectly for direct bookings where the owner handles the complete process, but fails for two common scenarios:

1. **Platform bookings (Abritel)**: The platform handles client relations and payments. The owner simply needs to block the dates and optionally note the source and amount received.
2. **Personal/family blocks**: No client, no pricing, no contract needed. Just dates blocked on the calendar.

No alternative tool exists that combines vacation rental document management (contracts, invoices, email sending) with a flexible multi-source booking system tailored for senior users.

### Proposed Solution

A **unified booking model** with differentiated creation flows:

- **Single Booking entity** extended with a `BookingType` (DIRECT / EXTERNAL / PERSONAL) and a `source` field
- **Quick booking flow**: 2 steps instead of 6 — dates + source (required), then optional fields (name, amount, notes)
- **Progressive enrichment**: Quick bookings can be enriched with full details at any time via a "Compléter les informations" action, unlocking contract/invoice generation
- **Unified calendar and list**: All booking types appear together, distinguished by colored source badges for instant visual recognition
- **Immutable type, data-driven capabilities**: The booking type reflects its origin and never changes; available actions (contract, invoice, email) depend on what data has been filled in, not on the type

### Key Differentiators

1. **Senior-first UX**: Large buttons (48px+), explicit labels, maximum 2 steps for quick bookings, persistent feedback — designed for users aged 60+ with zero technical background
2. **One ecosystem, no second-class citizens**: Quick bookings participate in the same calendar, same conflict checking, same future features (payment tracking, accounting) as direct bookings
3. **Progressive complexity**: Start with 2 required fields, enrich to full detail over time — the system adapts to the information available rather than demanding it upfront
4. **Purpose-built for single-property owners**: Not a generic PMS — every design decision optimizes for a specific property managed by its owners, not a portfolio managed by professionals

---

## Target Users

### Primary Users

#### Persona: Christelle — Property Manager

- **Age:** 57 (born 1969)
- **Role:** Sole manager of the vacation rental. Handles all bookings, client communication, contracts, invoices, and calendar management.
- **Technical proficiency:** Comfortable with everyday digital tools (social media, email, Amazon, Leboncoin) but no technical background. Uses a smartphone daily for basic apps. Admin dashboard used primarily on desktop PC.
- **Motivations:** Keep everything organized in one place. Reduce the mental load of managing bookings from multiple sources. Avoid double-bookings. Feel confident that nothing slips through the cracks.
- **Frustrations (before the app):** Managing contracts manually in Word, paying for a third-party invoicing service, paper-based tracking disconnected from digital records, no single view of the full booking calendar.
- **Frustrations (current, without multi-source):** When an Abritel booking arrives by email, the only way to record it is through the full 6-step wizard — too heavy for just blocking dates. Result: these bookings stay on paper, and the app never shows the complete picture.
- **Success moment:** Opening the app and seeing every booking — direct, Abritel, family — on one screen, with colored badges making the source immediately obvious. No paper backup needed.
- **Quote:** "Je veux ouvrir l'appli et voir toute ma saison d'un coup d'oeil, sans avoir à vérifier sur un papier à côté."

### Secondary Users

#### Persona: Jordan — Developer & Technical Support

- **Role:** Son of Christelle and Juan. Built and maintains the application. Not a daily admin user but provides setup, troubleshooting, and feature development.
- **Interaction:** Configures seasons and pricing, assists with edge cases, monitors that the system works correctly. Occasionally creates bookings on behalf of his parents during onboarding.
- **Relevance to multi-source:** Jordan needs the feature to be simple enough that his parents can use it autonomously — reducing his own support burden. Every friction point in the UI becomes a phone call.

#### Public Visitors (Out of Scope)

- **Who:** Potential renters discovering the property via the public-facing website, accessible through a QR code on a promotional poster.
- **Interaction:** View property information, photos, pricing, availability calendar, and contact form. No admin access.
- **Relevance to multi-source:** None directly — but the public availability calendar must reflect ALL bookings (including quick bookings) to show accurate availability.

### User Journey — Christelle and the Quick Booking Flow

| Stage | Experience |
|-------|-----------|
| **Trigger** | Christelle receives an email from Abritel notifying her of a new booking, or decides to block dates for family visiting. |
| **Entry** | She opens the admin dashboard on her PC and clicks "Nouvelle réservation." |
| **Choice** | At step 1, she sees two large visual cards: "Réservation directe" and "Réservation rapide." She picks "Rapide." |
| **Quick flow — Step R1** | She enters the dates and selects "Abritel" from the source dropdown (or "Famille" for a personal block). Two fields, one screen. |
| **Quick flow — Step R2** | Optional fields appear: client name, amount received, number of occupants, notes. She fills in what she has — or skips everything and validates. |
| **Confirmation** | The booking appears immediately in the list with a blue "Abritel" badge (or purple "Famille" badge). Dates are blocked. Done in under 30 seconds. |
| **Aha! moment** | She opens the booking list and sees direct bookings AND Abritel bookings side by side, sorted by date. For the first time, the app shows her complete season at a glance. |
| **Later enrichment** | A week later, the Abritel client calls directly to ask about linen options. Christelle opens the quick booking, clicks "Compléter les informations," adds client details, and can now generate a contract if needed. |
| **Long-term value** | By mid-season, every booking is in the app. Paper tracking is abandoned. The planning view is the single source of truth. |

---

## Success Metrics

### User Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Booking coverage** | 100% of season bookings (all sources) registered in the app | Count of app bookings vs. actual bookings at end of season |
| **User autonomy** | Christelle creates all bookings independently, without developer assistance | Zero support calls related to booking creation |
| **Paper abandonment** | No parallel paper-based tracking system in use | Christelle confirms paper is no longer needed |
| **Quick booking adoption** | External/personal bookings created via the quick flow, not the full wizard | Ratio of EXTERNAL+PERSONAL bookings using quick flow vs. full wizard |
| **Time to create a quick booking** | Under 60 seconds from "Nouvelle réservation" to confirmation | Observed during first weeks of use |

### Business Objectives

| Objective | Description | Timeframe |
|-----------|-------------|-----------|
| **Full adoption** | The app becomes the single source of truth for all property bookings — direct, platform, and personal | End of first full season (summer 2026) |
| **Zero double-bookings** | No date conflicts between bookings from different sources thanks to unified conflict checking | Ongoing from feature launch |
| **Feature foundation** | Multi-source data model enables future features (payment tracking, seasonal accounting) without additional migrations | Validated at architecture level |

### Key Performance Indicators

**Leading indicators (first month):**
- Christelle creates her first quick booking without assistance
- At least one Abritel booking is tracked via quick flow within the first week of a new reservation
- No fallback to paper for any booking type

**Lagging indicators (end of season):**
- 100% of season bookings present in the app (DIRECT + EXTERNAL + PERSONAL)
- Zero support interventions from Jordan for booking creation
- Paper tracking system fully retired
- Public availability calendar reflects actual availability at all times

---

## MVP Scope

### Core Features

**1. Extended Data Model**
- BookingType enum (DIRECT / EXTERNAL / PERSONAL) on the Booking entity
- Source field (string: "Abritel", "Airbnb", "Booking.com", "Personnel", "Famille", etc.)
- Label field (optional alternative identifier when no client name)
- ExternalAmount field (optional amount received from platform)
- Existing fields (primaryClientId, occupantsCount, rentalPrice) made optional for quick bookings
- adultsCount field added (tech debt fix, needed for tourist tax on direct bookings)
- Strict conflict checking applied uniformly to all booking types

**2. Type Selector at Wizard Step 1**
- Two large visual cards at the existing wizard's first step: "Réservation directe" and "Réservation rapide"
- Selecting "Directe" continues the existing 6-step wizard unchanged
- Selecting "Rapide" enters the 2-step quick flow
- Senior-friendly design: large icons, explicit text, impossible to miss

**3. Quick Booking Flow (2 Steps)**
- **Step R1 (required):** Date selection + source dropdown with common sources (Abritel, Airbnb, Booking.com, Personnel, Famille) and "Autre" with free text input
- **Step R2 (optional + recap):** Client name or label, amount received, occupants count, notes — all optional. Recap of what will be created. Validate button.
- No minimum nights constraint (only validation: end date > start date)
- Source auto-determines BookingType (platform sources → EXTERNAL, personal sources → PERSONAL)

**4. Booking List with Source Badges**
- All booking types in a single chronological list (existing behavior extended)
- Colored badges by source category: platforms (blue), personal/family (purple), direct (existing style)
- Badge displays source name for instant visual recognition

**5. Lightweight Edit Modal for Quick Bookings**
- "Modifier" button on quick booking detail opens a lightweight modal
- Editable fields: dates, source, label/client name, amount, occupants, notes
- Same validation rules as creation (conflict checking, end > start)
- Quick edit stays quick — no wizard, no complexity escalation

**6. Conditional Action Buttons on Booking Detail**
- "Générer contrat", "Générer facture", "Envoyer par email" buttons appear only when sufficient data is present, regardless of booking type
- Required data for contract: complete client info (name, address, phone, email), dates, rental price
- Required data for invoice: client info, dates, rental price, pricing details
- Required data for email: client email address
- Disabled state with explicit message when data is insufficient (e.g., "Informations client requises pour générer le contrat")
- CANCELLED bookings: action buttons hidden entirely (consistent with existing email system behavior)

### Out of Scope for MVP

| Feature | Rationale | Target |
|---------|-----------|--------|
| **"Compléter les informations" wizard** | Progressive enrichment via partial pre-filled wizard. The lightweight edit modal covers basic modifications. Full enrichment can wait for v2 after validating the core flow. | v2 |
| **Payment statuses** | Optional PaymentStatus enum (PENDING/PARTIAL/PAID/FREE). Useful but not essential for the core problem of tracking all bookings. | v2 |
| **Cross-cutting notes field** | Text field on all bookings. Minor addition that can be added independently without affecting the core architecture. | v2 |
| **Source as analysis/filter dimension** | Filtering and aggregation by source for accounting insights. Depends on having enough data accumulated over a season. | v2+ |
| **Memorized source suggestions** | System remembering custom sources entered via "Autre". A static curated list is sufficient for MVP. | v2 |
| **Calendar-based booking creation** | Creating bookings by selecting dates directly on a calendar view. Deferred to future calendar module. | Future |

### MVP Success Criteria

| Criteria | Validation |
|----------|------------|
| Christelle creates a quick Abritel booking in under 60 seconds without help | Observed during first use |
| All booking types appear in a single list with clear visual distinction | Visual verification |
| Quick bookings block dates and prevent conflicts with all other booking types | Tested with overlapping date scenarios |
| Existing direct booking flow is completely unaffected | Regression check on 6-step wizard |
| Conditional action buttons correctly reflect available data | Tested with varying data completeness levels |
| Lightweight edit modal allows modifying quick booking fields | Tested edit → save → verify cycle |

### Future Vision

**v2 — Progressive Enrichment:**
- "Compléter les informations" button on quick bookings opening a partial, pre-filled wizard
- Unidirectional evolution: quick bookings can be enriched to full detail, never downgraded
- Smart pre-fill: data entered during quick creation is never re-entered
- Enrichment unlocks contract/invoice generation naturally via conditional buttons (already in MVP)

**v2 — Payment Tracking:**
- Universal PaymentStatus enum (PENDING / PARTIAL / PAID / FREE)
- Available on all booking types, always optional on quick bookings
- Contextual display: DIRECT shows deposit/balance flow, EXTERNAL shows platform payout, PERSONAL shows paid/free

**v3 — Seasonal Accounting:**
- Source as a filter and aggregation dimension ("Revenus Abritel 2026", "Revenus directs Q3")
- Season-level financial overview: total revenue by source, occupancy rate, average booking value
- Export capabilities for accountant handoff
