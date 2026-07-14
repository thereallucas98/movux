import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { NestedAssignmentIdParamSchema } from '~/server/schemas/assignment.schema'
import { unassignUser } from '~/server/use-cases'

type RouteContext = {
  params: Promise<{
    id: string
    scheduleId: string
    shiftId: string
    assignmentId: string
  }>
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = NestedAssignmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await unassignUser(
    workspaceMembershipRepository,
    assignmentRepository,
    auditLogRepository,
    principal,
    { assignmentId: paramParsed.data.assignmentId },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
