# Story 1.5: Quick Booking Step R2 — Optional Details, Submission & Success

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **admin (property manager)**,
I want to optionally add details and confirm my quick booking,
so that it's created in the system immediately with a clear success confirmation.

## Acceptance Criteria

1. **RecapBanner on R2**: Given the admin is on `/admin/nouveau/rapide/2`, when the page loads, then a RecapBanner displays the R1 data: SourceBadge + dates + nights count + "Modifier" link back to R1.

2. **StepIndicator on R2**: A StepIndicator shows "Étape 2/2 — Détails optionnels".

3. **Optional fields display**: Optional fields are displayed with "Facultatif" labels: label/client name (text), external amount in € (number), occupants count (number), adults count (number), notes (textarea) (FR3).

4. **InfoBubble**: A dismissible InfoBubble says "Ces informations sont facultatives. Vous pourrez compléter plus tard..." — stored in localStorage so it doesn't reappear after dismissal.

5. **RecapBanner "Modifier" link**: Given the admin clicks "Modifier" on the RecapBanner, when navigation occurs, then the admin returns to R1 with all R2 data preserved in the store.

6. **Submission with loading state**: Given the admin clicks "Créer la réservation" (with or without optional fields), when the form submits, then the primary button shows a loading spinner + "En cours..." and is disabled. A POST request is sent to `/api/bookings/quick`.

7. **Success screen**: Given the API returns success, when the SuccessScreen renders at `/admin/nouveau/rapide/succes`, then a centered confirmation displays: checkmark icon + "Réservation créée !" + booking summary (SourceBadge + dates + label if provided) (FR4). Two buttons: "Retour aux réservations" (→ list) and "Voir la réservation" (→ detail). The screen persists until user clicks an action — no auto-dismiss.

8. **Error handling**: Given the API returns an error, when the error is handled, then an error toast appears: "Erreur lors de la création. Veuillez réessayer." All form data is preserved — nothing is lost.

9. **Store reset on success**: After successful creation, navigating to the success screen, the store is reset (via `reset()`) to clear state for the next booking.

## Tasks / Subtasks

- [x] Task 1: Create RecapBanner component (AC: #1, #5)
  - [x] 1.1 Create `apps/web/src/components/admin/RecapBanner.vue`
  - [x] 1.2 Props: `source: string`, `bookingType: BookingType`, `startDate: string`, `endDate: string`, `nightsCount: number`
  - [x] 1.3 Emits: `edit()` — navigates back to R1
  - [x] 1.4 Layout: `bg-gray-50 rounded-xl p-4` — horizontal flex: SourceBadge (import from future story or create inline styled span) + dates text + nights count | "Modifier" link (`text-primary`, right-aligned)
  - [x] 1.5 Use `formatDateShort()` from `utils/formatting.ts` for date display

- [x] Task 2: Create InfoBubble component (AC: #4)
  - [x] 2.1 Create `apps/web/src/components/admin/InfoBubble.vue`
  - [x] 2.2 Props: `message: string`, `dismissKey: string`
  - [x] 2.3 On mount, check `localStorage.getItem(dismissKey)` — if truthy, don't render
  - [x] 2.4 On dismiss (X click), set `localStorage.setItem(dismissKey, 'true')` and hide
  - [x] 2.5 Style: `bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700` — lightbulb emoji + message + small X close button

- [x] Task 3: Create SuccessScreen component (AC: #7)
  - [x] 3.1 Create `apps/web/src/components/admin/SuccessScreen.vue`
  - [x] 3.2 Props: `title: string`, `bookingId: string`, `source: string`, `bookingType: BookingType`, `startDate: string`, `endDate: string`, `nightsCount: number`, `label: string | null`
  - [x] 3.3 Emits: `viewBooking()`, `backToList()`
  - [x] 3.4 Layout: centered content — checkmark icon (64px, `bg-green-100 text-green-600` circle) + title (`text-xl font-bold`) + booking summary (`bg-gray-50 rounded-xl p-4` with inline source badge + dates + label) + two buttons (secondary: "Retour aux réservations", primary: "Voir la réservation")
  - [x] 3.5 Compact Direction B layout per UX spec

- [x] Task 4: Create SourceBadge component (AC: #1, #7)
  - [x] 4.1 Create `apps/web/src/components/admin/SourceBadge.vue`
  - [x] 4.2 Props: `source: string`, `bookingType: BookingType`, `size?: 'sm' | 'md'` (default 'sm')
  - [x] 4.3 Color mapping: EXTERNAL → `bg-blue-100 text-blue-800`, PERSONAL → `bg-purple-100 text-purple-800`, DIRECT → `bg-rose-50 text-rose-700`
  - [x] 4.4 Display name mapping: use SOURCE_LABELS from quickBookingForm store or replicate inline — "Abritel", "Airbnb", "Booking.com", "Personnel", "Famille", custom for OTHER, "Direct" for DIRECT
  - [x] 4.5 Anatomy: `<span>` pill — `px-2 py-0.5 rounded-full text-xs font-medium` (sm) or `px-2.5 py-1 rounded-full text-sm font-medium` (md)

- [x] Task 5: Implement QuickBookingStep2.vue (AC: #1-#6, #8)
  - [x] 5.1 Replace placeholder content in `apps/web/src/views/admin/QuickBookingStep2.vue`
  - [x] 5.2 Add StepIndicator showing "Étape 2/2 — Détails optionnels"
  - [x] 5.3 Add RecapBanner with store data (source, dates, nightsCount) and `@edit` navigating to Step 1
  - [x] 5.4 Add InfoBubble with message "Ces informations sont facultatives. Vous pourrez compléter plus tard..." and dismissKey "quickBookingInfoDismissed"
  - [x] 5.5 Add form fields: label (text, "Nom / Label — Facultatif"), externalAmount (number, "Montant reçu (€) — Facultatif"), occupantsCount (number 1-6, "Nombre d'occupants — Facultatif"), adultsCount (number 1-6, "Nombre d'adultes"), notes (textarea, "Notes — Facultatif")
  - [x] 5.6 All fields v-model bound to quickBookingForm store state
  - [x] 5.7 Add "Créer la réservation" primary button with loading state (`isSubmitting` ref, spinner + "En cours..." text, disabled while submitting)
  - [x] 5.8 On submit: call `bookingsApi.createQuick()` with store data, on success navigate to success route with booking data in route state/query, on error show error message and preserve data
  - [x] 5.9 Add "← Retour" link to Step 1 (preserves all data via store)
  - [x] 5.10 48px min height on all inputs, 16px text, Tailwind styling consistent with Step 1

- [x] Task 6: Add success route and QuickBookingSuccess view (AC: #7, #9)
  - [x] 6.1 Create `apps/web/src/views/admin/QuickBookingSuccess.vue` — wraps SuccessScreen component, reads booking data from route state or store
  - [x] 6.2 On `viewBooking()`: navigate to `AdminBookingDetail` with booking ID
  - [x] 6.3 On `backToList()`: navigate to `AdminBookings`
  - [x] 6.4 Call `store.reset()` on mount (store data already captured for success screen display)
  - [x] 6.5 Add route `/admin/nouveau/rapide/succes` as `AdminQuickBookingSuccess` in router
  - [x] 6.6 Add lazy-loaded import for `QuickBookingSuccess` in router

- [x] Task 7: Guard and edge cases (AC: #5, #8, #9)
  - [x] 7.1 If user navigates to Step 2 without Step 1 data (store empty), redirect to Step 1
  - [x] 7.2 If user navigates to success route without booking data, redirect to booking list
  - [x] 7.3 Build `CreateQuickBookingData` payload from store: include `source` (required), omit empty optional fields (don't send empty strings or null values as the API has validation)

## Dev Notes

### Architecture Decisions (MUST follow)

- **D6 — Separate Pinia store**: `quickBookingForm` store already exists with Step 2 fields (`label`, `externalAmount`, `occupantsCount`, `adultsCount`, `notes`). Use these directly — NO modifications to the store interface needed.
- **D7 — Route-based steps**: Continue the route-based step pattern. Success screen is a new route `/admin/nouveau/rapide/succes`, not a modal or inline state.
- **Direction B — Compact & Efficient**: Follow the UX spec's Direction B. Inline recap banner (RecapBanner), compact success screen (SuccessScreen), dismissible info bubble (InfoBubble from Direction C adopted into B).

### Existing Code to Reuse

- **`quickBookingForm` Pinia store** (`stores/quickBookingForm.ts`): Already has all Step 2 state fields, `nightsCount` getter, `sourceDisplayName` getter, and `reset()` action. Use directly.
- **`bookingsApi.createQuick()`** (`lib/api.ts:344-347`): Already implemented — takes `CreateQuickBookingData`, returns `Booking`. Call directly from the view.
- **`CreateQuickBookingData` interface** (`lib/api.ts:216-226`): Already typed. Map store state to this interface for the API call.
- **`StepIndicator` component** (`components/admin/StepIndicator.vue`): Already created in Story 1.4. Reuse with `current-step="2"`.
- **`SOURCE_LABELS` map** (`stores/quickBookingForm.ts:20-27`): Exported. Reuse for SourceBadge display name mapping.
- **`formatDateShort()`** (`utils/formatting.ts`): Existing utility for date formatting in RecapBanner.
- **QuickBookingStep1.vue styling patterns**: Reference for consistent form styling (input classes, button classes, spacing, min-height 48px).
- **Conflict message builder pattern** (`QuickBookingStep1.vue:25-42`): Reference for French text formatting approach.

### DO NOT Touch

- `apps/web/src/stores/newBookingForm.ts` — zero modifications (NFR13)
- `apps/web/src/views/admin/QuickBookingStep1.vue` — already complete from Story 1.4, no modifications
- `apps/api/src/bookings/bookings.controller.ts` — POST /bookings/quick already works
- `apps/api/src/bookings/bookings.service.ts` — createQuick() already works
- Existing direct booking flow — no regressions

### Payload Construction

Build `CreateQuickBookingData` from store state. Only include optional fields if they have meaningful values:

```typescript
const payload: CreateQuickBookingData = {
  startDate: store.startDate,
  endDate: store.endDate,
  source: store.source as BookingSource,
  ...(store.source === 'OTHER' && store.sourceCustomName.trim()
    ? { sourceCustomName: store.sourceCustomName.trim() }
    : {}),
  ...(store.label.trim() ? { label: store.label.trim() } : {}),
  ...(store.externalAmount !== null ? { externalAmount: store.externalAmount } : {}),
  ...(store.occupantsCount !== null ? { occupantsCount: store.occupantsCount } : {}),
  ...(store.adultsCount > 1 ? { adultsCount: store.adultsCount } : {}),
  ...(store.notes.trim() ? { notes: store.notes.trim() } : {}),
};
```

### Success Screen Data Flow

After `bookingsApi.createQuick()` returns the created `Booking` object:
1. Capture the `booking.id`, source display name, dates, label, nightsCount BEFORE calling `store.reset()`
2. Navigate to `/admin/nouveau/rapide/succes` passing booking data via `router.push({ name: 'AdminQuickBookingSuccess', state: { bookingId, source, ... } })`
3. Alternatively use a temporary ref or route query params — the key is that `store.reset()` wipes the store, so data must be captured first
4. The SuccessScreen component receives data via props from the parent view

**Recommended approach**: Use `window.history.state` via Vue Router's `state` option for cleaner data passing without URL pollution.

### Source Badge Color Mapping

```typescript
function getBadgeClasses(bookingType: BookingType): { bg: string; text: string } {
  switch (bookingType) {
    case 'EXTERNAL':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'PERSONAL':
      return { bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'DIRECT':
      return { bg: 'bg-rose-50', text: 'text-rose-700' };
  }
}
```

### Source-to-BookingType Mapping (Frontend — UX convenience only)

```typescript
function mapSourceToType(source: BookingSource): BookingType {
  switch (source) {
    case 'ABRITEL':
    case 'AIRBNB':
    case 'BOOKING_COM':
    case 'OTHER':
      return 'EXTERNAL';
    case 'PERSONNEL':
    case 'FAMILLE':
      return 'PERSONAL';
  }
}
```

This is needed for the SourceBadge on the RecapBanner and SuccessScreen (before the server returns the booking with `bookingType`). Server is authoritative — this is only for display purposes.

### Styling Requirements (WCAG AA + Senior-first)

- Min 48px click targets on all interactive elements
- Min 16px body text, 14px for secondary text only
- Use existing Tailwind design system colors: `primary` (#FF385C), `dark` (#222222), `text` (#484848)
- Card-based layout: `rounded-xl`, `border`, white background
- Form inputs: same classes as QuickBookingStep1 — `w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30`, `min-height: 48px`
- "Facultatif" labels: append `<span class="text-gray-400 font-normal"> — Facultatif</span>` to label text
- Loading button: spinner SVG + "En cours..." text replacing "Créer la réservation"
- Error message: red toast or inline error below button, preserving all data

### Project Structure Notes

New files (4):
```
apps/web/src/components/admin/RecapBanner.vue       # New component
apps/web/src/components/admin/InfoBubble.vue         # New component
apps/web/src/components/admin/SuccessScreen.vue      # New component
apps/web/src/components/admin/SourceBadge.vue        # New component (reusable for Epic 2)
apps/web/src/views/admin/QuickBookingSuccess.vue     # New success page view
```

Modified files (2):
```
apps/web/src/views/admin/QuickBookingStep2.vue       # Replace placeholder with full implementation
apps/web/src/router/index.ts                         # Add success route
```

### TypeScript Constraints

- No `any` types (NFR12)
- Explicit return types on all functions
- Use `BookingSource`, `BookingType` types from `api.ts`
- Use `CreateQuickBookingData` interface from `api.ts` for API payload
- Use nullish coalescing `??` for defaults
- Use optional chaining `?.` for nullable access
- `catch { }` (no variable) for error handlers where error details aren't needed

### Testing Checklist

- [ ] RecapBanner shows correct source badge, dates, and nights count from Step 1
- [ ] "Modifier" link on RecapBanner navigates back to Step 1 with all data preserved
- [ ] InfoBubble appears on first visit, dismisses on X click, stays dismissed after page reload
- [ ] All optional fields accept input and bind to store correctly
- [ ] "Créer la réservation" sends POST with correct payload (only non-empty optional fields)
- [ ] Loading state shows spinner + "En cours..." during API call
- [ ] Success screen displays booking summary with correct source badge and dates
- [ ] "Voir la réservation" navigates to booking detail page
- [ ] "Retour aux réservations" navigates to booking list
- [ ] Error toast appears on API failure, all form data preserved
- [ ] Navigating to Step 2 without Step 1 data redirects to Step 1
- [ ] Navigating to success page without booking data redirects to list
- [ ] Store is reset after successful creation
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.5]
- [Source: _bmad-output/planning-artifacts/architecture.md — D6, D7, Frontend Architecture, API Communication Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — RecapBanner, InfoBubble, SuccessScreen, Direction B, Direction C adopted elements]
- [Source: apps/web/src/stores/quickBookingForm.ts — Store with Step 2 fields, SOURCE_LABELS, reset()]
- [Source: apps/web/src/lib/api.ts — CreateQuickBookingData:216-226, bookingsApi.createQuick():344-347, BookingType:47, BookingSource:48]
- [Source: apps/web/src/views/admin/QuickBookingStep1.vue — Styling patterns, form input classes, button classes]
- [Source: apps/web/src/components/admin/StepIndicator.vue — Reusable component for step 2]
- [Source: apps/web/src/router/index.ts — Existing routes, lazy-loading pattern]

## Previous Story Intelligence

### From Story 1.1 (Data Model)
- Prisma enums `BookingType`, `BookingSource`, `PaymentStatus` are defined and migrated
- Booking model extended with nullable fields (`occupantsCount`, `rentalPrice`)
- All new fields have `@map()` decorators

### From Story 1.2 (Backend API)
- `POST /bookings/quick` endpoint is live with `JwtAuthGuard + AdminGuard`
- `createQuick()` uses `$transaction()` for atomic conflict check + create
- Returns the created `Booking` object with all relations
- Validates `sourceCustomName` required when source is OTHER
- Returns 409 on conflict, 400 on validation errors, 201 on success

### From Story 1.3 (Type Selector)
- Route `/admin/nouveau` shows BookingTypeSelector
- "Réservation rapide" navigates to `/admin/nouveau/rapide/1`
- TypeSelectorRow pattern: rounded-xl, border-2, min-height 72px
- Lazy loading pattern: `const Component = () => import('...')`

### From Story 1.4 (Step R1 — Dates & Source)
- `quickBookingForm` store created with all Step 1 + Step 2 state fields
- `SOURCE_LABELS` exported for source display name mapping
- StepIndicator component created and working
- Conflict checking with debounce implemented
- Navigation from Step 1 to Step 2 via `router.push({ name: 'AdminQuickBookingStep2' })`
- QuickBookingStep2.vue is a placeholder stub — ready to be replaced
- Route `AdminQuickBookingStep2` already registered
- Styling: input classes `w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-dark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30`, `style="min-height: 48px"`
- `formatDateShort()` used for date formatting

### Key Learnings from Previous Stories
- Route order matters in NestJS controllers (specific routes before parameterized)
- Always use `withDefaults(defineProps<...>())` for Vue component defaults
- All French labels, no icon-only buttons
- Build verification: `npm run typecheck && npm run lint && npm run build`
- `catch { }` pattern (no variable) for error handlers
- Lint fix: watch for unnecessary `??` operators flagged by ESLint

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- Created 4 new reusable Vue components: SourceBadge, RecapBanner, InfoBubble, SuccessScreen
- SourceBadge uses SOURCE_LABELS from quickBookingForm store for display names, with color mapping by BookingType
- RecapBanner displays Step 1 recap with SourceBadge + formatted dates + nights count + "Modifier" link
- InfoBubble uses localStorage for persistent dismiss state — won't reappear after dismissal
- SuccessScreen follows Direction B compact layout with checkmark icon, booking summary, and two action buttons
- QuickBookingStep2.vue fully implemented with all optional fields v-model bound to store, submission with loading state, error handling preserving form data
- Payload construction omits empty optional fields per API validation requirements
- Success data passed via Vue Router's `state` option (window.history.state) to avoid URL pollution
- store.reset() called on QuickBookingSuccess mount after data capture
- Guard: Step 2 redirects to Step 1 if store.isStep1Valid is false
- Guard: Success route redirects to booking list if no booking data in history state
- No test framework configured in project — validation via typecheck + lint + build
- All validations pass: TypeScript (0 errors), ESLint (0 errors, 2 pre-existing warnings in router), Build (success)

### Change Log

- 2026-02-22: Implemented Story 1.5 — Quick Booking Step R2 with optional details form, submission with loading state, success screen, and navigation guards
- 2026-02-22: Code review fixes — [H1] Created CheckConflictsDto for input validation on check-conflicts endpoint. [M1] Fixed v-model.number on nullable fields (externalAmount, occupantsCount) using computed getter/setter to properly convert empty to null. [M2] Added 409 conflict error differentiation in submission handler. [M3] Moved store.$reset() inside success-only block in QuickBookingSuccess. [M4] Decoupled SourceBadge from quickBookingForm store — moved SOURCE_LABELS to constants/booking.ts. [M5] Replaced manual reset() action with Pinia built-in $reset(). [L1] Converted canProceed/getBookingType/getSourceDisplay to computed properties. [L2] Added flex-wrap to RecapBanner for mobile. [L3] Added isReady guard to prevent Step 2 flash before redirect. [L4] Wrapped Step 2 form in <form> element for Enter key submission.

### File List

New files:
- apps/web/src/components/admin/SourceBadge.vue
- apps/web/src/components/admin/RecapBanner.vue
- apps/web/src/components/admin/InfoBubble.vue
- apps/web/src/components/admin/SuccessScreen.vue
- apps/web/src/views/admin/QuickBookingSuccess.vue
- apps/web/src/constants/booking.ts
- apps/api/src/bookings/dto/check-conflicts.dto.ts

Modified files:
- apps/web/src/views/admin/QuickBookingStep2.vue (replaced placeholder with full implementation)
- apps/web/src/router/index.ts (added QuickBookingSuccess lazy import + success route)
- apps/web/src/stores/quickBookingForm.ts (imported SOURCE_LABELS from constants, removed manual reset action)
- apps/web/src/components/admin/SourceBadge.vue (import SOURCE_LABELS from constants instead of store)
- apps/web/src/components/admin/RecapBanner.vue (added flex-wrap for mobile responsiveness)
- apps/web/src/views/admin/QuickBookingStep1.vue (converted canProceed to computed)
- apps/web/src/views/admin/QuickBookingSuccess.vue (conditional store.$reset only on success)
- apps/api/src/bookings/bookings.controller.ts (use CheckConflictsDto for input validation)
