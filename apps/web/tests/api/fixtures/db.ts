import { Pool } from 'pg'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Run tests via `pnpm test:api` so dotenv loads .env.test.',
  )
}

export const pool = new Pool({ connectionString: databaseUrl })

export async function query<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(sql, params as unknown[])
  return result.rows as T[]
}

export async function resetDatabase() {
  await pool.query(
    'TRUNCATE "notification", "notificationPreference", "auditLog", "shiftTimelineNote", "timeEntry", "request", "transferRequest", "shiftCandidate", "shiftAssignment", "shiftExpectedComposition", "shift", "shiftPattern", "schedule", "userSpecialty", "specialty", "category", "workspaceMembership", "workspace", "tenantMembership", "tenant", "user" RESTART IDENTITY CASCADE',
  )
}

export async function disconnect() {
  await pool.end()
}

export interface UserRow {
  id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
}

export interface TenantRow {
  id: string
  name: string
  timezone: string
  is_active: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface MembershipRow {
  id: string
  tenant_id: string
  user_id: string
  role: string
  is_active: boolean
  created_at: Date
}

export interface AuditLogRow {
  id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: unknown
  created_at: Date
}

export interface WorkspaceRow {
  id: string
  tenant_id: string
  name: string
  timezone: string
  vertical: string
  is_active: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface WorkspaceMembershipRow {
  id: string
  workspace_id: string
  user_id: string
  role: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface CategoryRow {
  id: string
  scope: string
  vertical: string | null
  tenant_id: string | null
  workspace_id: string | null
  slug: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SpecialtyRow {
  id: string
  scope: string
  vertical: string | null
  tenant_id: string | null
  workspace_id: string | null
  slug: string
  name: string
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface UserSpecialtyRow {
  id: string
  user_id: string
  workspace_id: string
  specialty_id: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ScheduleRow {
  id: string
  workspace_id: string
  category_id: string
  name: string | null
  period_start: Date
  period_end: Date
  status: string
  published_at: Date | null
  closed_at: Date | null
  deleted_at: Date | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ShiftRow {
  id: string
  schedule_id: string
  category_id: string
  pattern_id: string | null
  start_at: Date
  end_at: Date
  headcount: number
  status: string
  assignment_mode: string
  decision_window_hours: number
  notes: string | null
  cancelled_at: Date | null
  cancel_reason: string | null
  created_at: Date
  updated_at: Date
}

export interface ShiftCandidateRow {
  id: string
  shift_id: string
  user_id: string
  queue_position: number
  status: string
  decided_by_user_id: string | null
  decided_at: Date | null
  decision_reason: string | null
  resulting_assignment_id: string | null
  created_at: Date
  updated_at: Date
}

export interface ShiftPatternRow {
  id: string
  schedule_id: string
  category_id: string
  name: string | null
  days_of_week: number[]
  start_time_minutes: number
  end_time_minutes: number
  crosses_midnight: boolean
  headcount: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ShiftCompositionRow {
  id: string
  shift_id: string
  specialty_id: string
  count: number
  created_at: Date
  updated_at: Date
}

export interface AssignmentRow {
  id: string
  shift_id: string
  user_id: string | null
  assigned_by_user_id: string
  status: string
  decision_deadline: Date
  decided_at: Date | null
  rejection_reason: string | null
  created_at: Date
  updated_at: Date
}

export interface ShiftTimelineNoteRow {
  id: string
  shift_id: string
  author_user_id: string
  note: string
  created_at: Date
}

export interface AuditLogRow {
  id: string
  actor_user_id: string | null
  action: string
  entity_type: string
  entity_id: string
  metadata: unknown
  created_at: Date
}

export interface TimeEntryRow {
  id: string
  shift_assignment_id: string
  user_id: string
  clock_in_at: Date
  clock_in_location: unknown
  clock_in_within_tolerance: boolean
  clock_out_at: Date | null
  clock_out_location: unknown
  clock_out_within_tolerance: boolean | null
  overtime_minutes: number
  closed_by_user_id: string | null
  closed_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export interface RequestRow {
  id: string
  workspace_id: string
  type: 'SWAP' | 'OFFER' | 'TIME_OFF'
  status:
    | 'PENDING_PEER'
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
  requested_by_id: string
  resolved_by_id: string | null
  reason: string
  resolution_reason: string | null
  attachment_url: string | null
  attachment_mime_type: string | null
  attachment_size_bytes: number | null
  swap_source_assignment_id: string | null
  swap_target_user_id: string | null
  swap_target_assignment_id: string | null
  peer_accepted_at: Date | null
  peer_rejected_at: Date | null
  offer_source_assignment_id: string | null
  time_off_start: Date | null
  time_off_end: Date | null
  resolved_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface TransferRequestRow {
  id: string
  original_assignment_id: string
  target_user_id: string
  requested_by_user_id: string
  reason: string
  status: string
  decided_by_user_id: string | null
  decided_at: Date | null
  decision_reason: string | null
  new_assignment_id: string | null
  created_at: Date
  updated_at: Date
}
