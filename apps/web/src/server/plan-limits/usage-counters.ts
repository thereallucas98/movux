import { fromZonedTime } from 'date-fns-tz'

import type { Prisma, PrismaClient } from '~/generated/prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Read-side counters for quota enforcement.
 *
 * All counters are pure reads (no writes, no transactions). They are called
 * outside the create-transaction in `enforceQuota` (research §2 — best-effort
 * concurrency, accepted overflow ≤ N − 1).
 *
 * Monthly counters honor the workspace timezone via `date-fns-tz`. Brazil
 * currently observes no DST; the lib remains correct if reinstated.
 */

export interface CountersDeps {
  db: DbClient
}

export async function countWorkspaces(
  deps: CountersDeps,
  args: { tenantId: string },
): Promise<number> {
  return deps.db.workspace.count({
    where: { tenantId: args.tenantId, deletedAt: null },
  })
}

export async function countActiveMembers(
  deps: CountersDeps,
  args: { workspaceId: string },
): Promise<number> {
  return deps.db.workspaceMembership.count({
    where: { workspaceId: args.workspaceId, isActive: true },
  })
}

export async function countWorkspaceCategories(
  deps: CountersDeps,
  args: { workspaceId: string },
): Promise<number> {
  return deps.db.category.count({
    where: {
      workspaceId: args.workspaceId,
      scope: 'WORKSPACE',
      isActive: true,
    },
  })
}

export async function countWorkspaceSpecialties(
  deps: CountersDeps,
  args: { workspaceId: string },
): Promise<number> {
  return deps.db.specialty.count({
    where: {
      workspaceId: args.workspaceId,
      scope: 'WORKSPACE',
      isActive: true,
    },
  })
}

export async function countActiveSchedules(
  deps: CountersDeps,
  args: { workspaceId: string },
): Promise<number> {
  return deps.db.schedule.count({
    where: {
      workspaceId: args.workspaceId,
      status: { in: ['DRAFT', 'PUBLISHED'] },
    },
  })
}

/**
 * Returns `[monthStartUtc, nextMonthStartUtc)` representing the calendar month
 * that contains `monthDate` *in the given timezone*.
 *
 * Used to bucket shifts by `startAt` (operational month) — see research §6.1.
 */
export function monthRangeUtc(
  monthDate: Date,
  timeZone: string,
): { startUtc: Date; endUtc: Date } {
  // Convert UTC instant to its local Y/M and rebuild the local first-of-month
  // and first-of-next-month strings, then convert each back to UTC.
  const localISO = monthDate.toLocaleString('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  // localISO format: 'YYYY-MM-DD, HH:MM:SS'
  const [datePart] = localISO.split(',')
  const [yearStr, monthStr] = datePart.trim().split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) // 1-based

  const startLocal = `${yearStr}-${monthStr}-01T00:00:00`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const endLocal = `${nextYear.toString().padStart(4, '0')}-${nextMonth
    .toString()
    .padStart(2, '0')}-01T00:00:00`

  return {
    startUtc: fromZonedTime(startLocal, timeZone),
    endUtc: fromZonedTime(endLocal, timeZone),
  }
}

/**
 * Counts shifts whose `startAt` falls inside the calendar month containing
 * `monthDate` (resolved in `timeZone`). Joins through `Schedule` to scope by
 * workspace.
 */
export async function countShiftsInMonth(
  deps: CountersDeps,
  args: { workspaceId: string; monthDate: Date; timeZone: string },
): Promise<number> {
  const { startUtc, endUtc } = monthRangeUtc(args.monthDate, args.timeZone)
  return deps.db.shift.count({
    where: {
      schedule: { workspaceId: args.workspaceId },
      startAt: { gte: startUtc, lt: endUtc },
    },
  })
}

/**
 * Counts requests created in the current calendar month (resolved in
 * `timeZone`). `Request` has no `startAt`, so we bucket by `createdAt` —
 * documented exception in research §6.1.
 */
export async function countRequestsThisMonth(
  deps: CountersDeps,
  args: { workspaceId: string; now: Date; timeZone: string },
): Promise<number> {
  const { startUtc, endUtc } = monthRangeUtc(args.now, args.timeZone)
  return deps.db.request.count({
    where: {
      workspaceId: args.workspaceId,
      createdAt: { gte: startUtc, lt: endUtc },
    },
  })
}

/**
 * Aggregates `Request.attachmentSizeBytes` for a workspace and converts to MB
 * (rounded up). Pre-Task-15 rows where the column is `NULL` are ignored —
 * documented in `validation.md` follow-ups.
 */
export async function countWorkspaceStorageMB(
  deps: CountersDeps,
  args: { workspaceId: string },
): Promise<number> {
  const result = await deps.db.request.aggregate({
    where: {
      workspaceId: args.workspaceId,
      attachmentSizeBytes: { not: null },
    },
    _sum: { attachmentSizeBytes: true },
  })
  const totalBytes = result._sum.attachmentSizeBytes ?? 0
  if (totalBytes === 0) return 0
  return Math.ceil(totalBytes / (1024 * 1024))
}
