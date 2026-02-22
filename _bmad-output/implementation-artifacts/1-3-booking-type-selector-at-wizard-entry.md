# Story 1.3: Booking Type Selector at Wizard Entry

Status: done

## Story

As an admin,
I want to choose between "Réservation directe" and "Réservation rapide" when creating a new booking,
so that I can use the appropriate flow for my situation.

## Acceptance Criteria

1. **Given** the admin navigates to `/admin/nouveau`, **When** the page loads, **Then** two clickable rows are displayed: "Réservation directe" (icon + "6 étapes — Client + tarification") and "Réservation rapide" (icon + "2 étapes — Dates + source"). Rows follow Direction B design: stacked, min 72px height, full-width clickable area, hover state with primary border.

2. **Given** the admin clicks "Réservation directe", **When** the click is registered, **Then** the admin is navigated to the existing 6-step wizard flow at `/admin/nouveau/direct` with no behavioral changes (FR7, FR29).

3. **Given** the admin clicks "Réservation rapide", **When** the click is registered, **Then** the admin is navigated to `/admin/nouveau/rapide/1` (quick flow step R1).

4. **Given** the TypeSelectorRow component, **Then** it has props: `icon` (slot), `title`, `description`, `detail`, `selected`. Click targets are minimum 48px height (UX senior accessibility). Labels are explicit French text — no icon-only elements.

*FRs: FR1, FR7, FR29 | UX: TypeSelectorRow, Direction B stacked rows*

## Tasks / Subtasks

- [x] Task 1: Create TypeSelectorRow.vue component (AC: #4)
  - [x] 1.1 Create `apps/web/src/components/admin/TypeSelectorRow.vue` with typed props interface (`title`, `description`, `detail`, `selected`)
  - [x] 1.2 Implement Direction B stacked row template: horizontal flex — icon slot left, text center (title lg semibold + description sm + detail xs), chevron right. Min height 72px, full-width clickable area
  - [x] 1.3 Add states: default (`border-2 border-gray-200 rounded-xl p-5`), hover (`border-primary bg-rose-50/20`), selected (`border-2 border-primary bg-rose-50/30 ring-2 ring-primary/20`). Focus ring for keyboard nav. Icon area 48x48 with rounded-xl background
- [x] Task 2: Create BookingTypeSelector.vue view (AC: #1, #2, #3)
  - [x] 2.1 Create `apps/web/src/views/admin/BookingTypeSelector.vue` with page header ("Nouvelle réservation") and back link ("← Retour aux réservations" navigating to `/admin/reservations`)
  - [x] 2.2 Render two TypeSelectorRow instances: "Réservation directe" (document icon, "Créer une réservation complète avec contrat et facture", "6 étapes — Client + tarification") and "Réservation rapide" (lightning/clock icon, "Bloquer des dates rapidement (Abritel, famille...)", "2 étapes — Dates + source")
  - [x] 2.3 Handle click navigation: "Directe" → `router.push('/admin/nouveau/direct')`, "Rapide" → `router.push('/admin/nouveau/rapide/1')`
- [x] Task 3: Update router configuration (AC: #2, #3)
  - [x] 3.1 Add lazy imports for BookingTypeSelector
  - [x] 3.2 Change `/admin/nouveau` route to use BookingTypeSelector component (name: 'AdminNewBooking')
  - [x] 3.3 Add `/admin/nouveau/direct` child route pointing to existing NewBookingView (name: 'AdminNewBookingDirect')
  - [x] 3.4 Add `/admin/nouveau/rapide/1` placeholder route with minimal temporary component (enables AC #3 navigation — full implementation in Story 1.4)
- [x] Task 4: Verify no regressions (AC: #2)
  - [x] 4.1 Run `npm run typecheck` — zero errors
  - [x] 4.2 Run `npm run lint` — zero errors
  - [x] 4.3 Verify existing 6-step wizard works identically at `/admin/nouveau/direct`

## Dev Notes

### Scope Boundaries

**IN SCOPE:** TypeSelectorRow component, BookingTypeSelector view, router updates to split `/admin/nouveau` into type selector + direct wizard route + quick flow placeholder route.

**OUT OF SCOPE:** Quick booking form (Story 1.4), quick booking store `quickBookingForm` (Story 1.4), SourceBadge/StepIndicator/RecapBanner components (Stories 1.4–1.5), any backend changes, any API calls, any Pinia store changes.

### Architecture Compliance

This story implements Layer 3 (Quick Flow) — the entry point. Per the architecture:

- **Route-based steps** (Decision D7): `/admin/nouveau` → type selector, `/admin/nouveau/direct` → existing wizard, `/admin/nouveau/rapide/*` → quick flow steps
- **Design Direction B** (Compact & Efficient): stacked rows (not side-by-side cards), min 72px height, chevron right indicator
- **Senior-first accessibility**: 48px min click targets, 16px min body text, explicit French labels, no icon-only buttons, WCAG AA contrast
- **Existing Pinia store untouched** (NFR13): `newBookingForm` store is NOT modified. No new store needed for this story.

### TypeSelectorRow Component Specification

**File:** `apps/web/src/components/admin/TypeSelectorRow.vue`

**Props:**
```typescript
interface TypeSelectorRowProps {
  title: string;
  description: string;
  detail: string;
  selected?: boolean;
}
```

**Emits:** `click()`

**Slots:** `icon` — default slot for the icon (SVG or emoji), rendered inside a 48x48 rounded-xl container with light gray background.

**States:**
- Default: `border-2 border-gray-200 rounded-xl p-5` — icon left, text center, chevron right
- Hover: `border-primary bg-rose-50/20` — chevron turns primary color
- Selected: `border-2 border-primary bg-rose-50/30 ring-2 ring-primary/20`
- Focus: `ring-2 ring-primary/50` focus ring for keyboard navigation

**Anatomy:** `<button>` element (semantic HTML, not `<div @click>`). Horizontal flex. Icon (48x48 bg-gray-100 rounded-xl flex items-center justify-center) + text column (title: text-lg font-semibold text-dark, description: text-sm text-text, detail: text-xs text-gray-400 mt-1) + chevron-right SVG (w-5 h-5 text-gray-400, turns primary on hover).

**Min height:** 72px (per Direction B spec). Full-width clickable area.

### BookingTypeSelector View Specification

**File:** `apps/web/src/views/admin/BookingTypeSelector.vue`

**Structure:**
```
<div class="max-w-xl mx-auto">
  <!-- Back link -->
  <router-link to="/admin/reservations">← Retour aux réservations</router-link>

  <!-- Page header -->
  <h1>Nouvelle réservation</h1>
  <p>Choisissez le type de réservation à créer</p>

  <!-- Type selector rows -->
  <TypeSelectorRow @click="goToDirect" ...directProps>
    <template #icon>📄</template>  <!-- or SVG -->
  </TypeSelectorRow>

  <TypeSelectorRow @click="goToQuick" ...quickProps>
    <template #icon>⚡</template>  <!-- or SVG -->
  </TypeSelectorRow>
</div>
```

**Max content width:** 640px (per UX spec for quick booking flow, centered). Use `max-w-xl mx-auto`.

**Row data:**

| Row | Title | Description | Detail |
|-----|-------|-------------|--------|
| Directe | Réservation directe | Créer une réservation complète avec contrat et facture | 6 étapes — Client + tarification |
| Rapide | Réservation rapide | Bloquer des dates rapidement (Abritel, famille...) | 2 étapes — Dates + source |

**Navigation:**
- `goToDirect()` → `router.push({ name: 'AdminNewBookingDirect' })` or `router.push('/admin/nouveau/direct')`
- `goToQuick()` → `router.push('/admin/nouveau/rapide/1')`

**Icons:** Use inline SVG or simple text emoji. No external icon library. The icon should be visually distinct between the two rows:
- Directe: A document/clipboard icon suggesting a full form
- Rapide: A lightning bolt or clock icon suggesting speed

### Router Changes

**File:** `apps/web/src/router/index.ts`

**Current:**
```typescript
{
  path: 'nouveau',
  name: 'AdminNewBooking',
  component: NewBookingView,
}
```

**Target:**
```typescript
// New lazy imports
const BookingTypeSelector = () => import('../views/admin/BookingTypeSelector.vue');

// Updated routes under /admin children:
{
  path: 'nouveau',
  name: 'AdminNewBooking',
  component: BookingTypeSelector,
},
{
  path: 'nouveau/direct',
  name: 'AdminNewBookingDirect',
  component: NewBookingView,
},
{
  path: 'nouveau/rapide/1',
  name: 'AdminQuickBookingStep1',
  component: () => import('../views/admin/QuickBookingStep1Placeholder.vue'),
},
```

**CRITICAL: Route order matters.** The `nouveau` route must come BEFORE `nouveau/direct` and `nouveau/rapide/*` since Vue Router matches in order. Actually, Vue Router v4 uses a scoring system for path matching, but keeping logical order is good practice.

**CRITICAL: Do NOT nest routes.** `nouveau/direct` and `nouveau/rapide/1` are separate child routes of `/admin`, not children of `nouveau`. This ensures each view replaces the full content area.

### Placeholder for Quick Flow Route

For AC #3, `/admin/nouveau/rapide/1` must be navigable. Create a minimal placeholder — this can be:
- A simple Vue component in `views/admin/` with text "Page en construction" and back button
- OR define the route inline

**Recommended approach:** Create a minimal `QuickBookingStep1.vue` file that is a stub (will be fully implemented in Story 1.4). This avoids creating throwaway files.

Minimal stub content:
```vue
<script setup lang="ts">
// Placeholder — full implementation in Story 1.4
</script>
<template>
  <div class="max-w-xl mx-auto py-8 px-4">
    <p class="text-gray-500">Réservation rapide — Étape 1 (à venir)</p>
    <router-link to="/admin/nouveau" class="text-primary hover:underline mt-4 inline-block">
      ← Retour
    </router-link>
  </div>
</template>
```

### Existing Code Impact — Navigation References

Places that may navigate to `/admin/nouveau` or use route name `AdminNewBooking`:
- **AdminLayout.vue** sidebar navigation — has a "Nouvelle réservation" link. This will correctly go to the type selector now.
- **NewBookingView.vue** success handler — redirects to `/admin/reservations` (no impact).
- **BookingsView.vue** "New booking" button — likely links to `/admin/nouveau` (will now show type selector, correct).

No code modification needed in these files — the type selector IS the intended new entry point.

### Existing Patterns — DO NOT Deviate

| Pattern | Convention | Source |
|---------|-----------|--------|
| Component structure | `<script setup lang="ts">` → `<template>` → `<style scoped>` (if needed) | All existing Vue components |
| Typed props | `defineProps<InterfaceName>()` | Existing pattern |
| Typed emits | `defineEmits<{ click: [] }>()` | Existing pattern |
| Router navigation | `router.push()` or `<router-link>` | Existing pattern |
| Lazy imports | `const X = () => import('...')` with explicit return type | Router file |
| Tailwind only | No scoped CSS unless for animations | All components |
| No `any` | Strong explicit TypeScript typing | NFR12 |
| Semantic HTML | `<button>` for actions, not `<div @click>` | UX accessibility requirement |

### DO NOT

- Modify `newBookingForm.ts` store (NFR13)
- Create `quickBookingForm.ts` store (that's Story 1.4)
- Add any API calls or backend changes
- Create SourceBadge, StepIndicator, RecapBanner, or other components (future stories)
- Use icon-only buttons (UX accessibility)
- Use `any` type (NFR12)
- Add external icon libraries

### Previous Story Intelligence (Stories 1.1 & 1.2)

**What was done:**
- Story 1.1: Prisma schema extended with BookingType, BookingSource, PaymentStatus enums. Frontend types updated in `api.ts`. Null-safety guards added.
- Story 1.2: `CreateQuickBookingDto`, `POST /bookings/quick` endpoint, `mapSourceToType()`, `checkConflictsDetailed()`, frontend API method `createQuick()`.

**What to reuse:**
- Frontend types `BookingType`, `BookingSource` already exist in `api.ts` — import if needed for type annotations
- All backend infrastructure is ready — this story is frontend-only

**Learnings:**
- Pre-commit hooks (Husky + lint-staged) auto-format on commit — ensure code passes `npm run lint` and `npm run typecheck` before considering task complete
- Route order in controller was critical in Story 1.2 — similarly, route order/nesting in Vue Router needs attention
- All files successfully built: `build:api` and `build:web` passed

### Git Intelligence

Recent commits show the project follows Conventional Commits in French:
- `refactor: consolidation génération PDF côté backend uniquement`
- `feat: refonte UX page détail réservation et cohérence boutons/devise`
- `feat: validation formulaires, sélecteur pays et mention no-reply email`

Pattern: French descriptive commit messages with appropriate conventional prefix.

### Project Structure Notes

- New component: `apps/web/src/components/admin/TypeSelectorRow.vue` — follows existing flat structure in `components/admin/`
- New view: `apps/web/src/views/admin/BookingTypeSelector.vue` — follows existing flat structure in `views/admin/`
- New placeholder view: `apps/web/src/views/admin/QuickBookingStep1.vue` — stub for Story 1.4
- Modified: `apps/web/src/router/index.ts` — route restructuring

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Routing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — Frontend File Organization]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — TypeSelectorRow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision — Direction B]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns — Button Hierarchy]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `vue-tsc --noEmit`: 0 errors
- `npm run lint`: 0 errors, 3 pre-existing warnings (unchanged)
- `npm run build:web`: success (622 modules, 3.14s)

### Completion Notes List

- Created TypeSelectorRow.vue reusable component with typed props (title, description, detail, selected), icon slot, semantic `<button>` element, Direction B stacked design (min 72px height), all visual states (default, hover, selected, focus), and group hover for chevron color change
- Created BookingTypeSelector.vue view with page header, back link, two TypeSelectorRow instances with inline SVG icons (document for direct, lightning bolt for quick), and router.push navigation
- Created QuickBookingStep1.vue placeholder stub for Story 1.4
- Updated router: `/admin/nouveau` now shows BookingTypeSelector, added `/admin/nouveau/direct` (existing NewBookingView), added `/admin/nouveau/rapide/1` (QuickBookingStep1 placeholder). All routes are flat children of `/admin` (not nested under `nouveau`)
- No Pinia store modifications (NFR13 compliant)
- No external dependencies added
- No `any` types used (NFR12 compliant)
- All existing navigation references to `/admin/nouveau` will correctly show the new type selector

### File List

- `apps/web/src/components/admin/TypeSelectorRow.vue` (NEW)
- `apps/web/src/views/admin/BookingTypeSelector.vue` (NEW)
- `apps/web/src/views/admin/QuickBookingStep1.vue` (NEW)
- `apps/web/src/router/index.ts` (MODIFIED)

### Change Log

- 2026-02-22: Implemented Story 1.3 — Booking type selector at wizard entry. Created TypeSelectorRow component, BookingTypeSelector view, QuickBookingStep1 placeholder, and restructured router for type selection flow.
- 2026-02-22: Code review (AI) — 3 issues found (1 Medium, 2 Low), all fixed:
  - [MEDIUM] Replaced hardcoded route paths with named routes in BookingTypeSelector.vue and QuickBookingStep1.vue
  - [LOW] Changed `focus:` to `focus-visible:` for keyboard-only focus ring in TypeSelectorRow.vue
  - [LOW] Replaced inline `style="min-height: 72px"` with Tailwind class `min-h-[72px]` in TypeSelectorRow.vue
