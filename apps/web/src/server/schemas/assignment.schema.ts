import { z } from 'zod'

/** Path params for nested assignment routes (under workspaces/.../shifts/...). */
export const NestedAssignmentIdParamSchema = z.object({
  id: z.uuid(),
  scheduleId: z.uuid(),
  shiftId: z.uuid(),
  assignmentId: z.uuid(),
})

/** Path params for nested POST + GET (no assignmentId yet). */
export const NestedShiftAssignmentsParamSchema = z.object({
  id: z.uuid(),
  scheduleId: z.uuid(),
  shiftId: z.uuid(),
})

/** Path param for flat /api/assignments/:assignmentId routes. */
export const FlatAssignmentIdParamSchema = z.object({
  assignmentId: z.uuid(),
})

export const AssignUsersToShiftSchema = z.object({
  userIds: z.array(z.uuid()).min(1).max(20),
})

export const AssignmentStatusSchema = z.enum([
  'PENDING_ACCEPT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'TRANSFERRED',
  'PENDING_CLOSURE',
  'COMPLETED',
])
