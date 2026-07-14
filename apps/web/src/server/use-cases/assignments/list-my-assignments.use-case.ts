import type {
  AssignmentRepository,
  AssignmentStatus,
  AssignmentWithShiftRow,
} from '~/server/repositories/assignment.repository'
import type { Principal } from '../tenants/create-tenant.use-case'

export interface ListMyAssignmentsInput {
  statuses: AssignmentStatus[]
  from?: Date
  to?: Date
}

export type ListMyAssignmentsResult =
  | { success: true; data: AssignmentWithShiftRow[] }
  | { success: false; code: 'UNAUTHENTICATED' }

export async function listMyAssignments(
  assignmentRepo: AssignmentRepository,
  principal: Principal | null,
  input: ListMyAssignmentsInput,
): Promise<ListMyAssignmentsResult> {
  if (!principal) {
    return { success: false, code: 'UNAUTHENTICATED' }
  }
  const data = await assignmentRepo.listForUser(principal.userId, {
    statuses: input.statuses,
    from: input.from,
    to: input.to,
  })
  return { success: true, data }
}
