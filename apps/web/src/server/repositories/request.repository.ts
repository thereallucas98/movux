import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import {
  decodeCursor,
  encodeCursor,
  isCreatedAtCursor,
} from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export type RequestType = 'SWAP' | 'OFFER' | 'TIME_OFF'

export type RequestStatus =
  | 'PENDING_PEER'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export interface RequestRow {
  id: string
  workspaceId: string
  type: RequestType
  status: RequestStatus
  requestedById: string
  resolvedById: string | null
  reason: string
  resolutionReason: string | null
  attachmentUrl: string | null
  attachmentMimeType: string | null
  attachmentSizeBytes: number | null
  swapSourceAssignmentId: string | null
  swapTargetUserId: string | null
  swapTargetAssignmentId: string | null
  peerAcceptedAt: Date | null
  peerRejectedAt: Date | null
  offerSourceAssignmentId: string | null
  timeOffStart: Date | null
  timeOffEnd: Date | null
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface RequestWithRelationsRow extends RequestRow {
  swapSourceAssignment: {
    id: string
    shiftId: string
    userId: string | null
    status: string
    shift: {
      id: string
      scheduleId: string
      startAt: Date
      endAt: Date
      assignmentMode: string
      schedule: { workspaceId: string; status: string }
    }
  } | null
  swapTargetAssignment: {
    id: string
    shiftId: string
    userId: string | null
    status: string
    shift: {
      id: string
      scheduleId: string
      startAt: Date
      endAt: Date
      assignmentMode: string
      schedule: { workspaceId: string; status: string }
    }
  } | null
  offerSourceAssignment: {
    id: string
    shiftId: string
    userId: string | null
    status: string
    shift: {
      id: string
      scheduleId: string
      startAt: Date
      endAt: Date
      assignmentMode: string
      schedule: { workspaceId: string; status: string }
    }
  } | null
}

export interface ListRequestsFilter {
  status?: RequestStatus
  type?: RequestType
  requestedById?: string
}

export interface CreateSwapRequestInput {
  workspaceId: string
  requestedById: string
  reason: string
  swapSourceAssignmentId: string
  swapTargetUserId: string
  swapTargetAssignmentId: string
}

export interface CreateOfferRequestInput {
  workspaceId: string
  requestedById: string
  reason: string
  offerSourceAssignmentId: string
}

export interface CreateTimeOffRequestInput {
  workspaceId: string
  requestedById: string
  reason: string
  timeOffStart: Date
  timeOffEnd: Date
  attachmentUrl?: string | null
  attachmentMimeType?: string | null
  attachmentSizeBytes?: number | null
}

export interface UpdateRequestData {
  status?: RequestStatus
  resolvedById?: string | null
  resolvedAt?: Date | null
  resolutionReason?: string | null
  peerAcceptedAt?: Date | null
  peerRejectedAt?: Date | null
  attachmentUrl?: string | null
  attachmentMimeType?: string | null
  attachmentSizeBytes?: number | null
}

export interface RequestRepository {
  createSwap(input: CreateSwapRequestInput, tx?: DbClient): Promise<RequestRow>
  createOffer(
    input: CreateOfferRequestInput,
    tx?: DbClient,
  ): Promise<RequestRow>
  createTimeOff(
    input: CreateTimeOffRequestInput,
    tx?: DbClient,
  ): Promise<RequestRow>
  findById(id: string, tx?: DbClient): Promise<RequestRow | null>
  findByIdWithRelations(
    id: string,
    tx?: DbClient,
  ): Promise<RequestWithRelationsRow | null>
  update(
    id: string,
    data: UpdateRequestData,
    tx?: DbClient,
  ): Promise<RequestRow>
  listByWorkspace(
    workspaceId: string,
    filter: ListRequestsFilter,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<RequestRow>>
  hasOverlappingApprovedTimeOff(
    input: {
      userId: string
      workspaceId: string
      timeOffStart: Date
      timeOffEnd: Date
      excludeRequestId?: string
    },
    tx?: DbClient,
  ): Promise<boolean>
  findSwapTargetForShift(
    input: { shiftId: string; userId: string },
    tx?: DbClient,
  ): Promise<{ id: string } | null>

  /** Count requests in a workspace whose status is in the given set. */
  countByWorkspaceAndStatus(
    workspaceId: string,
    statuses: RequestStatus[],
    tx?: DbClient,
  ): Promise<number>

  /** Count requests in a workspace requested by a specific user, filtered by status. */
  countForUserAndStatus(
    workspaceId: string,
    userId: string,
    statuses: RequestStatus[],
    tx?: DbClient,
  ): Promise<number>

  /**
   * Group counts by request `type` for a workspace under given statuses.
   * Returns the three v1 types so the frontend can render breakdown stats
   * without three round-trips.
   */
  countByWorkspaceGroupedByType(
    workspaceId: string,
    statuses: RequestStatus[],
    tx?: DbClient,
  ): Promise<{ swap: number; offer: number; timeOff: number }>
}

const REQUEST_SELECT = {
  id: true,
  workspaceId: true,
  type: true,
  status: true,
  requestedById: true,
  resolvedById: true,
  reason: true,
  resolutionReason: true,
  attachmentUrl: true,
  attachmentMimeType: true,
  attachmentSizeBytes: true,
  swapSourceAssignmentId: true,
  swapTargetUserId: true,
  swapTargetAssignmentId: true,
  peerAcceptedAt: true,
  peerRejectedAt: true,
  offerSourceAssignmentId: true,
  timeOffStart: true,
  timeOffEnd: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} as const

const ASSIGNMENT_RELATION_SELECT = {
  id: true,
  shiftId: true,
  userId: true,
  status: true,
  shift: {
    select: {
      id: true,
      scheduleId: true,
      startAt: true,
      endAt: true,
      assignmentMode: true,
      schedule: { select: { workspaceId: true, status: true } },
    },
  },
} as const

export function createRequestRepository(
  prisma: PrismaClient,
): RequestRepository {
  return {
    async createSwap(input, tx) {
      const db = tx ?? prisma
      return db.request.create({
        data: {
          workspaceId: input.workspaceId,
          type: 'SWAP',
          status: 'PENDING_PEER',
          requestedById: input.requestedById,
          reason: input.reason,
          swapSourceAssignmentId: input.swapSourceAssignmentId,
          swapTargetUserId: input.swapTargetUserId,
          swapTargetAssignmentId: input.swapTargetAssignmentId,
        },
        select: REQUEST_SELECT,
      }) as Promise<RequestRow>
    },

    async createOffer(input, tx) {
      const db = tx ?? prisma
      return db.request.create({
        data: {
          workspaceId: input.workspaceId,
          type: 'OFFER',
          status: 'PENDING',
          requestedById: input.requestedById,
          reason: input.reason,
          offerSourceAssignmentId: input.offerSourceAssignmentId,
        },
        select: REQUEST_SELECT,
      }) as Promise<RequestRow>
    },

    async createTimeOff(input, tx) {
      const db = tx ?? prisma
      return db.request.create({
        data: {
          workspaceId: input.workspaceId,
          type: 'TIME_OFF',
          status: 'PENDING',
          requestedById: input.requestedById,
          reason: input.reason,
          timeOffStart: input.timeOffStart,
          timeOffEnd: input.timeOffEnd,
          ...(input.attachmentUrl !== undefined && {
            attachmentUrl: input.attachmentUrl,
          }),
          ...(input.attachmentMimeType !== undefined && {
            attachmentMimeType: input.attachmentMimeType,
          }),
          ...(input.attachmentSizeBytes !== undefined && {
            attachmentSizeBytes: input.attachmentSizeBytes,
          }),
        },
        select: REQUEST_SELECT,
      }) as Promise<RequestRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.request.findUnique({
        where: { id },
        select: REQUEST_SELECT,
      }) as Promise<RequestRow | null>
    },

    async findByIdWithRelations(id, tx) {
      const db = tx ?? prisma
      const row = await db.request.findUnique({
        where: { id },
        select: {
          ...REQUEST_SELECT,
          swapSourceAssignment: { select: ASSIGNMENT_RELATION_SELECT },
          swapTargetAssignment: { select: ASSIGNMENT_RELATION_SELECT },
          offerSourceAssignment: { select: ASSIGNMENT_RELATION_SELECT },
        },
      })
      return row as RequestWithRelationsRow | null
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.request.update({
        where: { id },
        data,
        select: REQUEST_SELECT,
      }) as Promise<RequestRow>
    },

    async listByWorkspace(workspaceId, filter, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor, isCreatedAtCursor)
      const items = await db.request.findMany({
        where: {
          workspaceId,
          ...(filter.status && { status: filter.status }),
          ...(filter.type && { type: filter.type }),
          ...(filter.requestedById && { requestedById: filter.requestedById }),
          ...(decoded && {
            OR: [
              { createdAt: { lt: new Date(decoded.createdAt) } },
              {
                createdAt: new Date(decoded.createdAt),
                id: { lt: decoded.id },
              },
            ],
          }),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: REQUEST_SELECT,
      })

      const hasMore = items.length > limit
      const data = hasMore ? items.slice(0, limit) : items
      const last = data[data.length - 1]
      const nextCursor: string | null =
        hasMore && last
          ? encodeCursor({
              createdAt: last.createdAt.toISOString(),
              id: last.id,
            })
          : null
      return { data: data as RequestRow[], nextCursor }
    },

    async hasOverlappingApprovedTimeOff(input, tx) {
      const db = tx ?? prisma
      const row = await db.request.findFirst({
        where: {
          workspaceId: input.workspaceId,
          requestedById: input.userId,
          type: 'TIME_OFF',
          status: 'APPROVED',
          ...(input.excludeRequestId && {
            id: { not: input.excludeRequestId },
          }),
          timeOffStart: { lt: input.timeOffEnd },
          timeOffEnd: { gt: input.timeOffStart },
        },
        select: { id: true },
      })
      return row !== null
    },

    async findSwapTargetForShift(input, tx) {
      const db = tx ?? prisma
      const row = await db.request.findFirst({
        where: {
          swapTargetUserId: input.userId,
          OR: [
            { swapSourceAssignment: { shiftId: input.shiftId } },
            { swapTargetAssignment: { shiftId: input.shiftId } },
          ],
        },
        select: { id: true },
      })
      return row
    },

    async countByWorkspaceAndStatus(workspaceId, statuses, tx) {
      if (statuses.length === 0) return 0
      const db = tx ?? prisma
      return db.request.count({
        where: { workspaceId, status: { in: statuses } },
      })
    },

    async countForUserAndStatus(workspaceId, userId, statuses, tx) {
      if (statuses.length === 0) return 0
      const db = tx ?? prisma
      return db.request.count({
        where: {
          workspaceId,
          requestedById: userId,
          status: { in: statuses },
        },
      })
    },

    async countByWorkspaceGroupedByType(workspaceId, statuses, tx) {
      if (statuses.length === 0) return { swap: 0, offer: 0, timeOff: 0 }
      const db = tx ?? prisma
      const grouped = await db.request.groupBy({
        by: ['type'],
        where: { workspaceId, status: { in: statuses } },
        _count: { _all: true },
      })
      return {
        swap: grouped.find((g) => g.type === 'SWAP')?._count._all ?? 0,
        offer: grouped.find((g) => g.type === 'OFFER')?._count._all ?? 0,
        timeOff: grouped.find((g) => g.type === 'TIME_OFF')?._count._all ?? 0,
      }
    },
  }
}
