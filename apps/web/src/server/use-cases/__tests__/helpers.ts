import { vi } from 'vitest'

import type { AssignmentRepository } from '~/server/repositories/assignment.repository'
import type { AuditLogRepository } from '~/server/repositories/audit-log.repository'
import type { NotificationRepository } from '~/server/repositories/notification.repository'
import type { NotificationPreferenceRepository } from '~/server/repositories/notification-preference.repository'
import type { ShiftCandidateRepository } from '~/server/repositories/candidate.repository'
import type { RequestRepository } from '~/server/repositories/request.repository'
import type { ShiftTimelineNoteRepository } from '~/server/repositories/shift-timeline-note.repository'
import type { TimeEntryRepository } from '~/server/repositories/time-entry.repository'
import type { TransferRequestRepository } from '~/server/repositories/transfer-request.repository'
import type { CategoryRepository } from '~/server/repositories/category.repository'
import type { ScheduleRepository } from '~/server/repositories/schedule.repository'
import type { ShiftExpectedCompositionRepository } from '~/server/repositories/shift-expected-composition.repository'
import type { ShiftPatternRepository } from '~/server/repositories/shift-pattern.repository'
import type { ShiftRepository } from '~/server/repositories/shift.repository'
import type { SpecialtyRepository } from '~/server/repositories/specialty.repository'
import type { UserSpecialtyRepository } from '~/server/repositories/user-specialty.repository'
import type { TenantMembershipRepository } from '~/server/repositories/tenant-membership.repository'
import type { TenantRepository } from '~/server/repositories/tenant.repository'
import type { UserRepository } from '~/server/repositories/user.repository'
import type { WorkspaceMembershipRepository } from '~/server/repositories/workspace-membership.repository'
import type { WorkspaceRepository } from '~/server/repositories/workspace.repository'

/**
 * Minimal test factories for repository interfaces.
 * Each unit test file still needs its own `vi.mock('~/lib/db', ...)` when the
 * use case under test opens a `prisma.$transaction(...)` — the mocked prisma
 * passes a stub tx into the callback so use-case logic runs without a real DB.
 */

export function makeTenantRepoMock(
  overrides: Partial<TenantRepository> = {},
): TenantRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithMembersPage: vi.fn(),
    update: vi.fn(),
    updatePlan: vi.fn(),
    softDelete: vi.fn(),
    listForUser: vi.fn(),
    ...overrides,
  } as TenantRepository
}

export function makeMembershipRepoMock(
  overrides: Partial<TenantMembershipRepository> = {},
): TenantMembershipRepository {
  return {
    create: vi.fn(),
    findActive: vi.fn(),
    findById: vi.fn(),
    softDelete: vi.fn(),
    softDeleteAllByTenant: vi.fn(),
    listActiveByTenant: vi.fn(),
    listActiveByUser: vi.fn(),
    countActiveSuperAdmins: vi.fn(),
    ...overrides,
  } as TenantMembershipRepository
}

export function makeAuditRepoMock(
  overrides: Partial<AuditLogRepository> = {},
): AuditLogRepository {
  return {
    log: vi.fn(),
    listForShift: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    ...overrides,
  } as AuditLogRepository
}

export function makeUserRepoMock(
  overrides: Partial<UserRepository> = {},
): UserRepository {
  return {
    findEmailVerifiedById: vi.fn(),
    findByResetToken: vi.fn(),
    setResetToken: vi.fn(),
    clearResetToken: vi.fn(),
    setEmailVerified: vi.fn(),
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
    findByEmail: vi.fn(),
    findActiveByEmail: vi.fn(),
    findByEmailForLogin: vi.fn(),
    findByIdForMe: vi.fn(),
    findByIdWithRole: vi.fn(),
    create: vi.fn(),
    listByIds: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as UserRepository
}

export function makeWorkspaceRepoMock(
  overrides: Partial<WorkspaceRepository> = {},
): WorkspaceRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithMembersPage: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    listForUser: vi.fn(),
    listForTenant: vi.fn(),
    ...overrides,
  } as WorkspaceRepository
}

export function makeWorkspaceMembershipRepoMock(
  overrides: Partial<WorkspaceMembershipRepository> = {},
): WorkspaceMembershipRepository {
  return {
    create: vi.fn(),
    findActive: vi.fn(),
    findAny: vi.fn(),
    findById: vi.fn(),
    updateRole: vi.fn(),
    reactivate: vi.fn(),
    softDelete: vi.fn(),
    softDeleteAllByWorkspace: vi.fn(),
    listActiveByWorkspace: vi.fn(),
    listActiveByUser: vi.fn(),
    listActiveByRole: vi.fn().mockResolvedValue([]),
    countActiveAdmins: vi.fn(),
    countActive: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as WorkspaceMembershipRepository
}

export function makeCategoryRepoMock(
  overrides: Partial<CategoryRepository> = {},
): CategoryRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findWorkspaceScoped: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    listGlobal: vi.fn(),
    listTenant: vi.fn(),
    listWorkspace: vi.fn(),
    findAvailableForWorkspace: vi.fn(),
    ...overrides,
  } as CategoryRepository
}

export function makeScheduleRepoMock(
  overrides: Partial<ScheduleRepository> = {},
): ScheduleRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
    softDelete: vi.fn(),
    listForWorkspace: vi.fn(),
    findOverlapping: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as ScheduleRepository
}

export function makeSpecialtyRepoMock(
  overrides: Partial<SpecialtyRepository> = {},
): SpecialtyRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findWorkspaceScoped: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    listGlobal: vi.fn(),
    listTenant: vi.fn(),
    listWorkspace: vi.fn(),
    findAvailableForWorkspace: vi.fn(),
    ...overrides,
  } as SpecialtyRepository
}

export function makeUserSpecialtyRepoMock(
  overrides: Partial<UserSpecialtyRepository> = {},
): UserSpecialtyRepository {
  return {
    create: vi.fn(),
    findActiveByMember: vi.fn(),
    findActiveByMemberWithSpecialty: vi.fn(),
    softDelete: vi.fn(),
    countActiveBySpecialty: vi.fn().mockResolvedValue(0),
    listByUser: vi.fn(),
    listActiveByWorkspaceForUsers: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as UserSpecialtyRepository
}

export function makeShiftRepoMock(
  overrides: Partial<ShiftRepository> = {},
): ShiftRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
    setStatus: vi.fn(),
    listForSchedule: vi.fn(),
    bulkCreateFromPattern: vi.fn().mockResolvedValue({ count: 0 }),
    listUpcomingForWorkspace: vi.fn().mockResolvedValue([]),
    aggregateForWeek: vi
      .fn()
      .mockResolvedValue({ count: 0, totalHeadcount: 0 }),
    countByCategoryForWeek: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as ShiftRepository
}

export function makeShiftPatternRepoMock(
  overrides: Partial<ShiftPatternRepository> = {},
): ShiftPatternRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    listForSchedule: vi.fn(),
    ...overrides,
  } as ShiftPatternRepository
}

export function makeShiftCompositionRepoMock(
  overrides: Partial<ShiftExpectedCompositionRepository> = {},
): ShiftExpectedCompositionRepository {
  return {
    findByShift: vi.fn().mockResolvedValue([]),
    deleteAllForShift: vi.fn(),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    countActiveBySpecialty: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as ShiftExpectedCompositionRepository
}

export function makeAssignmentRepoMock(
  overrides: Partial<AssignmentRepository> = {},
): AssignmentRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithShiftAndSchedule: vi.fn(),
    listForShift: vi.fn().mockResolvedValue([]),
    countByShiftAndStatus: vi.fn().mockResolvedValue(0),
    findOverlappingForUser: vi.fn().mockResolvedValue([]),
    findAlternativeShifts: vi.fn().mockResolvedValue([]),
    findForUserInRange: vi.fn().mockResolvedValue([]),
    findActiveOnShiftForUser: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
    hardDelete: vi.fn(),
    countActiveByShiftIds: vi.fn().mockResolvedValue(new Map()),
    countActiveTotalForShiftIds: vi.fn().mockResolvedValue(0),
    countDecidedInRange: vi
      .fn()
      .mockResolvedValue({ accepted: 0, rejected: 0 }),
    findMyNextAcceptedInWorkspace: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as AssignmentRepository
}

export function makeTransferRequestRepoMock(
  overrides: Partial<TransferRequestRepository> = {},
): TransferRequestRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithJoins: vi.fn(),
    update: vi.fn(),
    listForWorkspace: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    listForAssignment: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as TransferRequestRepository
}

export function makeTimeEntryRepoMock(
  overrides: Partial<TimeEntryRepository> = {},
): TimeEntryRepository {
  return {
    create: vi.fn(),
    findByAssignmentId: vi.fn(),
    update: vi.fn(),
    findLastClockOutBefore: vi.fn().mockResolvedValue(null),
    sumHoursForUserInWeek: vi.fn().mockResolvedValue(0),
    listForWorkspace: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    countForWorkspace: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as TimeEntryRepository
}

export function makeRequestRepoMock(
  overrides: Partial<RequestRepository> = {},
): RequestRepository {
  return {
    createSwap: vi.fn(),
    createOffer: vi.fn(),
    createTimeOff: vi.fn(),
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    update: vi.fn(),
    listByWorkspace: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    hasOverlappingApprovedTimeOff: vi.fn().mockResolvedValue(false),
    findSwapTargetForShift: vi.fn().mockResolvedValue(null),
    countByWorkspaceAndStatus: vi.fn().mockResolvedValue(0),
    countForUserAndStatus: vi.fn().mockResolvedValue(0),
    countByWorkspaceGroupedByType: vi
      .fn()
      .mockResolvedValue({ swap: 0, offer: 0, timeOff: 0 }),
    ...overrides,
  } as RequestRepository
}

export function makeShiftTimelineNoteRepoMock(
  overrides: Partial<ShiftTimelineNoteRepository> = {},
): ShiftTimelineNoteRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    listForShift: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as ShiftTimelineNoteRepository
}

export function makeCandidateRepoMock(
  overrides: Partial<ShiftCandidateRepository> = {},
): ShiftCandidateRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdWithJoins: vi.fn(),
    findActiveByShiftAndUser: vi.fn().mockResolvedValue(null),
    listForShift: vi.fn().mockResolvedValue([]),
    countByShift: vi.fn().mockResolvedValue(0),
    nextQueuePosition: vi.fn().mockResolvedValue(1),
    update: vi.fn(),
    updateIfQueued: vi.fn().mockResolvedValue({ count: 1 }),
    countQueuedForWorkspace: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as ShiftCandidateRepository
}

export function makeNotificationRepoMock(
  overrides: Partial<NotificationRepository> = {},
): NotificationRepository {
  return {
    createMany: vi.fn().mockResolvedValue(0),
    listForUser: vi.fn().mockResolvedValue({ data: [], nextCursor: null }),
    findByIdForUser: vi.fn().mockResolvedValue(null),
    markRead: vi.fn(),
    markAllReadForUser: vi.fn().mockResolvedValue(0),
    countUnreadForUser: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as NotificationRepository
}

export function makeNotificationPreferenceRepoMock(
  overrides: Partial<NotificationPreferenceRepository> = {},
): NotificationPreferenceRepository {
  return {
    listForUser: vi.fn().mockResolvedValue([]),
    upsertMany: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as NotificationPreferenceRepository
}
