import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  shiftExpectedCompositionRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { FlatAssignmentIdParamSchema } from '~/server/schemas/assignment.schema'
import { getAssignmentById, unassignUser } from '~/server/use-cases'

type RouteContext = { params: Promise<{ assignmentId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = FlatAssignmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getAssignmentById(
    workspaceMembershipRepository,
    assignmentRepository,
    userSpecialtyRepository,
    shiftExpectedCompositionRepository,
    principal,
    { assignmentId: paramParsed.data.assignmentId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = FlatAssignmentIdParamSchema.safeParse(params)
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
