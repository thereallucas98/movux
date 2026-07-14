# Movux — Frontend Roadmap (Phase 1b)

**Status:** ✅ Phase 1b complete — F00 through F13 all validated. Phase 1 (1a + 1b) shipped.
**Last updated:** 2026-04-28
**Owner:** David Lucas
**Companion docs:**
- [`BUSINESS-FOUNDATION.md`](BUSINESS-FOUNDATION.md) — domain decisions
- [`ROADMAP.md`](ROADMAP.md) — overall phase map
- [`API-ROADMAP.md`](API-ROADMAP.md) — Phase 1a backend (✅ 14/16 done)
- [`API-ARCHITECTURE.md`](API-ARCHITECTURE.md) — Route → UseCase → Repository
- [`FRONTEND-ARCHITECTURE.md`](FRONTEND-ARCHITECTURE.md) — Page → Hook → Component
- [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) — Financy tokens + components
- [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md) — End-to-end feature flow (auth → API → state → UI)

---

## 1. Purpose

Phase 1b ships the **product UI** that consumes the API built in Phase 1a. While `API-ROADMAP.md` defined every backend contract, this doc defines **what pages, what flows, what components** the user sees, and **how** they integrate with the API.

Each frontend feature gets a `docs/tasks/<slug>/` folder following the same 5-phase workflow as Phase 1a (`brief → exploration → research → plan → todo → validation`).

---

## 2. Position in the overall roadmap

```
Phase 1a — API & Domain        ✅ 14/16 done
       │
       └── (optional: 15 + 16 first, or pull them in mid-1b)
              │
              ▼
Phase 1b — Frontend            ⏳ this doc
       │
       └── Phase 2 — External Comms (Email, Push, WhatsApp)
              │
              └── Phase 3 — Infra & Enterprise (SSO, MTE 671, Payroll)
```

Phase 1b can start now — Phase 1a is functionally complete for every screen. Tasks 15 (plan limits) and 16 (notifications) are not blocking; they slot in as feature flags / banners once the UI exists.

---

## 3. Contract per frontend task

Every task in §4 MUST deliver:

### Code

| Layer | File(s) | Requirement |
|---|---|---|
| **Page** | `src/app/<segment>/page.tsx` (RSC) | Server component when possible; pre-fetches via React Query `prefetchQuery` + `HydrationBoundary` |
| **Layout** | `src/app/<segment>/layout.tsx` | Per-segment shell (sidebar, breadcrumbs, etc.) |
| **Loading + error** | `loading.tsx` + `error.tsx` per segment | Skeleton + recoverable error UI (Next.js convention) |
| **Feature components** | `src/components/features/<domain>/*.tsx` | Domain-specific React components — single responsibility, named exports |
| **GraphQL hooks** | `src/graphql/hooks/use-<name>.ts` + `src/graphql/operations/<name>.graphql` | Generated types + React Query wrappers |
| **Forms** | inside feature components | `useForm({ resolver: zodResolver(SomeSchema) })`, `defaultValues` per field, `setError('root', ...)` for API errors |
| **Zod schemas (UI-only)** | `src/lib/schemas/<domain>.schema.ts` (when UI needs extra validation beyond the API's Zod) | Reuse server schemas via `z.infer` when possible |
| **t() keys** | `src/i18n/locales/pt-BR.ts` | Every user-facing string |
| **Hooks** | `src/hooks/<name>.ts` | Cross-feature hooks (e.g., `useMediaQuery`, `useAdaptiveModal`) |

### Tests

| Kind | Location | What it verifies |
|---|---|---|
| **Unit (Vitest)** | `src/components/features/<domain>/__tests__/<name>.test.tsx` | Form validation, derived state, conditional renders. RTL + `userEvent`. Skip for trivial display components. |
| **Hook tests** | `src/hooks/__tests__/<name>.test.ts` | Pure logic, edge cases |
| **Storybook (optional)** | `*.stories.tsx` | Visual regression, controls — defer until story count justifies the setup cost |
| **Browser E2E (Playwright)** | `tests/e2e/<flow>.spec.ts` | Critical flows end-to-end (login → assign → accept → clock-in). Use real backend (test DB). |

### Frontend E2E matrix per critical flow

- ✅ Happy path — user achieves the goal
- ✅ Form validation errors render visibly (per field + root)
- ✅ Loading state visible during slow network (force throttle in test)
- ✅ Empty state when 0 results
- ✅ Error state when backend returns 5xx
- ✅ Mobile (375px viewport, Safari-iOS engine) AND desktop (1440px, Chromium)
- ✅ Touch targets ≥ 44px on mobile
- ✅ Keyboard navigation works (tab order, enter to submit, esc to close modals)
- ✅ `aria-label` on every icon-only button
- ✅ No horizontal scroll on mobile

### Cross-cutting obligations

Every task also:
- Uses **shadcn/ui primitives** + Financy tokens (per [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md))
- Follows **mobile-first**: design for ≤720px, scale up via `md:`/`lg:` (per CLAUDE.md)
- Uses **`Drawer` (not `Dialog`) on mobile** for modals/selects
- Adds the audit-friendly `data-testid="<feature>-<action>"` only where Playwright needs an explicit hook (otherwise rely on accessible roles + names)
- Honors **CLAUDE.md "no half-finished implementations"** — every shipped page must work end-to-end
- Uses **PT-BR copy** for everything user-facing (CLAUDE.md language rule)
- Surfaces backend `code` errors as friendly t() messages (the integration mapping lives in [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md))

---

## 4. Task list — Phase 1b

Each row gets a `docs/tasks/<slug>/` folder when it kicks off.

| # | Slug | Status | Summary | Depends on (API) |
|---|---|---|---|---|
| **F00** | `f00-foundation-app-shell` | ✅ Done | App shell: sidebar (desktop) / bottom-tab + drawer (mobile) + topbar with workspace switcher; route layouts; React Query provider; toast wiring; loading/error templates | — |
| F01 | `f01-dashboard` | ✅ Done | Login + Register + Forgot/Reset password + Verify email; expanded KPIs + my-next-shift + recent notifications | API 02 ✅ |
| F02 | `f02-onboarding-wizard` | ✅ Done | Tenant creation → workspace creation → invite first members → vertical template selector | API 02–06 ✅ |
| F03 | `f03a/b/c-workspace-settings` | ✅ Done | Workspace info, members, categories CRUD, specialties CRUD, member-specialty assignment | API 03–06 ✅ |
| F04 | `f04-user-profile` | ✅ Done | Profile edit, password change, notification opt-in toggles | API 06 ✅ |
| F05 | `f05-schedule-board` | ✅ Done | Schedule list per workspace + lifecycle actions; calendar grid view | API 07 ✅ |
| F06 | `f06-shift-editor` (+ f06b pattern-wizard, f06c expected-composition) | ✅ Done | Create/edit/delete shifts; pattern generator wizard; expected-composition picker | API 08 ✅ |
| F07 | `f07-assignment-flow` | ✅ Done | Assign users (multi-select), accept/reject (with reason), transfer wizard | API 09–10 ✅ |
| F08 | `f08-open-for-apply-queue` | ✅ Done | Mark shift as OPEN_FOR_APPLY, "Sou voluntário" button, FIFO queue table for Coord | API 11 ✅ |
| F09 | `f09-request-system` | ✅ Done | SWAP modal (peer picker), OFFER button, TIME_OFF wizard with attachment uploader; coord inbox to resolve | API 12 ✅ |
| F10 | `f10-time-tracking` | ✅ Done | Clock in/out card; geo opt-in; per-user timesheet; Coord close action; CSV export | API 13 ✅ |
| F11 | `f11-shift-detail-timeline` | ✅ Done | Shift detail page with timeline tab; add-note input | API 14 ✅ |
| F12 | `f12-notifications-center` | ✅ Done | Bell icon + dropdown; lista + marcar como lida | API 16 ✅ |
| F13 | `f13-plan-limits-banners` | ✅ Done (validated 2026-05-01) | PlanLimitBanner / GracePeriodBanner / Settings/Billing page (4-tier picker + downgrade dialog + Corporate-only section) / F06b PatternSuggestionAlert / handlePlanLimitError wired in 6 forms | API 15 ✅ |

---

## 5. Testing strategy

### 5.1 Vitest (component + hook)

- Co-located in `__tests__/` next to the source.
- Use `@testing-library/react` + `userEvent`.
- Mock the API layer at the React Query boundary (`vi.mock('~/graphql/hooks/...')`) — never mock fetch.
- Skip tests for purely presentational components without conditional logic.

### 5.2 Playwright Browser E2E

- `tests/e2e/<flow>.spec.ts`.
- 3 projects: `mobile-webkit` (375px iPhone), `tablet` (768px iPad), `desktop-chromium` (1440px).
- Run against a real Next.js dev server pointed at the test DB.
- Default suite runs all three projects; CI matrix can split.

### 5.3 CI gates

| Step | Required |
|---|---|
| `pnpm lint` (0 warnings) | ✅ |
| `pnpm build` | ✅ |
| `pnpm test:unit` | ✅ all green |
| `pnpm test:e2e` (browser) | ✅ on mobile-webkit + desktop-chromium |
| `pnpm test:api` | ✅ regression on backend |

---

## 6. Cross-cutting frontend decisions (scoped to Phase 1b)

### 6.1 Data fetching — React Query for client; RSC fetch for server

- Server components: `await fetch(...)` directly (Next.js cache).
- Client components needing refetch / mutation / pagination → `@tanstack/react-query` (already in deps).
- RSC → client hydration: `queryClient.prefetchQuery(...)` + `<HydrationBoundary state={dehydrate(queryClient)}>`.
- See [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md) §3.

### 6.2 GraphQL preferred for read-heavy screens

- Lists, detail pages, dashboards → GraphQL (`graphql-request` + `@graphql-codegen` types) so the UI can pick fields.
- Mutations → REST or GraphQL, whichever is more ergonomic per call site.
- Cookie auth (`session`) flows through both surfaces — no token juggling.

### 6.3 Forms — RHF + Zod, mirror backend schemas

- `useForm({ resolver: zodResolver(schema), defaultValues: { ... } })`.
- For schemas the API also enforces, **import directly from `~/server/schemas/...`** (TypeScript-only import, tree-shaken from client bundle automatically since Zod is shared).
- API-level errors map to `setError('root', { message })`.

### 6.4 State management — Zustand for client/UI only

- Filters, modal toggles, multi-step wizard state → Zustand.
- Server data → React Query (never duplicate).
- URL state for shareable filters → `useSearchParams` (Next.js).

### 6.5 Mobile-first — `useMediaQuery('(max-width: 720px)')`

Hook drives conditional renders for `Dialog`/`Drawer`, table-vs-card, top-nav-vs-bottom-tabs. Living in `src/hooks/use-media-query.ts`.

### 6.6 Error boundaries — Next.js `error.tsx` per segment

- Top-level `app/error.tsx` for unrecoverable crashes.
- Per-segment for graceful recovery (e.g., `app/(app)/schedules/[id]/error.tsx`).
- Expected errors do NOT throw — return as Result.

### 6.7 File uploads — multipart to API, never direct to Supabase

- Per Task 12 §5 + Task 13 CSV: API receives multipart, validates, calls `~/lib/storage/supabase.ts`. Frontend never touches Supabase keys.
- Use `<input type="file">` + `FormData` from a regular form submit.

### 6.8 i18n — `t()` keys ready, single locale (pt-BR) shipped

- Every visible string flows through `t('key.path')` even when only PT-BR is shipped.
- Phase 2 adds locale switcher; the structure is in place from day one.

### 6.9 Performance budget (initial)

- LCP ≤ 2.5s on 4G mobile (Lighthouse).
- TTI ≤ 3.5s.
- Total JS ≤ 250KB gzipped on critical landing pages (`/login`, `/dashboard`).
- Images via `next/image` with explicit width/height.

---

## 7. Follow-ups flagged

| Item | Affects | Severity |
|---|---|---|
| Storybook setup decision | All UI tasks | Low — defer until visual regression demand exists |
| Skeleton loader library vs hand-rolled | F00–F11 | Low — use `tailwindcss-animate` `animate-pulse` for v1 |
| Dark theme polish (tokens exist, pages not yet themed) | All | Low — Phase 2 |
| Real-time updates (websockets/SSE) | F11 timeline, F12 notifications | Medium — Phase 2 |
| White-label theming (multi-tenant brand colors) | Tokens layer | Low — Phase 3 (corporate plan) |

---

## 8. Out of scope (Phase 1b)

- Native mobile apps (PWA only via `next-pwa` or similar — defer)
- Public marketing site (separate concern)
- Admin-of-admins console (Phase 3)
- Embedded analytics dashboards (Phase 2 minimum)
- Real-time collaboration (cursors, presence)

---

## 9. Execution flow (per task)

Same 5-phase workflow as Phase 1a:

```
Phase 0: BRIEF        → User story, scope, acceptance criteria
Phase 1: EXPLORATION  → Read existing pages/components, document gaps
Phase 2: RESEARCH     → Decisions: which shadcn primitives, Drawer vs Dialog cutoff, etc.
Phase 3: PLAN + TODO  → Ordered sub-steps + checklist
Phase 4: EXECUTION    → Implement, lint, browser-test
Phase 5: QA           → Manual mobile-webkit + desktop-chromium QA + a11y check
```

Output artifacts per task:
```
docs/tasks/<slug>/
  brief.md
  exploration.md
  research.md
  plan.md
  todo.md
  validation.md
  visual.md          # optional — annotated screenshots / Figma callouts
```

The `visual.md` is unique to Phase 1b. It captures: which Figma frames the implementation maps to, where divergence was deliberate, and links to relevant Figma node IDs.

---

## 10. How this doc interacts with the rest

- `ROADMAP.md` — index across phases
- `API-ROADMAP.md` — what data + actions the frontend can rely on
- `API-ARCHITECTURE.md` — backend layering (so frontend authors know how to talk to it)
- `FRONTEND-ARCHITECTURE.md` — frontend layering (Page → Hook → Component)
- `DESIGN-SYSTEM.md` — tokens + component contracts
- `INTEGRATION-FLOW.md` — end-to-end flows tying it all together

When changing a feature: update the most specific doc first, then propagate. Domain truth still lives in `BUSINESS-FOUNDATION.md`.

---

*End of doc. Next action: kick off **F00 — Foundation App Shell** with a Phase-0 brief.*
