import type { Prisma, PrismaClient } from '~/generated/prisma/client'
import {
  decodeCursor,
  encodeCursor,
  isCreatedAtCursor,
} from '~/server/lib/cursor'
import type { ListPage } from './tenant.repository'

type DbClient = PrismaClient | Prisma.TransactionClient

export type TransferRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export interface TransferRequestRow {
  id: string
  originalAssignmentId: string
  targetUserId: string
  requestedByUserId: string
  reason: string
  status: TransferRequestStatus
  decidedByUserId: string | null
  decidedAt: Date | null
  decisionReason: string | null
  newAssignmentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TransferRequestWithJoinsRow extends TransferRequestRow {
  originalAssignment: {
    id: string
    shiftId: string
    userId: string
    status: string
    decisionDeadline: Date
    shift: {
      id: string
      scheduleId: string
      startAt: Date
      endAt: Date
      headcount: number
      status: string
      decisionWindowHours: number
      categoryId: string
      schedule: { workspaceId: string; status: string }
    }
  }
}

export interface ListTransferRequestsFilter {
  status?: TransferRequestStatus
}

export interface TransferRequestRepository {
  create(
    data: {
      originalAssignmentId: string
      targetUserId: string
      requestedByUserId: string
      reason: string
    },
    tx?: DbClient,
  ): Promise<TransferRequestRow>

  findById(id: string, tx?: DbClient): Promise<TransferRequestRow | null>

  findByIdWithJoins(
    id: string,
    tx?: DbClient,
  ): Promise<TransferRequestWithJoinsRow | null>

  update(
    id: string,
    data: Partial<{
      status: TransferRequestStatus
      decidedByUserId: string | null
      decidedAt: Date | null
      decisionReason: string | null
      newAssignmentId: string | null
    }>,
    tx?: DbClient,
  ): Promise<TransferRequestRow>

  listForWorkspace(
    workspaceId: string,
    filter: ListTransferRequestsFilter,
    cursor: string | null | undefined,
    limit: number,
    tx?: DbClient,
  ): Promise<ListPage<TransferRequestRow>>

  listForAssignment(
    assignmentId: string,
    tx?: DbClient,
  ): Promise<TransferRequestRow[]>
}

const TRANSFER_REQUEST_SELECT = {
  id: true,
  originalAssignmentId: true,
  targetUserId: true,
  requestedByUserId: true,
  reason: true,
  status: true,
  decidedByUserId: true,
  decidedAt: true,
  decisionReason: true,
  newAssignmentId: true,
  createdAt: true,
  updatedAt: true,
} as const

export function createTransferRequestRepository(
  prisma: PrismaClient,
): TransferRequestRepository {
  return {
    async create(data, tx) {
      const db = tx ?? prisma
      return db.transferRequest.create({
        data: {
          originalAssignmentId: data.originalAssignmentId,
          targetUserId: data.targetUserId,
          requestedByUserId: data.requestedByUserId,
          reason: data.reason,
        },
        select: TRANSFER_REQUEST_SELECT,
      }) as Promise<TransferRequestRow>
    },

    async findById(id, tx) {
      const db = tx ?? prisma
      return db.transferRequest.findUnique({
        where: { id },
        select: TRANSFER_REQUEST_SELECT,
      }) as Promise<TransferRequestRow | null>
    },

    async findByIdWithJoins(id, tx) {
      const db = tx ?? prisma
      const row = await db.transferRequest.findUnique({
        where: { id },
        select: {
          ...TRANSFER_REQUEST_SELECT,
          originalAssignment: {
            select: {
              id: true,
              shiftId: true,
              userId: true,
              status: true,
              decisionDeadline: true,
              shift: {
                select: {
                  id: true,
                  scheduleId: true,
                  startAt: true,
                  endAt: true,
                  headcount: true,
                  status: true,
                  decisionWindowHours: true,
                  categoryId: true,
                  schedule: { select: { workspaceId: true, status: true } },
                },
              },
            },
          },
        },
      })
      return row as TransferRequestWithJoinsRow | null
    },

    async update(id, data, tx) {
      const db = tx ?? prisma
      return db.transferRequest.update({
        where: { id },
        data,
        select: TRANSFER_REQUEST_SELECT,
      }) as Promise<TransferRequestRow>
    },

    async listForWorkspace(workspaceId, filter, cursor, limit, tx) {
      const db = tx ?? prisma
      const decoded = decodeCursor(cursor, isCreatedAtCursor)
      const items = await db.transferRequest.findMany({
        where: {
          ...(filter.status && { status: filter.status }),
          originalAssignment: {
            shift: { schedule: { workspaceId } },
          },
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
        select: TRANSFER_REQUEST_SELECT,
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

      return { data: data as TransferRequestRow[], nextCursor }
    },

    async listForAssignment(assignmentId, tx) {
      const db = tx ?? prisma
      return db.transferRequest.findMany({
        where: { originalAssignmentId: assignmentId },
        orderBy: { createdAt: 'desc' },
        select: TRANSFER_REQUEST_SELECT,
      }) as Promise<TransferRequestRow[]>
    },
  }
}
