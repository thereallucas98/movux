import { randomUUID } from 'node:crypto'
import type { APIRequestContext } from '@playwright/test'
import { expect } from '@playwright/test'
import { query } from './db'
import type { MembershipRow, TenantRow, UserRow } from './db'

interface RegisteredUser {
  id: string
  email: string
  fullName: string
  role: string
}

export interface UserFixture {
  user: RegisteredUser
  email: string
  password: string
}

interface CreateUserOptions {
  email?: string
  password?: string
  fullName?: string
  role?: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
}

let userCounter = 0

function nextEmail(prefix = 'user') {
  userCounter += 1
  return `${prefix}-${Date.now()}-${userCounter}@movux.test`
}

/**
 * Registers a user via the real API so auth cookies are issued on `request`.
 */
export async function createUserFixture(
  request: APIRequestContext,
  opts: CreateUserOptions = {},
): Promise<UserFixture> {
  const email = opts.email ?? nextEmail()
  const password = opts.password ?? 'Pass1234!'
  const fullName = opts.fullName ?? 'Test User'
  const role = opts.role ?? 'USER'

  const res = await request.post('/api/auth/register', {
    data: { email, password, fullName, role },
  })

  expect(res.status(), `register ${email}`).toBe(201)
  const body = (await res.json()) as { user: RegisteredUser }
  return { user: body.user, email, password }
}

/**
 * Inserts a User row directly via SQL, skipping the register flow.
 * Useful for creating "outsider" users that don't need a login session.
 */
export async function seedUser(
  opts: { fullName?: string; email?: string } = {},
): Promise<UserRow> {
  const rows = await query<UserRow>(
    `INSERT INTO "user" (id, full_name, email, password_hash, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, email, full_name, role, is_active`,
    [
      randomUUID(),
      opts.fullName ?? 'Seeded User',
      opts.email ?? nextEmail('seed'),
      'placeholder',
    ],
  )
  return rows[0]
}

/**
 * Seeds a tenant + SUPER_ADMIN membership directly via SQL to bypass HTTP setup cost.
 */
export async function seedTenantWithOwner(opts: {
  ownerId: string
  name?: string
  timezone?: string
}): Promise<TenantRow> {
  const tenantRows = await query<TenantRow>(
    `INSERT INTO "tenant" (id, name, timezone, updated_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, name, timezone, is_active, deleted_at, created_at, updated_at`,
    [
      randomUUID(),
      opts.name ?? `Tenant ${Date.now()}`,
      opts.timezone ?? 'America/Sao_Paulo',
    ],
  )
  const tenant = tenantRows[0]
  await query(
    `INSERT INTO "tenantMembership" (id, tenant_id, user_id, role, updated_at)
     VALUES ($1, $2, $3, 'SUPER_ADMIN', NOW())`,
    [randomUUID(), tenant.id, opts.ownerId],
  )
  return tenant
}

export async function seedMembership(opts: {
  tenantId: string
  userId: string
  role?: 'SUPER_ADMIN'
}): Promise<MembershipRow> {
  const rows = await query<MembershipRow>(
    `INSERT INTO "tenantMembership" (id, tenant_id, user_id, role, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, tenant_id, user_id, role, is_active, created_at`,
    [randomUUID(), opts.tenantId, opts.userId, opts.role ?? 'SUPER_ADMIN'],
  )
  return rows[0]
}

export type WorkspaceVertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'
export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

interface SeedWorkspaceOptions {
  tenantId: string
  ownerId: string
  name?: string
  timezone?: string
  vertical?: WorkspaceVertical
}

export async function seedWorkspaceWithAdmin(
  opts: SeedWorkspaceOptions,
): Promise<import('./db').WorkspaceRow> {
  const rows = await query<import('./db').WorkspaceRow>(
    `INSERT INTO "workspace" (id, tenant_id, name, timezone, vertical, updated_at)
     VALUES ($1, $2, $3, $4, $5::"WorkspaceVertical", NOW())
     RETURNING id, tenant_id, name, timezone, vertical, is_active, deleted_at, created_at, updated_at`,
    [
      randomUUID(),
      opts.tenantId,
      opts.name ?? `Workspace ${Date.now()}`,
      opts.timezone ?? 'America/Sao_Paulo',
      opts.vertical ?? 'HOSPITAL',
    ],
  )
  const workspace = rows[0]
  await query(
    `INSERT INTO "workspaceMembership" (id, workspace_id, user_id, role, updated_at)
     VALUES ($1, $2, $3, 'ADMIN'::"WorkspaceRole", NOW())`,
    [randomUUID(), workspace.id, opts.ownerId],
  )
  return workspace
}

export async function seedWorkspaceMembership(opts: {
  workspaceId: string
  userId: string
  role: WorkspaceRole
}): Promise<import('./db').WorkspaceMembershipRow> {
  const rows = await query<import('./db').WorkspaceMembershipRow>(
    `INSERT INTO "workspaceMembership" (id, workspace_id, user_id, role, updated_at)
     VALUES ($1, $2, $3, $4::"WorkspaceRole", NOW())
     RETURNING id, workspace_id, user_id, role, is_active, created_at, updated_at`,
    [randomUUID(), opts.workspaceId, opts.userId, opts.role],
  )
  return rows[0]
}

export type CategoryScope = 'GLOBAL' | 'TENANT' | 'WORKSPACE'

export async function seedCategory(opts: {
  scope: CategoryScope
  vertical?: WorkspaceVertical | null
  tenantId?: string | null
  workspaceId?: string | null
  slug: string
  name: string
  description?: string | null
}): Promise<import('./db').CategoryRow> {
  const rows = await query<import('./db').CategoryRow>(
    `INSERT INTO "category"
       (id, scope, vertical, tenant_id, workspace_id, slug, name, description, updated_at)
     VALUES ($1, $2::"CategoryScope",
             $3::"WorkspaceVertical", $4, $5, $6, $7, $8, NOW())
     RETURNING id, scope, vertical, tenant_id, workspace_id, slug, name,
               description, is_active, created_at, updated_at`,
    [
      randomUUID(),
      opts.scope,
      opts.vertical ?? null,
      opts.tenantId ?? null,
      opts.workspaceId ?? null,
      opts.slug,
      opts.name,
      opts.description ?? null,
    ],
  )
  return rows[0]
}

export async function seedGeralFor(
  workspaceId: string,
  tenantId: string,
): Promise<import('./db').CategoryRow> {
  return seedCategory({
    scope: 'WORKSPACE',
    tenantId,
    workspaceId,
    slug: 'general',
    name: 'Geral',
  })
}

export async function seedSpecialty(opts: {
  scope: CategoryScope
  vertical?: WorkspaceVertical | null
  tenantId?: string | null
  workspaceId?: string | null
  slug: string
  name: string
  description?: string | null
}): Promise<import('./db').SpecialtyRow> {
  const rows = await query<import('./db').SpecialtyRow>(
    `INSERT INTO "specialty"
       (id, scope, vertical, tenant_id, workspace_id, slug, name, description, updated_at)
     VALUES ($1, $2::"SpecialtyScope",
             $3::"WorkspaceVertical", $4, $5, $6, $7, $8, NOW())
     RETURNING id, scope, vertical, tenant_id, workspace_id, slug, name,
               description, is_active, created_at, updated_at`,
    [
      randomUUID(),
      opts.scope,
      opts.vertical ?? null,
      opts.tenantId ?? null,
      opts.workspaceId ?? null,
      opts.slug,
      opts.name,
      opts.description ?? null,
    ],
  )
  return rows[0]
}

export async function seedUserSpecialty(opts: {
  userId: string
  workspaceId: string
  specialtyId: string
}): Promise<import('./db').UserSpecialtyRow> {
  const rows = await query<import('./db').UserSpecialtyRow>(
    `INSERT INTO "userSpecialty" (id, user_id, workspace_id, specialty_id, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, user_id, workspace_id, specialty_id, is_active, created_at, updated_at`,
    [randomUUID(), opts.userId, opts.workspaceId, opts.specialtyId],
  )
  return rows[0]
}

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'

export async function seedSchedule(opts: {
  workspaceId: string
  categoryId: string
  name?: string | null
  periodStart?: Date
  periodEnd?: Date
  status?: ScheduleStatus
}): Promise<import('./db').ScheduleRow> {
  const now = new Date()
  const defaultStart =
    opts.periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1)
  const defaultEnd =
    opts.periodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const status = opts.status ?? 'DRAFT'
  const publishedAt =
    status === 'PUBLISHED' || status === 'CLOSED' ? now : null
  const closedAt = status === 'CLOSED' ? now : null

  const rows = await query<import('./db').ScheduleRow>(
    `INSERT INTO "schedule"
       (id, workspace_id, category_id, name, period_start, period_end,
        status, published_at, closed_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::"ScheduleStatus", $8, $9, NOW())
     RETURNING id, workspace_id, category_id, name, period_start, period_end,
               status, published_at, closed_at, deleted_at, is_active,
               created_at, updated_at`,
    [
      randomUUID(),
      opts.workspaceId,
      opts.categoryId,
      opts.name ?? null,
      defaultStart,
      defaultEnd,
      status,
      publishedAt,
      closedAt,
    ],
  )
  return rows[0]
}

export type ShiftStatusValue = 'OPEN' | 'FILLED' | 'CANCELLED' | 'COMPLETED'
export type ShiftAssignmentModeValue = 'DIRECT_ASSIGN' | 'OPEN_FOR_APPLY'

export async function seedShift(opts: {
  scheduleId: string
  categoryId: string
  patternId?: string | null
  startAt?: Date
  endAt?: Date
  headcount?: number
  status?: ShiftStatusValue
  assignmentMode?: ShiftAssignmentModeValue
  decisionWindowHours?: number
  notes?: string | null
}): Promise<import('./db').ShiftRow> {
  const defaultStart = opts.startAt ?? new Date('2026-07-13T08:00:00.000Z')
  const defaultEnd =
    opts.endAt ?? new Date(defaultStart.getTime() + 8 * 60 * 60 * 1000)
  const rows = await query<import('./db').ShiftRow>(
    `INSERT INTO "shift"
       (id, schedule_id, category_id, pattern_id, start_at, end_at,
        headcount, status, assignment_mode, decision_window_hours,
        notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::"ShiftStatus",
             $9::"ShiftAssignmentMode", $10, $11, NOW())
     RETURNING id, schedule_id, category_id, pattern_id, start_at, end_at,
               headcount, status, assignment_mode, decision_window_hours,
               notes, cancelled_at, cancel_reason,
               created_at, updated_at`,
    [
      randomUUID(),
      opts.scheduleId,
      opts.categoryId,
      opts.patternId ?? null,
      defaultStart,
      defaultEnd,
      opts.headcount ?? 1,
      opts.status ?? 'OPEN',
      opts.assignmentMode ?? 'DIRECT_ASSIGN',
      opts.decisionWindowHours ?? 48,
      opts.notes ?? null,
    ],
  )
  return rows[0]
}

export async function seedShiftPattern(opts: {
  scheduleId: string
  categoryId: string
  name?: string | null
  daysOfWeek?: number[]
  startTimeMinutes?: number
  endTimeMinutes?: number
  crossesMidnight?: boolean
  headcount?: number
}): Promise<import('./db').ShiftPatternRow> {
  const rows = await query<import('./db').ShiftPatternRow>(
    `INSERT INTO "shiftPattern"
       (id, schedule_id, category_id, name, days_of_week,
        start_time_minutes, end_time_minutes, crosses_midnight,
        headcount, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING id, schedule_id, category_id, name, days_of_week,
               start_time_minutes, end_time_minutes, crosses_midnight,
               headcount, is_active, created_at, updated_at`,
    [
      randomUUID(),
      opts.scheduleId,
      opts.categoryId,
      opts.name ?? null,
      opts.daysOfWeek ?? [1, 3, 5],
      opts.startTimeMinutes ?? 8 * 60,
      opts.endTimeMinutes ?? 17 * 60,
      opts.crossesMidnight ?? false,
      opts.headcount ?? 1,
    ],
  )
  return rows[0]
}

export async function seedShiftExpectedComposition(opts: {
  shiftId: string
  specialtyId: string
  count?: number
}): Promise<import('./db').ShiftCompositionRow> {
  const rows = await query<import('./db').ShiftCompositionRow>(
    `INSERT INTO "shiftExpectedComposition"
       (id, shift_id, specialty_id, count, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id, shift_id, specialty_id, count, created_at, updated_at`,
    [randomUUID(), opts.shiftId, opts.specialtyId, opts.count ?? 1],
  )
  return rows[0]
}

export type AssignmentStatusValue =
  | 'PENDING_ACCEPT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'TRANSFERRED'
  | 'PENDING_CLOSURE'
  | 'COMPLETED'

export async function seedShiftAssignment(opts: {
  shiftId: string
  userId: string
  assignedByUserId: string
  status?: AssignmentStatusValue
  decisionDeadline?: Date
  decidedAt?: Date | null
  rejectionReason?: string | null
}): Promise<import('./db').AssignmentRow> {
  const status = opts.status ?? 'PENDING_ACCEPT'
  const deadline =
    opts.decisionDeadline ?? new Date(Date.now() + 48 * 60 * 60 * 1000)
  const decidedAt =
    opts.decidedAt !== undefined
      ? opts.decidedAt
      : status === 'ACCEPTED' || status === 'REJECTED'
        ? new Date()
        : null
  const rows = await query<import('./db').AssignmentRow>(
    `INSERT INTO "shiftAssignment"
       (id, shift_id, user_id, assigned_by_user_id, status,
        decision_deadline, decided_at, rejection_reason, updated_at)
     VALUES ($1, $2, $3, $4, $5::"AssignmentStatus", $6, $7, $8, NOW())
     RETURNING id, shift_id, user_id, assigned_by_user_id, status,
               decision_deadline, decided_at, rejection_reason,
               created_at, updated_at`,
    [
      randomUUID(),
      opts.shiftId,
      opts.userId,
      opts.assignedByUserId,
      status,
      deadline,
      decidedAt,
      opts.rejectionReason ?? null,
    ],
  )
  return rows[0]
}

export type TransferRequestStatusValue =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export async function seedTransferRequest(opts: {
  originalAssignmentId: string
  targetUserId: string
  requestedByUserId: string
  reason?: string
  status?: TransferRequestStatusValue
  decidedByUserId?: string | null
  decidedAt?: Date | null
  decisionReason?: string | null
  newAssignmentId?: string | null
}): Promise<import('./db').TransferRequestRow> {
  const status = opts.status ?? 'PENDING'
  const rows = await query<import('./db').TransferRequestRow>(
    `INSERT INTO "transferRequest"
       (id, original_assignment_id, target_user_id, requested_by_user_id,
        reason, status, decided_by_user_id, decided_at, decision_reason,
        new_assignment_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::"TransferRequestStatus", $7, $8, $9, $10, NOW())
     RETURNING id, original_assignment_id, target_user_id, requested_by_user_id,
               reason, status, decided_by_user_id, decided_at, decision_reason,
               new_assignment_id, created_at, updated_at`,
    [
      randomUUID(),
      opts.originalAssignmentId,
      opts.targetUserId,
      opts.requestedByUserId,
      opts.reason ?? 'Personal reason',
      status,
      opts.decidedByUserId ?? null,
      opts.decidedAt ?? null,
      opts.decisionReason ?? null,
      opts.newAssignmentId ?? null,
    ],
  )
  return rows[0]
}

export async function seedTimeEntry(opts: {
  shiftAssignmentId: string
  userId: string
  clockInAt?: Date
  clockInWithinTolerance?: boolean
  clockOutAt?: Date | null
  clockOutWithinTolerance?: boolean | null
  overtimeMinutes?: number
  closedByUserId?: string | null
  closedAt?: Date | null
  notes?: string | null
}): Promise<import('./db').TimeEntryRow> {
  const rows = await query<import('./db').TimeEntryRow>(
    `INSERT INTO "timeEntry"
       (id, shift_assignment_id, user_id, clock_in_at,
        clock_in_within_tolerance, clock_out_at, clock_out_within_tolerance,
        overtime_minutes, closed_by_user_id, closed_at, notes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     RETURNING *`,
    [
      randomUUID(),
      opts.shiftAssignmentId,
      opts.userId,
      opts.clockInAt ?? new Date(),
      opts.clockInWithinTolerance ?? true,
      opts.clockOutAt ?? null,
      opts.clockOutWithinTolerance ?? null,
      opts.overtimeMinutes ?? 0,
      opts.closedByUserId ?? null,
      opts.closedAt ?? null,
      opts.notes ?? null,
    ],
  )
  return rows[0]
}

export type RequestTypeValue = 'SWAP' | 'OFFER' | 'TIME_OFF'
export type RequestStatusValue =
  | 'PENDING_PEER'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export async function seedSwapRequest(opts: {
  workspaceId: string
  requestedById: string
  swapSourceAssignmentId: string
  swapTargetUserId: string
  swapTargetAssignmentId: string
  reason?: string
  status?: RequestStatusValue
}): Promise<import('./db').RequestRow> {
  const status = opts.status ?? 'PENDING_PEER'
  const rows = await query<import('./db').RequestRow>(
    `INSERT INTO "request"
       (id, workspace_id, type, status, requested_by_id, reason,
        swap_source_assignment_id, swap_target_user_id,
        swap_target_assignment_id, updated_at)
     VALUES ($1, $2, 'SWAP'::"RequestType", $3::"RequestStatus", $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [
      randomUUID(),
      opts.workspaceId,
      status,
      opts.requestedById,
      opts.reason ?? 'reason',
      opts.swapSourceAssignmentId,
      opts.swapTargetUserId,
      opts.swapTargetAssignmentId,
    ],
  )
  return rows[0]
}

export async function seedOfferRequest(opts: {
  workspaceId: string
  requestedById: string
  offerSourceAssignmentId: string
  reason?: string
  status?: RequestStatusValue
}): Promise<import('./db').RequestRow> {
  const status = opts.status ?? 'PENDING'
  const rows = await query<import('./db').RequestRow>(
    `INSERT INTO "request"
       (id, workspace_id, type, status, requested_by_id, reason,
        offer_source_assignment_id, updated_at)
     VALUES ($1, $2, 'OFFER'::"RequestType", $3::"RequestStatus", $4, $5, $6, NOW())
     RETURNING *`,
    [
      randomUUID(),
      opts.workspaceId,
      status,
      opts.requestedById,
      opts.reason ?? 'reason',
      opts.offerSourceAssignmentId,
    ],
  )
  return rows[0]
}

export async function seedTimeOffRequest(opts: {
  workspaceId: string
  requestedById: string
  timeOffStart: Date
  timeOffEnd: Date
  reason?: string
  status?: RequestStatusValue
}): Promise<import('./db').RequestRow> {
  const status = opts.status ?? 'PENDING'
  const rows = await query<import('./db').RequestRow>(
    `INSERT INTO "request"
       (id, workspace_id, type, status, requested_by_id, reason,
        time_off_start, time_off_end, updated_at)
     VALUES ($1, $2, 'TIME_OFF'::"RequestType", $3::"RequestStatus", $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      randomUUID(),
      opts.workspaceId,
      status,
      opts.requestedById,
      opts.reason ?? 'reason',
      opts.timeOffStart,
      opts.timeOffEnd,
    ],
  )
  return rows[0]
}

export type ShiftCandidateStatusValue =
  | 'QUEUED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'

export async function seedShiftCandidate(opts: {
  shiftId: string
  userId: string
  queuePosition?: number
  status?: ShiftCandidateStatusValue
  decidedByUserId?: string | null
  decidedAt?: Date | null
  decisionReason?: string | null
  resultingAssignmentId?: string | null
}): Promise<import('./db').ShiftCandidateRow> {
  const status = opts.status ?? 'QUEUED'
  const rows = await query<import('./db').ShiftCandidateRow>(
    `INSERT INTO "shiftCandidate"
       (id, shift_id, user_id, queue_position, status,
        decided_by_user_id, decided_at, decision_reason,
        resulting_assignment_id, updated_at)
     VALUES ($1, $2, $3, $4, $5::"ShiftCandidateStatus", $6, $7, $8, $9, NOW())
     RETURNING id, shift_id, user_id, queue_position, status,
               decided_by_user_id, decided_at, decision_reason,
               resulting_assignment_id, created_at, updated_at`,
    [
      randomUUID(),
      opts.shiftId,
      opts.userId,
      opts.queuePosition ?? 1,
      status,
      opts.decidedByUserId ?? null,
      opts.decidedAt ?? null,
      opts.decisionReason ?? null,
      opts.resultingAssignmentId ?? null,
    ],
  )
  return rows[0]
}

export async function seedShiftTimelineNote(opts: {
  shiftId: string
  authorUserId: string
  note?: string
  createdAt?: Date
}): Promise<import('./db').ShiftTimelineNoteRow> {
  const rows = await query<import('./db').ShiftTimelineNoteRow>(
    `INSERT INTO "shiftTimelineNote"
       (id, shift_id, author_user_id, note, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      randomUUID(),
      opts.shiftId,
      opts.authorUserId,
      opts.note ?? 'note',
      opts.createdAt ?? new Date(),
    ],
  )
  return rows[0]
}

export async function seedAuditLog(opts: {
  actorUserId?: string | null
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown> | null
  createdAt?: Date
}): Promise<import('./db').AuditLogRow> {
  const rows = await query<import('./db').AuditLogRow>(
    `INSERT INTO "auditLog"
       (id, actor_user_id, action, entity_type, entity_id, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING *`,
    [
      randomUUID(),
      opts.actorUserId ?? null,
      opts.action,
      opts.entityType,
      opts.entityId,
      opts.metadata ? JSON.stringify(opts.metadata) : null,
      opts.createdAt ?? new Date(),
    ],
  )
  return rows[0]
}
