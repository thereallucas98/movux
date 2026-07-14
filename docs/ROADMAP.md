# Movux — Technical Roadmap

**Status:** Phase 1a — API & Domain ✅ Complete (16/16 tasks done — see `docs/tasks/<slug>/validation.md` for each)
**Last updated:** 2026-05-01
**Companion doc:** [`BUSINESS-FOUNDATION.md`](BUSINESS-FOUNDATION.md)

## Current Phase 1a progress

| Task | Status | Tests added |
|---|---|---|
| 01–11 | ✅ Done | (foundation + assignment lifecycle + open-for-apply queue) |
| 12 — Request System | ✅ Done | +66 unit / +31 API E2E |
| 13 — Time Tracking | ✅ Done | +79 unit / +24 API E2E |
| 14 — Shift Timeline | ✅ Done | +51 unit / +16 API E2E |
| 15 — Plan Limits | ✅ Done (validated 2026-05-01) | +104 unit / +26 API E2E |
| 16 — In-app Notifications | ✅ Done (validated 2026-04-30) | (counted upstream) |

**Aggregate test counts at this checkpoint:** 684 unit / 384 API E2E (`pnpm test:unit` + `pnpm test:api`).

---

## 1. Purpose

This roadmap is the **technical map** of Movux implementation. While `BUSINESS-FOUNDATION.md` defines **what** we're building and **why**, this doc defines **how** and **in what order**.

For each feature, a dedicated `docs/tasks/<slug>/` folder is created following the 5-phase workflow defined in `CLAUDE.md`. This roadmap is the index + technical scaffold for all those features.

---

## 2. Phase Map

Re-scoped from original BUSINESS-FOUNDATION.md phases. The goal is to ship the **internal CRUD + UX** first, then **external communication**, then **infra & enterprise**.

| Phase | Goal | Plans unlocked | Target |
|---|---|---|---|
| **Phase 1a — API & Domain** ✅ | All domain CRUD on the backend: Prisma + repositories + use cases + REST + GraphQL + tests (Vitest + Playwright API). Details in [`API-ROADMAP.md`](API-ROADMAP.md). | — | Done 2026-05-01 |
| **Phase 1b — Frontend** ✅ | Pages + forms + dashboards + responsive UI consuming the API built in 1a. Details in [`FRONTEND-ROADMAP.md`](FRONTEND-ROADMAP.md), [`FRONTEND-ARCHITECTURE.md`](FRONTEND-ARCHITECTURE.md), [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md), [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md). | Free, Small Team | Done 2026-05-01 |
| **Phase 2 — External Comms** | Email (Resend), Web Push (Firebase FCM), WhatsApp (Meta Cloud API) + basic bot, Shift Handoff notes | Business | 6–8 weeks |
| **Phase 3 — Infra & Enterprise** | Rate limiting, observability, SSO, multi-tenant real, custom roles, SMS, payroll integrations, MTE 671 compliance | Corporate | 8–12 weeks |

---

## 3. Cross-cutting Approach Decisions

These decisions apply across multiple features and are committed upfront.

### 3.1 Identifiers — **CUID2**
- Library: `@paralleldrive/cuid2`
- Shorter + collision-resistant + sortable vs UUID v4
- Prisma: custom default via generator helper

### 3.2 Multi-tenancy isolation — **Row-level** (not schema-per-tenant)
- Every tenant-scoped entity has `tenantId: String` FK
- Repositories enforce scope; no schema separation
- Phase 3 re-evaluates for Corporate scale

### 3.3 Timezones — **UTC storage, locale display**
- All `DateTime` in DB stored as UTC
- `Workspace.timezone` field (IANA, e.g., `America/Sao_Paulo`)
- Library: `date-fns-tz` (extends existing `date-fns`)

### 3.4 Soft-delete pattern — **`isActive` + `deletedAt`**
- Default for user-facing entities
- Queries filter `isActive: true` via repository helpers
- Hard delete only for LGPD right-to-erasure

### 3.5 Audit logging — **Polymorphic `AuditLog`**
- Single table with `entityType`, `entityId`, `action`, `actorUserId`, `metadata JSON`
- Repositories call `auditRepo.create(...)` on every write
- `ShiftTimeline` is a shift-scoped view/subset

### 3.6 API style — **Dual REST + GraphQL**
- REST for resource CRUD + integrations (Swagger documented)
- GraphQL for nested UI queries (React Query hooks)
- Shared use cases + repositories

### 3.7 State machines — **explicit enum transitions**
- `Shift.status`, `ShiftAssignment.status`, `Request.status`, `Schedule.status`
- Validated in use cases; invalid transitions return `INVALID_STATE_TRANSITION`
- `xstate` only if complexity escalates (not v1)

### 3.8 CLT soft rule engine — **config-driven**
- `WorkspaceRuleConfig` table + evaluator function
- Warnings in v1; hard blocks Phase 3 (Corporate)
- Rules: 11h rest, 44h/week, 24h weekly rest (defaults ON, configurable)

### 3.9 Notifications — **channel-adapter fan-out**
- `NotificationEvent` emitted by use cases
- Dispatcher reads user preferences + plan; dispatches to enabled channels
- Phase 1: in-app only · Phase 2: email + push + WhatsApp · Phase 3: SMS
- Each channel adapter independently testable/mockable

### 3.10 Background jobs — **Vercel Cron**
- Declarative in `vercel.json` for:
  - Decision window expirations (Phase 1)
  - Shift reminders (Phase 2)
  - Overdue close warnings (Phase 1)
  - Daily digests (Phase 2)
- Migrate to Inngest only if limits hit in Phase 2+

### 3.11 File storage — **Supabase Storage**
- Library: `@supabase/supabase-js` (storage API only)
- DB remains local Docker Postgres (Prisma)
- Introduced when Request attachments land (Task 12)
- Credentials via env vars; presigned URLs for downloads

### 3.12 Email — **Resend (auth only in Phase 1)**
- Phase 1: auth emails (register, verify, reset) via Resend + React Email templates
- Phase 2: product notification emails via the same channel adapter pattern
- Dev: console logging (no real SMTP calls)
- Prod: Resend API key

### 3.13 Testing — **Vitest + Playwright + MSW from day 1**
- **Vitest** for unit + integration (use cases with in-memory repos)
- **Playwright** for E2E (critical auth + scheduling + assignment flows)
- **MSW** for HTTP mocking in frontend tests
- CI: GitHub Actions runs `pnpm lint && pnpm build && pnpm test:unit && pnpm test:e2e` on every PR
- Installed in Task 01

### 3.14 Responsive design — **Mobile-first, ≤720px primary**
- See §11 for full design system rules
- Breakpoints: `≤720px` (mobile primary) · `721–1024px` (tablet) · `>1024px` (desktop)
- Priority browsers: **Safari iOS, Chrome Android, Safari iPad**, then Chrome/Firefox desktop
- Bottom-sheet (shadcn `Drawer`) replaces `Dialog` and `Select` on mobile
- `useMediaQuery` hook drives conditional rendering

### 3.15 i18n readiness — **`t()` scaffold in v1**
- Lightweight helper returning PT strings from a flat map
- Swappable to `next-intl` in Phase 3 when EN/ES added
- Structure keeps strings in `apps/web/src/i18n/pt.ts` from day 1

### 3.16 Feature flags — **simple DB table**
- `FeatureFlag` table with `scope` (GLOBAL/TENANT/WORKSPACE/USER) + `key` + `value`
- Helper `isFeatureEnabled(flagKey, context)`
- Migrate to Unleash/LaunchDarkly only when justified

### 3.17 CSRF — **SameSite=Lax + Origin header check**
- Existing `session` cookie config adequate for Phase 1
- Revisit if embedded webviews appear

### 3.18 Observability & rate limiting — **deferred to Phase 3**
- Phase 1: structured logging via `pino` (console output)
- Phase 3: Sentry, Axiom, Upstash rate limiting

### 3.19 Push notifications — **Firebase Cloud Messaging (Web Push)**
- Phase 2 only
- Library: `firebase-admin` (server) + `firebase/messaging` (client)
- Web Push API for PWA support (no native mobile app in v1)

### 3.20 WhatsApp — **Meta Cloud API (direct, no aggregator)**
- Phase 2 only
- Notifications first, then interactive bot (same phase)
- Requires WABA approval — start submission early in Phase 2

---

## 4. Feature Sequencing Graph

### Phase 1 dependency order

```
[Template baseline] ✅
   │
   ├── 01 · Domain prerequisites (CUID2, base enums, testing Vitest+Playwright,
   │                               responsive base, t() helper, rule-engine skeleton)
   │
   ├── 02 · Tenant + TenantMembership
   │    └── 03 · Workspace + WorkspaceMembership
   │         └── 04 · Category (setor) — hybrid scope + vertical seed
   │              └── 05 · Specialty — hybrid scope + vertical seed
   │                   └── 06 · User profile + workspace specialty + onboarding
   │                        ├── 07 · Schedule (DRAFT/PUBLISHED/CLOSED)
   │                        │    └── 08 · Shift + ShiftPattern
   │                        │         └── 09 · ShiftAssignment (direct assign)
   │                        │              ├── 10 · Accept/Reject/Transfer flow
   │                        │              ├── 11 · OpenForApply + ShiftCandidate queue
   │                        │              ├── 12 · Request system (SWAP/OFFER/TIME_OFF)
   │                        │              │         └── depends on Supabase Storage setup
   │                        │              ├── 13 · Time tracking (Clock in/out + geo)
   │                        │              └── 14 · Shift Timeline (audit per shift)
   │                        └── 15 · Plan limit enforcement (cross-cutting)
   │
   └── 16 · In-app notification center (🔔 bell + events dispatcher)
         (skeleton only — channel adapters added in Phase 2)
```

### Phase 2 additions

```
17 · Email channel adapter (Resend + React Email templates for product notifs)
18 · Web Push adapter (Firebase Cloud Messaging)
19 · WhatsApp notification adapter (Meta Cloud API)
20 · WhatsApp interactive bot
21 · Shift Timeline public notes UX
22 · Advanced reports + dashboards
23 · Tenant-scope custom catalogs (promoted to Phase 2 if demand)
```

### Phase 3 additions

```
24 · Multi-tenant per SuperAdmin
25 · Custom roles / permissions (Opção C)
26 · SSO (WorkOS SAML/OIDC)
27 · Rate limiting (Upstash Redis)
28 · Error tracking (Sentry) + production logging (Axiom)
29 · SMS adapter (Twilio)
30 · Public API + tokens
31 · Payroll integrations (Senior, TOTVS, Contabilizei)
32 · MTE Portaria 671 compliance (AFD/AEJ)
33 · Shift Handoff Feed (private notes, photos)
```

---

## 5. Task Folder Index (Phase 1)

Every feature below gets a `docs/tasks/<slug>/` folder following the 5-phase workflow.

| # | Slug | Status | Summary | Blocks |
|---|---|---|---|---|
| 01 | `01-domain-prerequisites` | ✅ Done | CUID2, base enums, Vitest + Playwright + MSW, responsive base, `t()` helper, rule-engine skeleton | 02+ |
| 02 | `02-tenant-and-membership` | ✅ Done | `Tenant`, `TenantMembership`, SuperAdmin flows | 03+ |
| 03 | `03-workspace-and-membership` | ✅ Done | `Workspace`, `WorkspaceMembership`, Admin/Coord/Colab invites | 04+ |
| 04 | `04-category-setor` | ✅ Done | Hybrid-scope `Category` + Global seed (Hospital + Gym) | 08 |
| 05 | `05-specialty` | ✅ Done | Hybrid-scope `Specialty` + Global seed | 06 |
| 06 | `06-user-onboarding` | ✅ Done | Profile + workspace specialty + onboarding wizard | 07+ |
| 07 | `07-schedule-lifecycle` | ✅ Done | `Schedule` + DRAFT/PUBLISHED/CLOSED state machine | 08 |
| 08 | `08-shift-and-pattern` | ✅ Done | `Shift` + optional `ShiftPattern` generator | 09 |
| 09 | `09-assignment-direct` | ✅ Done | Direct assign flow, PENDING_ACCEPT state | 10 |
| 10 | `10-accept-reject-transfer` | ✅ Done | Accept / Reject (reason) / Transfer (reason + indicate + approval) | 16 |
| 11 | `11-open-for-apply-queue` | ✅ Done | OPEN_FOR_APPLY mode + FIFO ShiftCandidate queue | 16 |
| 12 | `12-request-system` | ✅ Done | Polymorphic Request (SWAP/OFFER/TIME_OFF) + Supabase Storage attachments | 16 |
| 13 | `13-time-tracking-clock` | ✅ Done | Clock In/Out + geolocation + overtime warning + CSV export | 14 |
| 14 | `14-shift-timeline` | ✅ Done | Per-shift audit log + public notes skeleton | — |
| 15 | `15-plan-limits` | ✅ Done | Quota enforcement (`PlanTier` enum + `Tenant.plan` + `Tenant.gracePeriodUntil`); `enforceQuota` wired into 7 create-paths; `PATCH /api/tenants/:id/plan` with 14-day grace on downgrade-with-violations; tenant-scope catalog endpoints (Corporate-only); read endpoints `GET .../plan-limits` (REST + GraphQL). | — |
| 16 | `16-in-app-notifications` | ✅ Done | 🔔 notification center + events dispatcher (in-app only, channel adapters are Phase 2) | — |

**Execution order (final):** 16 ✅ → 15 ✅. Phase 1a now complete.

Slugs are kebab-case with numeric prefix for chronological file listing.

---

## 6. Technical Gaps by Phase

### Phase 1 — libs installed per feature

| Lib / infra | Purpose | Feature |
|---|---|---|
| `@paralleldrive/cuid2` | Primary ID strategy | 01 |
| `date-fns-tz` | Timezone conversion | 01, 07, 08 |
| `vitest` + `@vitejs/plugin-react` + `@testing-library/react` | Unit/integration tests | 01 |
| `@playwright/test` | E2E tests | 01 |
| `msw` | HTTP mocking | 01 |
| `pino` + `pino-pretty` | Structured logging (dev) | 01 |
| `resend` + `@react-email/components` + `react-email` | Auth emails | 01 (baseline) |
| `@supabase/supabase-js` | File storage (Request attachments) | 12 |
| `react-hook-form` + `@hookform/resolvers` | Already in template ✅ | — |

### Phase 2 — external comms

| Lib / infra | Purpose |
|---|---|
| `firebase-admin` + `firebase` | Web Push via FCM |
| Meta Cloud API (WhatsApp Business) | WhatsApp — requires WABA approval |
| `@react-email/components` (existing) | Product notification templates |

### Phase 3 — infra & enterprise

| Lib / infra | Purpose |
|---|---|
| `@upstash/ratelimit` + `@upstash/redis` | Rate limiting |
| `@sentry/nextjs` | Error tracking |
| Axiom (via Vercel integration) | Production log aggregation |
| `workos` / `@workos-inc/node` | SSO (SAML/OIDC) |
| `twilio` | SMS |
| `next-intl` | Full i18n (EN/ES) |
| Custom | Payroll integrations (Senior, TOTVS, Contabilizei) |
| Custom | MTE 671 AFD/AEJ export |

### Infrastructure accounts needed

| Service | Phase | Purpose |
|---|---|---|
| Resend | 1 | Auth emails |
| Supabase | 1 (Task 12) | File storage only |
| Vercel | 1 | Hosting + Cron |
| Firebase | 2 | Push notifications (FCM) |
| Meta Cloud API (WABA) | 2 | WhatsApp |
| Upstash | 3 | Rate limiting |
| Sentry | 3 | Error tracking |
| Axiom | 3 | Log aggregation |
| WorkOS | 3 | SSO |
| Twilio | 3 | SMS |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Scope creep within Phase 1 CRUD | High | High | Strict 16-task list; new scope = Phase 1.5 deferral |
| Multi-tenant data leak bugs | Low | Critical | Row-level scope + integration tests on every feature + code review |
| Mobile-first regressions on desktop | Medium | Medium | Playwright runs viewport matrix (mobile + tablet + desktop) |
| Timezone handling regressions | Medium | High | `date-fns-tz` mandatory; no raw JS `Date` for time math |
| Free-tier abuse | Medium | Medium | Plan-limit enforcement (Task 15); rate limiting deferred to Phase 3 |
| WABA approval delay (Phase 2) | High | Medium | Start submission early; email works as fallback |
| Supabase vendor lock-in (Storage) | Low | Low | Encapsulate in `StorageAdapter` interface; swap for R2/S3 later if needed |
| File upload size DoS | Medium | Medium | Per-plan size limits + virus scan via Supabase hooks |
| LGPD audit finding | Low | High | Data export + deletion flows from Phase 1 |

---

## 8. Definition of Done (per phase)

### Phase 1 CRUD ships when:
- [ ] All 16 Phase-1 tasks have `validation.md` with passed QA
- [ ] Full domain CRUD functional end-to-end: Tenant → Workspace → Category/Specialty → Schedule → Shift → Assignment → Request → TimeEntry
- [ ] Happy path: register → create tenant → workspace → seed categories → invite → build draft schedule → assign → collaborators accept/reject/transfer → clock in/out → close shift → export CSV
- [ ] Request system (swap/offer/time-off) with Supabase Storage attachments working
- [ ] CLT soft warnings firing
- [ ] In-app 🔔 notification center populated
- [ ] Mobile-first UI: happy path verified on iPhone Safari + Android Chrome + iPad + desktop
- [ ] Vitest + Playwright tests green in CI (coverage target TBD)
- [ ] LGPD: data export endpoint per user + privacy policy page live
- [ ] `pnpm lint`, `pnpm build`, `pnpm test:unit`, `pnpm test:e2e` all green in CI

### Phase 2 External Comms ships when:
- [ ] Email channel adapter (Resend + React Email) delivering product notifications
- [ ] Web Push operational for logged-in PWA users
- [ ] WhatsApp notifications via Meta Cloud API live
- [ ] WhatsApp interactive bot responds to: view schedule, confirm shift, request swap, request time-off
- [ ] Shift Timeline public notes UX complete
- [ ] First Business-tier paying customer onboarded

### Phase 3 Infra & Enterprise ships when:
- [ ] Rate limiting active on auth + write endpoints
- [ ] Sentry capturing errors (prod) + Axiom receiving logs
- [ ] SSO via WorkOS in production (at least 1 IdP)
- [ ] Multi-tenant per SuperAdmin (Corporate plan) usable
- [ ] Custom roles / permissions (Opção C) configurable
- [ ] At least 1 payroll integration live (Senior or TOTVS)
- [ ] MTE 671 export passes auditor review
- [ ] SMS channel operational
- [ ] Public API (v1) + token management live
- [ ] First Corporate customer contract signed

---

## 9. Open decisions (resolved)

Decisions previously marked as provisional in this roadmap, now confirmed:

| # | Decision | Resolution |
|---|---|---|
| 1 | ID library | **CUID2** (@paralleldrive/cuid2) |
| 2 | File storage | **Supabase Storage** (from Task 12 onwards) |
| 3 | Email provider | **Resend** (auth-only in Phase 1, full in Phase 2) |
| 4 | Rate limiting | **Upstash Redis** (Phase 3 only) |
| 5 | Logging | **pino** dev (Phase 1), **Axiom** prod (Phase 3) |
| 6 | Error tracking | **Sentry** (Phase 3) |
| 7 | Testing | **Vitest + Playwright + MSW** from Task 01 |
| 8 | Soft delete | `isActive + deletedAt` |
| 9 | i18n readiness | `t()` scaffold in Phase 1; `next-intl` in Phase 3 |
| 10 | Push notifications | **Firebase Cloud Messaging** (Phase 2, Web Push for PWA) |
| 11 | WhatsApp | **Meta Cloud API** direct (Phase 2) |
| 12 | Notification scope in Phase 1 | **In-app only** (no email/push/WhatsApp product notifications) |
| 13 | Multi-tenant real | **Phase 3** (Corporate) |
| 14 | Mobile-first breakpoint | **≤720px primary**, Safari iOS priority |

All open decisions resolved; Phase 1 is cleared to start after user approval of this roadmap.

---

## 10. How to use this doc

- Reading a new task? Check §5 for the slug and §4 for its dependencies.
- Unsure which lib to install? Check §6.
- Need to know the big picture? Check §2 and §4.
- Changing a cross-cutting decision? Update §3 and cascade into affected tasks.
- Never append questions to this doc — take them to chat.

---

## 11. Design System Rules (summary — full rules in CLAUDE.md)

### Breakpoints

| Size | Range | Priority |
|---|---|---|
| **Mobile** | `≤ 720px` | 🥇 **Primary** — main focus, test first |
| **Tablet / iPad** | `721 – 1024px` | 🥈 Secondary |
| **Desktop** | `≥ 1025px` | 🥉 Tertiary |

### Priority browsers

1. **Safari iOS** (iPhone) — primary test target
2. **Chrome Android**
3. **Safari iPad**
4. Chrome / Firefox desktop

### Mobile UI patterns (`≤720px`)

| Desktop pattern | Mobile replacement |
|---|---|
| `Dialog` (modal) | `Drawer` (bottom sheet) from shadcn |
| `Select` | `Drawer` (bottom sheet list) |
| `DropdownMenu` | `Drawer` with list of actions |
| `Table` | Card-based list layout |
| Horizontal nav | Bottom tab bar OR hamburger drawer |

### Rules

- **`useMediaQuery('(max-width: 720px)')`** drives conditional rendering
- **Full-width inputs** on mobile (`w-full`) with `min-h-12` for touch targets
- **Safe area insets** (`pb-safe`, `pt-safe`) respected for iOS notch/home indicator
- **Sticky bottom action bar** on mobile forms (primary CTA always visible)
- **No hover-only interactions** on mobile (all actions tappable)

Full rules in CLAUDE.md — Responsive Design section.

---

*End of roadmap. Next action: begin Task 16 `16-in-app-notifications` with brief.md (notification center + events dispatcher reading the same audit-log surface that Task 14 projects).*
