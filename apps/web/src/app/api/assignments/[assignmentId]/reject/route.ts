import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  AssignmentIdActionParamSchema,
  RejectAssignmentSchema,
} from '~/server/schemas/assignment-decision.schema'
import { rejectAssignment } from '~/server/use-cases'

type RouteContext = { params: Promise<{ assignmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = AssignmentIdActionParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = RejectAssignmentSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await rejectAssignment(
    workspaceMembershipRepository,
    shiftRepository,
    assignmentRepository,
    auditLogRepository,
    principal,
    {
      assignmentId: paramParsed.data.assignmentId,
      reason: bodyParsed.data.reason,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    { ...result.data, shiftUnfilled: result.shiftUnfilled },
    { status: 200 },
  )
}
