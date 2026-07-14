# Movux — API Roadmap (Phase 1a)

**Status:** In progress — 14 of 16 tasks done (87.5%)
**Last updated:** 2026-04-28
**Owner:** David Lucas

> **Done:** Tasks 01–14. **Remaining:** 16 (next), then 15.
> **Aggregate at this checkpoint:** 534 unit tests + 345 API E2E specs passing.
**Companion docs:**
- [`BUSINESS-FOUNDATION.md`](BUSINESS-FOUNDATION.md) — domain decisions (18)
- [`ROADMAP.md`](ROADMAP.md) — overall phase map + cross-cutting decisions
- [`API-ARCHITECTURE.md`](API-ARCHITECTURE.md) — Route → UseCase → Repository patterns

---

## 1. Purpose

Dedicated roadmap for **API-first** execution. Phase 1 of the overall roadmap is split into:

```
Phase 1a — API & Domain (this doc)  → build all endpoints + business logic
Phase 1b — Frontend                 → build UI consuming the API
```

Phase 1a deliverables:
- Complete Prisma schema for the domain
- Repository + use case layers
- REST routes (Swagger-documented)
- GraphQL types/queries/mutations alongside REST
- Unit tests (Vitest) + API E2E tests (Playwright `request`)
- Rule engine wiring for CLT soft rules
- Server-side notification events (in-app persistence only — channels in Phase 2)

---

## 2. Position in the overall roadmap

- Phase 0  ✅ Foundation docs
- Phase 1 (originally) → split into:
  - **Phase 1a** → this document (API backend)
  - **Phase 1b** → frontend (defined after 1a wraps)
- Phase 2 External Comms — unchanged (email, push, WhatsApp)
- Phase 3 Infra & Enterprise — unchanged (rate limit, SSO, compliance, payroll)

Task 01 (Domain Prerequisites) remains shared — it's already done and unblocks everything below.

---

## 3. Contract per API task

Every task in §4 MUST deliver:

### Code

| Layer | File(s) | Requirement |
|---|---|---|
| **Prisma** | `apps/web/prisma/schema.prisma` | New/updated models + explicit `@@index` where queries demand |
| **Migration** | `apps/web/prisma/migrations/<timestamp>_<slug>/` | Generated via `pnpm db:migrate` with descriptive name |
| **Repository** | `src/server/repositories/<name>.repository.ts` | Interface + factory function; no business logic |
| **Use case(s)** | `src/server/use-cases/<domain>/<action>.use-case.ts` | Return discriminated union `{ success: true; data } \| { success: false; code }`; receive repos as params |
| **Zod schema** | `src/server/schemas/<domain>.schema.ts` | Input validation, `z.email()`, `z.uuid()`, etc. |
| **REST route** | `src/app/api/<path>/route.ts` | Thin: parse → validate → call use case → map result → NextResponse |
| **Swagger** | `src/lib/swagger/definitions/<domain>.ts` | JSDoc annotations per endpoint |
| **GraphQL** | `src/server/graphql/types/<name>.type.ts`, `queries/<name>.query.ts`, `mutations/<name>.mutation.ts` | Pothos types + resolvers mirroring REST use cases |
| **Use case exports** | `src/server/use-cases/index.ts` | Add exports for new use cases |
| **Repository exports** | `src/server/repositories/index.ts` | Wire with `prisma` |

### Tests (all required, not P1)

| Kind | Location | What it verifies |
|---|---|---|
| **Unit (Vitest)** | `src/server/use-cases/<domain>/__tests__/<action>.test.ts` | Use case logic with in-memory repo mocks — covers state machine branches, guard conditions, discriminated union paths |
| **API E2E (Playwright)** | `tests/api/<domain>.api.spec.ts` | Real HTTP against ephemeral Postgres (test DB) using Playwright's `request` fixture; verifies HTTP status + body shape + DB side-effects |

**API E2E matrix per endpoint** (must cover all that apply):
- ✅ Happy path — 2xx + expected body
- ✅ Unauthenticated — no cookie → **401**
- ✅ Forbidden (if RBAC) — wrong role → **403**
- ✅ Not found — nonexistent id → **404**
- ✅ Invalid UUID — bad id format → **400**
- ✅ Invalid body — missing fields, bad types → **400 + `{ details: [...] }`**
- ✅ Business rule violation — conflict, duplicate, wrong state → **409**
- ✅ DB side-effect — query DB afterwards to confirm persistence

### Cross-cutting obligations

Every task also:
- Applies the audit pattern (`AuditLog` insert on writes — via repository or use case hook)
- Respects soft-delete conventions (`isActive` + `deletedAt` where relevant — ROADMAP.md §3.4)
- Respects timezone UTC-in-DB rule (§3.3)
- Uses CUID2 `@default(uuid())` — Prisma-generated (ROADMAP.md §3.1)
- Adds `t()` keys for any user-facing error message surfaced to the UI later
- Wires any new notification event through the Phase-1 in-app dispatcher (task 16 scaffolds it)

---

## 4. Task list — Phase 1a

Each task follows the full 5-phase workflow (brief → exploration → research → plan → execution) inside `docs/tasks/<slug>/`.

### Dependency graph (condensed)

```
01 ✅
 └── 02 Tenant
      └── 03 Workspace
           ├── 04 Category
           │    └── 08 Shift (needs category)
           ├── 05 Specialty
           │    └── 06 User profile + workspace specialty
           │         └── 07 Schedule
           │              └── 08 Shift + ShiftPattern
           │                   └── 09 Assignment (direct)
           │                        ├── 10 Accept/Reject/Transfer
           │                        ├── 11 OpenForApply + queue
           │                        ├── 12 Request system (+ Supabase Storage)
           │                        ├── 13 Time tracking
           │                        └── 14 Shift Timeline
           └── 15 Plan limits (cross-cutting, applied to all creates)

 └── 16 Notifications (cross-cutting dispatcher; hooks from 09-13 fire events)
```

### Task 02 — `02-tenant-and-membership`

**Summary:** Tenant container + SuperAdmin membership.
**Depends on:** 01 ✅
**Entities:** `Tenant`, `TenantMembership`
**REST endpoints (primary):**
- `POST   /api/tenants` — create tenant (caller becomes SuperAdmin)
- `GET    /api/tenants` — list tenants visible to user
- `GET    /api/tenants/:id` — tenant detail (SuperAdmin of that tenant)
- `PATCH  /api/tenants/:id` — update name/timezone
- `DELETE /api/tenants/:id` — soft delete (SuperAdmin only)
- `POST   /api/tenants/:id/members` — add SuperAdmin member by email (Corporate plan only per plan-limit check in task 15)
- `DELETE /api/tenants/:id/members/:memberId` — remove (not last SuperAdmin)

**GraphQL:** `Tenant` type + `me.tenants` query + mutations mirroring REST.
**Notes:** Corporate-plan constraint enforced here (max tenants per SuperAdmin) — skipped until task 15; for now allow free creation but mark with TODO.

---

### Task 03 — `03-workspace-and-membership`

**Summary:** Workspace inside a Tenant + Admin/Coordenador/Colaborador memberships.
**Depends on:** 02
**Entities:** `Workspace`, `WorkspaceMembership` (with `role: ADMIN | COORDENADOR | COLABORADOR`)
**REST endpoints:**
- `POST   /api/workspaces` — create workspace under a tenant
- `GET    /api/workspaces` — list workspaces the caller belongs to
- `GET    /api/tenants/:id/workspaces` — list workspaces in a tenant (SUPER_ADMIN only)
- `GET    /api/workspaces/:id` — detail (role-filtered: ADMIN sees memberships inline)
- `PATCH  /api/workspaces/:id` — update name/timezone/vertical
- `DELETE /api/workspaces/:id` — soft delete
- `POST   /api/workspaces/:id/members` — invite by email with role
- `PATCH  /api/workspaces/:id/members/:memberId` — change role
- `DELETE /api/workspaces/:id/members/:memberId` — remove (not last Admin)

**GraphQL:** `Workspace` + `WorkspaceMembership` types, enums `WorkspaceRole` + `WorkspaceVertical`, queries `myWorkspaces` + `workspace(id)`, 5 mutations.
**Notes:** `vertical: 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'` on Workspace — Task 04 seeds a distinct Global catalog per vertical.

---

### Task 04 — `04-category-setor` ✅ Done

**Summary:** Category (setor) with hybrid scope + override merged list.
**Depends on:** 03
**Entities:** `Category` (fields: `scope: GLOBAL | TENANT | WORKSPACE`, `vertical`, `slug`, `name`, `description?`, `isActive`) + unique index `(scope, vertical, tenant_id, workspace_id, slug) NULLS NOT DISTINCT`.
**Seed:** Hospital (7) + Clinic (6) + Gym (6) + Other (1) globals per BUSINESS-FOUNDATION.md §7.3. **Local-only** via `pnpm --filter web db:seed`.
**REST endpoints:**
- `POST   /api/workspaces/:id/categories` — create WORKSPACE-scoped (plan-limit hook — Task 15 ✅ enforces `categoriesPerWorkspace`)
- `GET    /api/workspaces/:id/categories` — merged list (WORKSPACE > TENANT > GLOBAL override; `source` field)
- `PATCH  /api/workspaces/:id/categories/:categoryId` — edit Workspace-scope only
- `DELETE /api/workspaces/:id/categories/:categoryId` — soft delete Workspace-scope only (409 CANNOT_DELETE_GERAL)

**GraphQL:** `CategoryUnion = GlobalCategory | TenantCategory | WorkspaceCategory`, query `workspaceCategories`, 3 mutations.
**Tenant-scope** endpoints mirrored at `/api/tenants/:id/categories` (Corporate plan only — gated by `tenantScopedCatalogs` boolean in Task 15; route activation deferred to follow-up — repository write-path is ready, REST POST endpoint not yet wired).
**Notes:** Default "Geral" category auto-created in the same transaction as `createWorkspace` (patch to Task 03). Seeding script: `apps/web/prisma/seed/categories.ts`.

---

### Task 05 — `05-specialty` ✅ Done

**Summary:** Specialty (profissão) with hybrid scope. Structural clone of Category.
**Depends on:** 03, 04
**Entities:** `Specialty` (same shape as Category; separate table; own `NULLS NOT DISTINCT` unique)
**Seed:** 23 GLOBAL rows — HOSPITAL (8) + CLINIC (7, own catalog incl. `dentist`) + GYM (7) + OTHER (1 `general_staff`). Local-only via `pnpm --filter web db:seed` (composite with categories).
**REST endpoints:** `/api/workspaces/:id/specialties` + `/:specialtyId` — POST/GET/PATCH/DELETE.
**GraphQL:** single `Specialty` type with `source: SpecialtyScope` field (diverges from Task 04 Category's union — deliberate, documented in research.md §5).
**Slug regex:** extended to allow underscores (`[a-z0-9_-]`) for specialty-specific slugs like `nurse_tech`, `medical_intern`.
**Notes:** 1 specialty per user per workspace — enforced in Task 06 when assigning to users.

---

### Task 06 — `06-user-profile-and-workspace-specialty` ✅ Done

**Summary:** Extend User profile (6 new fields) + link user → specialty per workspace with reassignment history.
**Depends on:** 03, 05
**Entities:** `UserSpecialty` pivot (`userId`, `workspaceId`, `specialtyId`, `isActive`; no unique — soft-delete + create new on reassignment)
**User profile fields (new):** `avatarUrl`, `dateOfBirth`, `bio`, `whatsappOptIn`, `emergencyContactName`, `emergencyContactPhone`
**REST endpoints:**
- `PATCH  /api/me` — extended with 6 new fields + audit log
- `GET    /api/workspaces/:id/members/:memberId` — detail with user + specialty inline
- `PATCH  /api/workspaces/:id/members/:memberId/specialty` — set (ADMIN or COORDENADOR); validates specialty is accessible to the workspace
- `DELETE /api/workspaces/:id/members/:memberId/specialty` — unset (ADMIN or COORDENADOR)

**GraphQL:** `User` gains 6 fields, `myWorkspaceSpecialties: [WorkspaceSpecialtyAssignment!]!` root query, 2 new mutations.
**New error codes:** `SPECIALTY_NOT_IN_WORKSPACE` (404), `CANNOT_DELETE_IN_USE` (409), `TARGET_MEMBER_NOT_FOUND` (404).
**Patch to Task 05:** `softDeleteWorkspaceSpecialty` checks active UserSpecialty refs → returns 409 `CANNOT_DELETE_IN_USE`.
**Auth helper (new):** `assertAdminOrCoordenadorOfWorkspace`.

---

### Task 07 — `07-schedule-lifecycle` ✅ Done

**Summary:** Schedule (Escala) entity + DRAFT / PUBLISHED / CLOSED state machine with overlap guard and hybrid delete.
**Depends on:** 04, 06
**Entities:** `Schedule` (`workspaceId`, `categoryId`, `name?`, `periodStart`, `periodEnd`, `status`, `publishedAt`, `closedAt`, `deletedAt`, `isActive`)
**Auth:** `ADMIN` or `COORDENADOR` for writes; any active member for reads.
**REST endpoints (7):**
- `POST   /api/workspaces/:id/schedules` — create DRAFT
- `GET    /api/workspaces/:id/schedules` — list with filters (status, categoryId, from, to, cursor, limit)
- `GET    /api/workspaces/:id/schedules/:scheduleId` — detail
- `PATCH  /api/workspaces/:id/schedules/:scheduleId` — edit metadata (DRAFT only)
- `POST   /api/workspaces/:id/schedules/:scheduleId/publish` — DRAFT → PUBLISHED
- `POST   /api/workspaces/:id/schedules/:scheduleId/close` — PUBLISHED → CLOSED (returns `{ schedule, closedEarly }`)
- `DELETE /api/workspaces/:id/schedules/:scheduleId` — hard-delete DRAFT, soft-delete PUBLISHED/CLOSED

**GraphQL:** `Schedule` + `ScheduleStatus` enum + `CloseScheduleResult` + 2 queries + 5 mutations.
**Overlap guard:** `[periodStart, periodEnd)` half-open. Active (DRAFT/PUBLISHED) schedules in same `(workspaceId, categoryId)` cannot overlap → 409 `SCHEDULE_PERIOD_OVERLAP`.
**State transitions:** invalid → 409 `INVALID_STATE_TRANSITION`.
**Notes:** Publishing + closing trigger notification stubs (Task 16 wires Resend/WhatsApp). Called fire-and-forget after tx commits.

---

### Task 08 — `08-shift-and-pattern` ✅ Done

**Summary:** Shift (timestamps, headcount) + ShiftExpectedComposition + optional ShiftPattern generator.
**Depends on:** 04, 07 ✅
**Entities:** `Shift`, `ShiftPattern`, `ShiftExpectedComposition` + `ShiftStatus { OPEN, FILLED, CANCELLED, COMPLETED }`
**Fields (Shift):** `scheduleId`, `categoryId`, `patternId?`, `startAt`, `endAt`, `headcount`, `status`, `notes?`, `cancelledAt?`, `cancelReason?`
**REST endpoints (workspace-nested for auth + audit consistency):**
- `POST   /api/workspaces/:id/schedules/:scheduleId/shifts` — create shift (parent must be DRAFT)
- `GET    /api/workspaces/:id/schedules/:scheduleId/shifts` — list with filters (status, categoryId, fromAt, toAt, cursor, limit)
- `GET    /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId` — detail with embedded `expectedComposition`
- `PATCH  /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId` — edit (parent must be DRAFT)
- `DELETE /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId` — DRAFT hard / PUBLISHED → status=CANCELLED / CLOSED 409
- `PATCH  /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId/expected-composition` — replace `[{ specialtyId, count }]`
- `POST   /api/workspaces/:id/schedules/:scheduleId/patterns` — create pattern
- `POST   /api/workspaces/:id/schedules/:scheduleId/patterns/:patternId/generate` — generate (max 90 days, idempotent via `(patternId, startAt)` unique)

**GraphQL:** `ShiftStatus` enum, `Shift` + `ShiftPattern` + `ShiftExpectedComposition` + `GeneratePatternResult` types, 2 queries + 6 mutations.
**New error codes:** `SHIFT_TIME_INVALID` (400), `PATTERN_RANGE_TOO_LARGE` (409). Reuses `INVALID_STATE_TRANSITION`, `SPECIALTY_NOT_IN_WORKSPACE`.
**Patch to Task 06:** `softDeleteWorkspaceSpecialty` now also blocks when `ShiftExpectedComposition` references the specialty.
**Time math:** UTC-only via `lib/shift-time.ts`. DST handling deferred (BR has no DST).
**Notes:** Cross-midnight via `crossesMidnight: true` in pattern (endTime < startTime). Pattern generator uses `prisma.shift.createMany({ skipDuplicates: true })` and reports `{ generated, skipped }`.

---

### Task 09 — `09-assignment-direct` ✅ Done

**Summary:** ShiftAssignment — direct assign flow with PENDING_ACCEPT state, cross-workspace overlap detection + alternatives, headcount enforcement, composition status.
**Depends on:** 08 ✅
**Entities:** `ShiftAssignment` (`shiftId`, `userId`, `assignedByUserId`, `status`, `decisionDeadline`, `decidedAt`, `rejectionReason`) + `AssignmentStatus` enum (PENDING_ACCEPT, ACCEPTED, REJECTED, EXPIRED, CANCELLED, TRANSFERRED, COMPLETED)
**Patch to Task 08:** `Shift.decisionWindowHours Int @default(48)` field added.
**REST endpoints (dual surface — workspace-nested + flat):**
- `POST   /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId/assignments` — bulk atomic assign
- `GET    /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId/assignments` — list with compositionStatus
- `DELETE /api/workspaces/:id/schedules/:scheduleId/shifts/:shiftId/assignments/:assignmentId` — unassign PENDING
- `GET    /api/assignments/:assignmentId` — flat detail (used by Tasks 10+)
- `DELETE /api/assignments/:assignmentId` — flat unassign

**GraphQL:** `AssignmentStatus` enum + `CompositionStatus` enum (MATCH/MISMATCH/UNKNOWN), `Assignment` type, 2 queries + 2 mutations. `assignUsersToShift` surfaces conflicts + alternatives via `gqlError` extensions.
**New error codes:** `SHIFT_HEADCOUNT_FULL` (409), `SHIFT_OVERLAP_CONFLICT` (409, response includes `details.conflicts[]` + `details.alternatives[]`), `USER_NOT_WORKSPACE_MEMBER` (404).
**State guard:** schedule must be `PUBLISHED` to assign. Self-assign by ADMIN/COORDENADOR auto-creates with `status=ACCEPTED`.
**Notes:** Cross-workspace overlap query joins `shiftAssignment` → `shift`. Alternatives are up to 5 same-category PUBLISHED OPEN shifts not overlapping the user's other active assignments. Audit emits one `ASSIGNMENT_CREATED` row per assignment (not per bulk call).

---

### Task 10 — `10-accept-reject-transfer` ✅ Done

**Summary:** Accept/Reject/Transfer on assignments. Q1 Ideal: ADMIN/COORD can override (reject on-behalf, force-accept). Q7 Ideal: self-assigned ACCEPTED can only exit via transfer.
**Depends on:** 09 ✅
**Entities added:** `TransferRequest` + `TransferRequestStatus` enum (PENDING, APPROVED, REJECTED, CANCELLED)
**REST endpoints (7 — flat surface):**
- `POST   /api/assignments/:id/accept` — assignee, in window
- `POST   /api/assignments/:id/reject` — assignee or ADMIN/COORD on-behalf; body `{ reason }`
- `POST   /api/assignments/:id/force-accept` — ADMIN/COORD; bypasses window; revives EXPIRED
- `POST   /api/assignments/:id/transfer` — assignee creates TransferRequest; body `{ targetUserId, reason }`
- `POST   /api/transfer-requests/:id/decide` — ADMIN/COORD; body `{ decision: 'APPROVE'|'REJECT', reason? }`
- `POST   /api/transfer-requests/:id/cancel` — original requester only
- `GET    /api/workspaces/:id/transfer-requests?status=&cursor=&limit=` — ADMIN/COORD list

**GraphQL:** `TransferRequest` type + 2 enums + 1 query + 6 mutations.
**New error code:** `DECISION_WINDOW_EXPIRED` (409).
**Auto-FILL ↔ UNFILL:** `Shift.status` flips OPEN ↔ FILLED across accept/forceAccept/admin-reject/transfer-approve.
**New deadline on approve transfer:** `min(now+windowHours, shiftStartAt-1h, now+15min)` clamping.
**Audit:** per-entity rows; transfer-approve emits 4 (TRANSFER_APPROVED, ASSIGNMENT_TRANSFERRED, ASSIGNMENT_CREATED, optional SHIFT_UNFILLED).

---

### Task 11 — `11-open-for-apply-queue` ✅ Done

**Summary:** `Shift.assignmentMode = OPEN_FOR_APPLY` activates a FIFO `ShiftCandidate` queue. Mutual exclusion with DIRECT_ASSIGN. Apply / withdraw / approve / reject with autoAccept option.
**Depends on:** 09 ✅
**Entities added:** `ShiftCandidate` + `ShiftCandidateStatus` enum (QUEUED, APPROVED, REJECTED, WITHDRAWN). Patches `Shift` with `assignmentMode ShiftAssignmentMode @default(DIRECT_ASSIGN)` field.
**REST endpoints (7 — flat surface):**
- `POST   /api/shifts/:shiftId/apply` — colab opts into FIFO queue
- `GET    /api/shifts/:shiftId/candidates` — ADMIN/COORD only; status filter
- `GET    /api/shifts/:shiftId/candidates/me` — caller's own candidacy or null + queue count
- `GET    /api/shifts/:shiftId/candidates/count` — any active member; QUEUED count
- `POST   /api/candidates/:id/approve` — ADMIN/COORD; body `{ autoAccept?: bool }` (RQ4 Ideal: if true, creates ACCEPTED assignment + auto-FILL; else PENDING_ACCEPT)
- `POST   /api/candidates/:id/reject` — ADMIN/COORD; body `{ reason: string }` required (RQ7 Ideal)
- `POST   /api/candidates/:id/withdraw` — owner only

**GraphQL:** 2 enums + 2 types (ShiftCandidate + MyCandidacy) + 3 queries + 4 mutations. Shift type extended with `assignmentMode`.
**Race protection:** `@@unique([shiftId, queuePosition])` + `MAX(position)+1` with retry on conflict; `updateIfQueued` atomic flip on approve.
**Cross-task patches:**
- `assignUsersToShift` (Task 09) blocks `OPEN_FOR_APPLY` shifts (mutual exclusion)
- `updateShift` (Task 08) blocks mode-change when QUEUED candidates exist (RQ8)

**No new error codes** — reuses ALREADY_EXISTS, SHIFT_HEADCOUNT_FULL, SHIFT_OVERLAP_CONFLICT, INVALID_STATE_TRANSITION.

---

### Task 12 — `12-request-system` ✅ Done

**Summary:** Polymorphic `Request` model (SWAP / OFFER / TIME_OFF) for post-publication mutations + Supabase Storage for TIME_OFF attachments.
**Depends on:** 09 ✅, 10 ✅, 11 ✅
**Entities added:** `Request` (single polymorphic table with 4 CHECK constraints enforcing per-type column integrity) + `RequestType` enum + `RequestStatus` enum (PENDING_PEER, PENDING, APPROVED, REJECTED, CANCELLED). Also makes `ShiftAssignment.userId` **nullable** to enable atomic 3-step SWAP via NULL-window inside a transaction.
**Infrastructure:** **First Supabase Storage integration** — `@supabase/supabase-js` + pronai-style direct module (`getSupabaseAdmin`, `uploadFile`, `deleteFile`, `fileExists`); single-shot server-side multipart upload, no presigned URLs (research §5).

**REST endpoints (5 — flat surface):**
- `POST   /api/requests` — discriminated body (`type: SWAP | OFFER | TIME_OFF`); supports JSON or `multipart/form-data` (the latter for TIME_OFF attachments)
- `GET    /api/requests?workspaceId&scope=mine|workspace&status?&type?` — Colaborador sees own; Coord/Admin can scope=workspace to see all
- `GET    /api/requests/:requestId` — detail; visible to participants + workspace coord/admin
- `POST   /api/requests/:requestId/cancel` — requester-only; valid in `PENDING_PEER | PENDING`
- `POST   /api/requests/:requestId/peer-respond` — SWAP-only; target peer ACCEPT/REJECT
- `POST   /api/requests/:requestId/resolve` — Coord/Admin; APPROVE/REJECT

**GraphQL:** 5 enums (RequestType, RequestStatus, PeerRespondDecision, RequestResolveDecision, RequestScope) + Request SimpleObject + RequestDetails union (SwapDetails | OfferDetails | TimeOffDetails) + 2 queries (`requests`, `request`) + 5 mutations (`submitSwapRequest`, `submitOfferRequest`, `submitTimeOffRequest`, `cancelRequest`, `peerRespondSwapRequest`, `resolveRequest`).

**Side-effects per APPROVE:**
- **SWAP**: atomic 3-step userId rotation (NULL → target → source) inside `prisma.$transaction`; Postgres unique index treats NULLs as distinct
- **OFFER**: flips `Shift.assignmentMode` to OPEN_FOR_APPLY; requester stays ACCEPTED until a Task-11 candidate accepts the replacement (closure handled by patched `acceptAssignment`)
- **TIME_OFF**: cascade-cancel overlapping ACCEPTED/PENDING_ACCEPT assignments for the requester; cap of 50 → 409 `TIME_OFF_TOO_LARGE`

**Cross-task patches:**
- `accept-assignment.use-case.ts` (Task 10) cancels other ACCEPTED assignments on the same shift when the shift is in OPEN_FOR_APPLY mode (OFFER closure)
- `assignment.repository.AssignmentWithShiftRow.shift` now exposes `assignmentMode`; new method `findForUserInRange` for TIME_OFF cascade

**New error codes:** `ATTACHMENT_INVALID` (400), `ATTACHMENT_UPLOAD_FAILED` (502), `TIME_OFF_TOO_LARGE` (409). Reuses `INVALID_STATE_TRANSITION`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

**Attachment policy:** Server-side multipart upload to bucket `request-attachments` (private). MIME whitelist `application/pdf | image/png | image/jpeg | image/webp`. Max 5 MiB. Helper `parseAttachmentField(formData)` validates pre-upload. On business-rule failure post-upload, `deleteFile` rolls the blob back. Per-plan attachment quota deferred to Task 15.

**Notifications:** Task 12 emits audit-log entries only. Task 16 wires the dispatcher.

---

### Task 13 — `13-time-tracking-clock` ✅ Done

**Summary:** Clock In/Out per assignment with optional GPS, tolerance + overtime computation, Coord-driven closure (`PENDING_CLOSURE → COMPLETED` per BF §9.7), and JSON/CSV export of workspace time entries.
**Depends on:** 09 ✅, 10 ✅, 12 ✅
**Entities added:** `TimeEntry` model (one row per assignment, `@unique` on `shiftAssignmentId`) + `PENDING_CLOSURE` value on `AssignmentStatus` enum + `Workspace.clockToleranceMinutes` (default 15).
**Infrastructure:** First non-JSON `Response` in the codebase (CSV branch returns `text/csv` + `Content-Disposition: attachment`). In-house RFC-4180 CSV serializer (`~/server/lib/csv.ts`, no new dep). CLT soft-rule engine (Task 01 skeleton) wired with 2 rules: 11h inter-shift rest + 44h weekly hours, both warnings only.

**REST endpoints (4):**
- `POST   /api/assignments/:assignmentId/clock-in` — assignee only; body `{ lat?, lng? }`; 201 creates `TimeEntry` with computed `clockInWithinTolerance`; idempotent (409 `ALREADY_CLOCKED_IN`)
- `POST   /api/assignments/:assignmentId/clock-out` — assignee; flips `ACCEPTED → PENDING_CLOSURE`; computes `overtimeMinutes`; emits CLT warnings as audit-log entries (never blocks)
- `POST   /api/assignments/:assignmentId/close` — Coord/Admin; flips `PENDING_CLOSURE → COMPLETED`; sets `closedAt`/`closedByUserId`/`notes?`
- `GET    /api/workspaces/:id/time-entries?format=json|csv&from&to&userId&cursor&limit` — Coord/Admin; default range = current month; CSV cap 50 000 rows → 409 `EXPORT_TOO_LARGE`

**GraphQL:** `TimeEntryStatusEnum` (synthetic `OPEN | CLOCKED_OUT | CLOSED`), `ClockLocation` + `TimeEntry` SimpleObjects + 1 query (`timeEntriesForWorkspace`) + 3 mutations (`clockIn`, `clockOut`, `closeAssignment`). CSV stays REST-only (Q5 Good).

**State machine:** `ACCEPTED → ACCEPTED (clock-in) → PENDING_CLOSURE (clock-out) → COMPLETED (close)`. Re-clock impossible by design (status no longer ACCEPTED).

**Tolerance + overtime math** (`~/server/lib/clock-tolerance.ts`):
- `isWithinTolerance` — symmetric ±toleranceMinutes window, inclusive on both edges (Q8 Fast)
- `computeOvertimeMinutes` — `max(0, ceil((clockOut - shiftEnd) / 60s))`

**CLT rule engine** (`~/server/rule-engine/clt-rules.ts`):
- `CLT_MIN_INTER_SHIFT_REST` — fires when `clockOutAt - lastClockOutAt < 11h`
- `CLT_MAX_WEEKLY_HOURS` — fires when `hoursThisWeek > 44`
- Both `severity: 'warning'` only; logged as `CLT_RULE_WARNING` audit entries

**New error codes:** `ALREADY_CLOCKED_IN` (409), `EXPORT_TOO_LARGE` (409). Reuses `INVALID_STATE_TRANSITION`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

**Cross-task patches:** none required — `accept-assignment` (Task 10) and `findByIdWithShiftAndSchedule` (Task 12 already exposed `assignmentMode`) work as-is.

**Notes:** Geolocation is optional (lat+lng must be provided together); no geofence in v1. Plan-tier gating (Free can't use geo/CSV) deferred to Task 15. Auto-`NO_SHOW` cron deferred to Phase 3. ShiftTimeline subscriber for `TIME_ENTRY_CLOCK_IN/OUT` + `ASSIGNMENT_COMPLETED` audit events lands in Task 14.

---

### Task 14 — `14-shift-timeline` ✅ Done

**Summary:** Per-shift event timeline projected from `auditLog` plus public notes (BF §7.12). No new event table — read-side projection avoids dual-write across ~22 emit sites.
**Depends on:** 08, 09, 10, 11, 12, 13 (all done).
**Entities added:** `ShiftTimelineNote` (one row per public note; append-only in v1) — events themselves are projected from `auditLog`.
**Event types:** 36 values (BF §7.12 vocabulary expanded for granularity, e.g. distinguishing `ASSIGNMENT_CANCELLED_BY_OFFER` from `_BY_TIME_OFF`).

**Audit emit-site patches (Step 2):**
- 4 TRANSFER_REQUEST emits gain `metadata.shiftId`
- 6 REQUEST emits gain `metadata.{sourceShiftId, targetShiftId, shiftId, type}` per the request type. TIME_OFF skipped — its cascade is covered by `ASSIGNMENT_CANCELLED_BY_TIME_OFF`.

**Read projection (`~/server/lib/shift-timeline-projection.ts`):**
- Pure table-driven map from `audit.action` → `ShiftTimelineEventType`
- `REQUEST_REJECTED` / `REQUEST_CANCELLED` discriminated by `metadata.type`
- `SHIFT_TIMELINE_NOTE_ADDED` audits return null (de-dup; surfaced from notes table with full body)
- Unknown actions return null (forward-compatible)

**REST endpoints (2):**
- `GET    /api/shifts/:shiftId/timeline?order=asc|desc&since=ISO&cursor=&limit=` — participant or Coord/Admin
- `POST   /api/shifts/:shiftId/timeline/notes` — body `{ note }` (1..2000, trimmed); same auth

**GraphQL:** `ShiftTimelineEventTypeEnum` (36 values) + `ShiftTimelineEvent` SimpleObject + `JSON` scalar (first arbitrary-payload scalar in repo) + `shiftTimeline` query + `addShiftTimelineNote` mutation.

**Authorization (Q8 split):**
- Anonymous → 401
- Outsider (not workspace member) → 404 (hides existence)
- Workspace member but not participant → 403
- Participant (active assignee, candidate, swap-target) or Coord/Admin → 200

**`auditLogRepo.listForShift`** filters via 4-OR JSON path (`entityType=SHIFT` + `metadata.{shiftId,sourceShiftId,targetShiftId}`), cursor pagination on `(createdAt, id)`, optional `since`, asc|desc.

**No new error codes.** Reuses `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`.

**Notes:** Notes are append-only in v1 (Q6 Fast). TIME_OFF request-level events excluded from per-shift timeline; cascade is preserved via `ASSIGNMENT_CANCELLED_BY_TIME_OFF` per-assignment audits.

---

### Task 15 — `15-plan-limits`

**Summary:** Cross-cutting plan quota enforcement.
**Depends on:** 02-14 (wraps create endpoints)
**Entities:** `PlanLimit` seed table (`plan`, `dimension`, `limit`) — immutable reference data
**Wiring:** middleware / helper invoked on `POST`/invite endpoints in 02, 03, 04, 05, 12, 16
**REST endpoints:**
- `GET  /api/plan/usage` — current usage vs limits for the user's tenants/workspaces

**Notes:** Plan enforcement is soft in v1 — blocks further creates with 402/403 + message; doesn't downgrade existing data.

---

### Task 16 — `16-in-app-notifications`

**Summary:** Server-side notification dispatcher + in-app persistence only.
**Depends on:** 09 onward (subscribers emit events)
**Entities:** `Notification` (`userId`, `type`, `payload JSON`, `readAt?`, `createdAt`), `NotificationPreference` (per-user per-type per-channel opt-in/out)
**REST endpoints:**
- `GET    /api/me/notifications?status=unread|all`
- `POST   /api/me/notifications/:id/read`
- `POST   /api/me/notifications/read-all`
- `PATCH  /api/me/notification-preferences` — update per-channel opt-ins

**Dispatcher:** fan-out scaffold per ROADMAP.md §3.9 — in-app adapter live in v1; email/push/WhatsApp adapters are no-ops until Phase 2.
**Event sources (subscribers):** publish triggers from tasks 07-13 (schedule published, shift assigned, request received, etc.).
**Notes:** Per-workspace notification settings in future — Phase 2 refinement.

---

## 5. Testing strategy

### 5.1 Vitest (unit, use-case level)

- Each use case gets `<action>.test.ts`
- In-memory repo mocks — no real Prisma, no DB
- Covers: discriminated union branches, state guards, input edge cases, error codes
- Target runtime: **< 3s** for the whole suite through task 16 (pure logic is fast)

### 5.2 Playwright API E2E

- Location: `apps/web/tests/api/<domain>.api.spec.ts`
- Uses Playwright's built-in `request` fixture (no browser)
- Runs against a **dedicated test Postgres** (Docker — `movux-test` on port 5433)
- Reset strategy: `prisma migrate deploy` + truncate tables in `beforeEach` hook OR per-file DB isolation
- Shared fixtures: `createTenantFixture()`, `createWorkspaceFixture()`, etc., in `tests/api/fixtures/`
- Each endpoint covered by the matrix in §3

### 5.3 CI changes expected

The CI pipeline from task 01 will grow to:
- `test-unit` (already exists — add per-task specs)
- `test-api` — NEW; spins up Postgres service, runs `prisma migrate deploy`, then Playwright `tests/api/`
- `build`, `lint`, `typecheck` — unchanged

Task 02 will add the `test-api` job when the first API endpoints ship.

### 5.4 Dev DB vs test DB

- Dev: `movux-postgres` port 5432 (docker-compose.yml)
- Test: `movux-test-postgres` port 5433 (new service added to docker-compose.yml in task 02)
- `.env.test` with `DATABASE_URL` pointed at test DB

---

## 6. Cross-cutting API decisions (scoped to Phase 1a)

### 6.1 Pagination — cursor-based
- Endpoints returning lists accept `?cursor=<id>&limit=20`
- Response: `{ data: [...], nextCursor: string | null }`
- Rejected: offset pagination (breaks with insertions, slow on large tables)

### 6.2 Filtering convention
- Query params: `?field=value`, `?status=PENDING,APPROVED` (comma-separated for enums)
- Complex filters: switch to GraphQL for that endpoint

### 6.3 Error response shape
Already defined in ROADMAP.md §3 — sticking with:
```json
{ "message": "Invalid payload", "code": "VALIDATION_ERROR", "details": [...] }
```

### 6.4 Audit log insertion
- Repository receives optional `auditActorId` in write methods
- Repository inserts `AuditLog` row in the same Prisma transaction as the mutation
- Shift-specific events additionally insert `ShiftTimelineEvent` (task 14)

### 6.5 State transition validation
- Enforced in the use case, NOT in the repository
- Use case reads entity, checks `allowedTransitions(current) → next`, rejects `INVALID_STATE_TRANSITION` if invalid

### 6.6 Rate limiting
- Skeleton no-ops in Phase 1a — just an interface that returns `{ allowed: true }`
- Real Upstash-backed implementation lands in Phase 3

### 6.7 Swagger updates
- Per-endpoint JSDoc required — verified on `/api-docs` before task closure
- `@tag` grouping per domain (Tenants, Workspaces, Shifts, Requests, …)

### 6.8 GraphQL mirroring
- Pothos types defined once per domain; queries/mutations reuse the same use case calls
- Principle: **GraphQL accepts what makes the UI easier**, not every REST route needs a GraphQL equivalent
- Per BUSINESS-FOUNDATION.md §2.3: REST for resource CRUD + integrations; GraphQL for nested reads from the UI

### 6.9 Transactions
- Multi-entity writes wrap `prisma.$transaction([...])` at the repository or use case boundary
- Examples: shift assignment + audit + notification event = one transaction

---

## 7. Follow-ups flagged

| Item | Affects | Severity |
|---|---|---|
| `AuthField` a11y (no label↔input `for`/`id`) | tests/api untouched, but frontend task 01-b will catch this | High — Phase 1b |
| Decision-window expiration cron job design | Task 10 | Medium — research in task 10 |
| Supabase Storage auth token scoping | Task 12 | Medium — research in task 12 |
| Multi-tenancy on Request polymorphism (tenant scope on joined entities) | Task 12 | Medium — research phase |
| Notification per-workspace settings | Task 16 | Low — Phase 2 refinement |
| Cross-workspace conflict detection runs in O(n) per user — index strategy TBD | Task 09, 13 | Medium — exploration task |

---

## 8. Out of scope (Phase 1a)

Explicitly deferred to Phase 1b (frontend) or later phases:

- ❌ Any React page, component, form, hook — Phase 1b
- ❌ Email templates beyond auth (which already exist from task 01) — Phase 2
- ❌ Push / WhatsApp / SMS notification channels — Phase 2
- ❌ Rate limiting live — Phase 3
- ❌ Sentry, Axiom — Phase 3
- ❌ SSO (WorkOS) — Phase 3
- ❌ Payroll exports beyond CSV — Phase 3
- ❌ MTE Portaria 671 compliance — Phase 3
- ❌ Custom roles (Opção C) — Phase 3
- ❌ Multi-tenant per SuperAdmin enforcement — Phase 3 (Corporate plan)

---

## 9. Execution flow (per task)

Each Phase 1a task follows the strict 5-phase workflow from `CLAUDE.md`:

```
Phase 0: BRIEF        → User story, scope, acceptance criteria
Phase 1: EXPLORATION  → Read-only, document current state
Phase 2: RESEARCH     → Approach options, decision, edge cases
Phase 3: PLAN + TODO  → Ordered sub-steps + atomic checklist
Phase 4: EXECUTION    → Implement, commit per logical group
Phase 5: QA + VALIDATION → Run QA in chat → persist validation.md
```

User must approve each phase gate with "sim" before the next begins. Questions during construction flow to **chat**, never into docs.

Output artifacts per task:
```
docs/tasks/<slug>/
  brief.md
  exploration.md
  research.md
  plan.md
  todo.md
  validation.md
```

---

## 10. How this doc interacts with the main `ROADMAP.md`

- `ROADMAP.md` **is the index** — section §5 lists all 16 Phase-1 slugs in a single table
- `API-ROADMAP.md` (this doc) **expands** those same slugs with API-specific contracts + endpoints
- A future `FRONTEND-ROADMAP.md` (Phase 1b) will do the same for the UI side
- Both reference `BUSINESS-FOUNDATION.md` for the domain truth and `CLAUDE.md` for workflow rules

Update both when a decision changes: domain in BF, phase/sequencing in ROADMAP, API specifics here, UI specifics in FRONTEND-ROADMAP.

---

*End of doc. Next action: begin Task 16 `16-in-app-notifications` with a Phase-0 brief. Task 15 (`15-plan-limits`) is deferred and may slip to after the frontend (Phase 1b) since plan-limit gating is a cross-cutting policy layer that's mostly invisible until quotas are hit.*
