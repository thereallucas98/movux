import { assertAdminOrCoordenadorOfWorkspace } from '~/server/authorization/assert-admin-or-coordenador-of-workspace'
import { serializeCsv, type CsvCell } from '~/server/lib/csv'
import type { TimeEntryRepository } from '~/server/repositories/time-entry.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export const EXPORT_ROW_CAP = 50_000

export interface ExportTimeEntriesCsvInput {
  workspaceId: string
  from?: Date
  to?: Date
  userId?: string
}

export interface CsvExportPayload {
  filename: string
  contentType: string
  body: string
}

export type ExportTimeEntriesCsvResult =
  | { success: true; data: CsvExportPayload }
  | {
      success: false
      code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'EXPORT_TOO_LARGE'
    }

const CSV_HEADERS = [
  'time_entry_id',
  'user_id',
  'user_full_name',
  'shift_id',
  'shift_start_at',
  'shift_end_at',
  'clock_in_at',
  'clock_in_within_tolerance',
  'clock_out_at',
  'clock_out_within_tolerance',
  'overtime_minutes',
  'closed_by_user_id',
  'closed_at',
  'notes',
] as const

function defaultRange(): { from: Date; to: Date } {
  const now = new Date()
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  )
  return { from, to: now }
}

function isoOrEmpty(d: Date | null | undefined): string {
  return d ? d.toISOString() : ''
}

export async function exportTimeEntriesCsv(
  workspaceMembershipRepo: WorkspaceMembershipRepository,
  timeEntryRepo: TimeEntryRepository,
  principal: Principal | null,
  input: ExportTimeEntriesCsvInput,
): Promise<ExportTimeEntriesCsvResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }

  const auth = await assertAdminOrCoordenadorOfWorkspace(
    workspaceMembershipRepo,
    principal,
    input.workspaceId,
  )
  if (!auth.authorized) return { success: false, code: auth.code }

  const range = defaultRange()
  const filter = {
    workspaceId: input.workspaceId,
    from: input.from ?? range.from,
    to: input.to ?? range.to,
    ...(input.userId && { userId: input.userId }),
  }

  const total = await timeEntryRepo.countForWorkspace(filter)
  if (total > EXPORT_ROW_CAP) {
    return { success: false, code: 'EXPORT_TOO_LARGE' }
  }

  const page = await timeEntryRepo.listForWorkspace(
    filter,
    null,
    EXPORT_ROW_CAP,
  )
  const rows: CsvCell[][] = page.data.map((entry) => [
    entry.id,
    entry.userId,
    entry.shiftAssignment.user?.fullName ?? '',
    entry.shiftAssignment.shiftId,
    isoOrEmpty(entry.shiftAssignment.shift.startAt),
    isoOrEmpty(entry.shiftAssignment.shift.endAt),
    isoOrEmpty(entry.clockInAt),
    entry.clockInWithinTolerance,
    isoOrEmpty(entry.clockOutAt),
    entry.clockOutWithinTolerance,
    entry.overtimeMinutes,
    entry.closedByUserId,
    isoOrEmpty(entry.closedAt),
    entry.notes,
  ])

  const body = serializeCsv([...CSV_HEADERS], rows)
  const today = new Date().toISOString().slice(0, 10)
  const filename = `time-entries-${input.workspaceId}-${today}.csv`

  return {
    success: true,
    data: {
      filename,
      contentType: 'text/csv; charset=utf-8',
      body,
    },
  }
}
