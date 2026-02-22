# Story 1.4: Quick Booking Step R1 — Dates & Source with Conflict Checking

Status: done

## Story

As an **admin (property manager)**, I want to fill in dates and source on step 1 of the quick booking wizard with real-time conflict checking, so that I can quickly block dates while seeing immediate feedback on conflicts.

## Acceptance Criteria

1. **StepIndicator display**: Given the admin is on `/admin/nouveau/rapide/1`, when the page loads, then a StepIndicator shows "Etape 1/2 — Dates & source".

2. **Form fields**: Two date pickers (start/end) and a source dropdown are displayed. The source dropdown contains: Abritel, Airbnb, Booking.com, Personnel, Famille, Autre (FR5).

3. **Custom source**: Selecting "Autre" reveals a free text field for custom source name (`sourceCustomName`).

4. **Nights count**: Given valid dates are entered (end > start), when dates change, then a nights count is calculated and displayed.

5. **Real-time conflict checking**: When dates change (both filled and valid), the system checks for conflicts via API (debounced 300ms).

6. **Conflict error display**: Given the conflict check returns a conflict, an inline error in plain French appears below the date fields: "Ces dates chevauchent une reservation existante ({source} — {label/client}, {dates})" (FR12). The "Suivant" button is disabled. All entered data (source selection) is preserved (FR13).

7. **Navigation forward**: Given valid dates with no conflict and a source selected, when the admin clicks "Suivant", the admin is navigated to `/admin/nouveau/rapide/2`.

8. **Separate Pinia store**: The `quickBookingForm` store is a separate store from `newBookingForm` — zero imports or shared code (NFR13). State: `currentStep`, `source`, `sourceCustomName`, `startDate`, `endDate` + optional fields from Step 2. Getters: `nightsCount`, `isStep1Valid`, `sourceDisplayName`. Action: `reset()`.

## Tasks / Subtasks

- [x] Task 1: Create `quickBookingForm` Pinia store (AC: #8)
  - [x] 1.1 Create `apps/web/src/stores/quickBookingForm.ts`
  - [x] 1.2 Define state interface with `currentStep`, `source`, `sourceCustomName`, `startDate`, `endDate`, plus optional Step 2 fields (`label`, `externalAmount`, `occupantsCount`, `adultsCount`, `notes`)
  - [x] 1.3 Implement `nightsCount` getter (same logic as `newBookingForm` but independent code — no imports)
  - [x] 1.4 Implement `isStep1Valid` getter: both dates filled, end > start, source selected, no conflict, and if source === OTHER then sourceCustomName must be non-empty
  - [x] 1.5 Implement `sourceDisplayName` getter mapping enum values to French labels
  - [x] 1.6 Implement `reset()` action restoring initial state
- [x] Task 2: Add detailed conflict check endpoint + frontend API (AC: #5, #6)
  - [x] 2.1 Modify `POST /bookings/check-conflicts` in `bookings.controller.ts` to return `ConflictDetail | null` alongside existing `hasConflict` and `minNightsRequired`
  - [x] 2.2 Update `ConflictCheckResult` in `bookings.service.ts` to include `conflictDetail?: { id, source, label, startDate, endDate }`
  - [x] 2.3 Update `checkConflictsWithMinNights()` to call `checkConflictsDetailed()` and map result
  - [x] 2.4 Update frontend `ConflictCheckResult` interface in `api.ts` to include `conflictDetail?: ConflictDetail`
- [x] Task 3: Create StepIndicator component (AC: #1)
  - [x] 3.1 Create `apps/web/src/components/admin/StepIndicator.vue`
  - [x] 3.2 Props: `currentStep: number`, `totalSteps: number`, `label: string`
  - [x] 3.3 Renders text: "Etape {currentStep}/{totalSteps} — {label}" with appropriate styling (text-sm text-gray-500, uppercase tracking)
- [x] Task 4: Implement QuickBookingStep1.vue (AC: #1-#7)
  - [x] 4.1 Replace placeholder content in `apps/web/src/views/admin/QuickBookingStep1.vue`
  - [x] 4.2 Add StepIndicator component showing "Etape 1/2 — Dates & source"
  - [x] 4.3 Add two `<input type="date">` fields for startDate and endDate with min 48px height, 16px text
  - [x] 4.4 Add source `<select>` dropdown with French labels: Abritel, Airbnb, Booking.com, Personnel, Famille, Autre
  - [x] 4.5 Conditionally show `sourceCustomName` text input when source === 'OTHER'
  - [x] 4.6 Display computed `nightsCount` below date fields when > 0 (e.g. "3 nuits")
  - [x] 4.7 Implement debounced conflict check (300ms) using `watch` on startDate+endDate
  - [x] 4.8 Display inline conflict error in French below dates using red text and preserving data
  - [x] 4.9 Add "Suivant" button (primary style, min 48px height) — disabled when `!isStep1Valid` or conflict detected or checking in progress
  - [x] 4.10 Add "Retour" link to `/admin/nouveau`
  - [x] 4.11 On "Suivant" click, navigate to `/admin/nouveau/rapide/2`
- [x] Task 5: Add route for Step 2 placeholder (AC: #7)
  - [x] 5.1 Create `apps/web/src/views/admin/QuickBookingStep2.vue` placeholder stub (same pattern as Story 1.3 Step 1 placeholder)
  - [x] 5.2 Add route `/admin/nouveau/rapide/2` in `apps/web/src/router/index.ts`

## Dev Notes

### Architecture Decisions (MUST follow)

- **D6 — Separate Pinia store**: `quickBookingForm` store must have ZERO coupling with `newBookingForm`. No shared imports, no shared code, no shared utility functions. Duplicate logic if needed. This is architectural requirement NFR13.
- **D7 — Route-based steps**: Navigation between steps uses Vue Router (`router.push`), not internal step counter. Browser back button must work.
- **D3 — Conflict checking**: Backend `checkConflictsDetailed()` already exists in `bookings.service.ts:331-350`. It queries the first conflicting booking with full relations. Reuse this for the enhanced check-conflicts endpoint.

### Existing Code to Reuse

- **Backend `checkConflictsDetailed()`**: Already implemented at `bookings.service.ts:331-350` — returns `BookingWithRelations | null` with the first conflicting booking. Wire this into the existing `check-conflicts` endpoint.
- **Backend `ConflictCheckResult` interface**: At `bookings.service.ts:27-30` — extend with optional `conflictDetail`.
- **Frontend `ConflictDetail` interface**: Already defined at `api.ts:208-214` — reuse as-is.
- **Frontend `ConflictCheckResult` interface**: At `api.ts:228-231` — extend to include `conflictDetail?: ConflictDetail`.
- **Frontend `bookingsApi.checkConflicts()`**: At `api.ts:348-359` — no changes needed (return type auto-updates).
- **TypeSelectorRow component pattern**: At `components/admin/TypeSelectorRow.vue` — reference for consistent styling (rounded-xl, border-2, min-height 72px, Tailwind patterns).

### DO NOT Touch

- `apps/web/src/stores/newBookingForm.ts` — zero modifications (NFR13)
- Existing `POST /bookings/quick` endpoint — already complete from Story 1.2
- Existing `POST /bookings/check-conflicts` controller route signature — only modify return body

### Source Dropdown Mapping

| Display Label | Enum Value | BookingType |
|---------------|-----------|-------------|
| Abritel | `ABRITEL` | EXTERNAL |
| Airbnb | `AIRBNB` | EXTERNAL |
| Booking.com | `BOOKING_COM` | EXTERNAL |
| Personnel | `PERSONNEL` | PERSONAL |
| Famille | `FAMILLE` | PERSONAL |
| Autre | `OTHER` | EXTERNAL |

### Debounce Implementation

Use a manual `setTimeout`/`clearTimeout` pattern inside a Vue `watch` (do NOT add lodash/debounce dependency). Watch both `startDate` and `endDate` from the store. Only trigger API call when both dates are filled and end > start.

```typescript
// Pattern:
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch([() => store.startDate, () => store.endDate], () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  // reset conflict state immediately
  if (!store.startDate || !store.endDate) return;
  debounceTimer = setTimeout(async () => {
    // call checkConflicts API
  }, 300);
});
```

### Conflict Error Message Format

Build the error message from `ConflictDetail`:
```
"Ces dates chevauchent une reservation existante ({sourceLabel} — {label || clientName}, {startDate} - {endDate})"
```
- `sourceLabel`: Map `ConflictDetail.source` enum to French display name (same mapping as dropdown)
- `label || clientName`: Use label if present, otherwise use primaryClient name from the conflicting booking (if available), otherwise omit
- Dates formatted with `formatDateShort()` from `utils/formatting.ts`

### Styling Requirements (WCAG AA + Senior-first)

- Min 48px click targets on all interactive elements
- Min 16px body text, 14px for secondary text
- Use existing Tailwind design system colors: `primary` (#FF385C), `dark` (#222222), `text` (#484848)
- Card-based layout: `rounded-xl`, `border`, white background
- Error text: `text-red-600`, `text-sm`, displayed inline below date fields
- Loading state: Show "Verification..." text or subtle spinner during conflict check
- Preserve all entered data on conflict (source, dates remain filled)

### Project Structure Notes

New files (3):
```
apps/web/src/stores/quickBookingForm.ts        # New Pinia store
apps/web/src/components/admin/StepIndicator.vue # New reusable component
apps/web/src/views/admin/QuickBookingStep2.vue  # Placeholder stub
```

Modified files (3):
```
apps/web/src/views/admin/QuickBookingStep1.vue  # Replace placeholder with full implementation
apps/web/src/router/index.ts                    # Add Step 2 route
apps/api/src/bookings/bookings.controller.ts    # Enhance check-conflicts return
apps/api/src/bookings/bookings.service.ts       # Extend ConflictCheckResult
apps/web/src/lib/api.ts                         # Extend ConflictCheckResult interface
```

### TypeScript Constraints

- No `any` types (NFR12)
- Explicit return types on all functions
- Use `BookingSource` type from `api.ts` for source values
- Use nullish coalescing `??` for defaults
- Use optional chaining `?.` for nullable access

### Testing Checklist

- [ ] Date pickers accept and store valid dates
- [ ] Nights count displays correctly
- [ ] Source dropdown shows all 6 options
- [ ] Selecting "Autre" shows custom source field
- [ ] Conflict check fires 300ms after last date change
- [ ] Conflict error displays in French with booking details
- [ ] "Suivant" disabled during conflict or missing fields
- [ ] "Suivant" navigates to `/admin/nouveau/rapide/2`
- [ ] Browser back from Step 2 returns to Step 1 with data preserved
- [ ] Store is completely independent from `newBookingForm`
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.4]
- [Source: _bmad-output/planning-artifacts/prd.md — FR5, FR8, FR12, FR13]
- [Source: _bmad-output/planning-artifacts/architecture.md — D3, D6, D7]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — StepIndicator, Direction B, Accessibility]
- [Source: apps/api/src/bookings/bookings.service.ts — checkConflictsDetailed():331-350]
- [Source: apps/web/src/lib/api.ts — ConflictDetail:208-214, ConflictCheckResult:228-231]
- [Source: apps/web/src/stores/newBookingForm.ts — Reference for nightsCount pattern (DO NOT import)]

## Previous Story Intelligence

### From Story 1.1 (Data Model)
- Prisma enums `BookingType`, `BookingSource`, `PaymentStatus` are defined and migrated
- Booking model extended with nullable fields (`occupantsCount`, `rentalPrice`)
- Null-safety guards added across backend (use `?? 0`, `?? '-'`, `?? 1`)

### From Story 1.2 (Backend API)
- `POST /bookings/quick` endpoint is live with `JwtAuthGuard + AdminGuard`
- `checkConflictsDetailed()` method exists but has no dedicated route
- `CreateQuickBookingDto` validates `sourceCustomName` conditionally when `source === OTHER`
- `createQuick()` uses `$transaction()` for atomic conflict check + create
- 409 response already returns `conflictingBooking` object from `createQuick`

### From Story 1.3 (Type Selector)
- Route `/admin/nouveau/rapide/1` exists, pointing to `QuickBookingStep1.vue` placeholder
- `TypeSelectorRow.vue` pattern: rounded-xl, border-2, min-height 72px, icon slot, chevron
- Routes are flat children of `/admin` (not nested under nouveau)
- Lazy loading pattern: `const Component = () => import('...')`

### Key Learnings
- Route order matters in NestJS controllers (specific routes before parameterized)
- Always use `withDefaults(defineProps<...>())` for Vue component defaults
- All French labels, no icon-only buttons
- Build verification: `npm run typecheck && npm run lint && npm run build`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Lint fix: removed unnecessary `??` operator in `sourceDisplayName` getter (ESLint `@typescript-eslint/no-unnecessary-condition`)
- `typecheck:web` command has pre-existing config issue (`-p` flag with `-b`), not related to story changes

### Completion Notes List

- Task 1: Created independent `quickBookingForm` Pinia store with zero coupling to `newBookingForm`. State includes Step 1 (dates, source) and Step 2 optional fields. Getters: `nightsCount`, `isStep1Valid`, `sourceDisplayName`. Action: `reset()`. Exported `SOURCE_LABELS` map for reuse.
- Task 2: Extended `ConflictCheckResult` backend interface with `ConflictDetail` (id, source, label, startDate, endDate). Updated `checkConflictsWithMinNights()` to call `checkConflictsDetailed()` and map the conflicting booking into the detail. Frontend `ConflictCheckResult` interface also extended.
- Task 3: Created reusable `StepIndicator.vue` component with `currentStep`, `totalSteps`, `label` props. Styled with `text-sm uppercase tracking-wide text-gray-500`.
- Task 4: Full implementation of `QuickBookingStep1.vue` — StepIndicator, date pickers (48px height), source dropdown (6 French-labelled options), conditional `sourceCustomName` field, nights count display, debounced conflict check (300ms via manual setTimeout), French inline error message, "Suivant" button with disabled logic (invalid/conflict/checking), "Retour" link. All data preserved on conflict.
- Task 5: Created `QuickBookingStep2.vue` placeholder stub with back link to Step 1. Added route `/admin/nouveau/rapide/2` with lazy loading.
- Validation: lint 0 errors, typecheck:api OK, build:web + build:api OK.

### Change Log

- 2026-02-22: Implemented Story 1.4 — Quick Booking Step R1 (Dates & Source with Conflict Checking). 3 new files, 4 modified files. All 5 tasks completed.
- 2026-02-22: Code review fixes — [C1] Fixed isCheckingConflict stuck bug (reset flag before early returns + onUnmounted cleanup). [H1] Added clientName fallback in ConflictDetail (backend + frontend) so DIRECT booking conflicts show primary client name. [L1] Added debounce timer cleanup on component unmount.

### File List

New files:
- apps/web/src/stores/quickBookingForm.ts
- apps/web/src/components/admin/StepIndicator.vue
- apps/web/src/views/admin/QuickBookingStep2.vue

Modified files:
- apps/web/src/views/admin/QuickBookingStep1.vue
- apps/web/src/router/index.ts
- apps/api/src/bookings/bookings.controller.ts
- apps/api/src/bookings/bookings.service.ts
- apps/web/src/lib/api.ts
