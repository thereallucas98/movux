import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  scheduleRepository,
  shiftExpectedCompositionRepository,
  shiftRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  AssignUsersToShiftSchema,
  NestedShiftAssignmentsParamSchema,
} from '~/server/schemas/assignment.schema'
import { assignUsersToShift, listAssignmentsForShift } from '~/server/use-cases'

type RouteContext = {
  params: Promise<{ id: string; scheduleId: string; shiftId: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = NestedShiftAssignmentsParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = AssignUsersToShiftSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await assignUsersToShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    assignmentRepository,
    userSpecialtyRepository,
    shiftExpectedCompositionRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      shiftId: paramParsed.data.shiftId,
      userIds: bodyParsed.data.userIds,
    },
  )

  if (!result.success) {
    if (result.code === 'SHIFT_OVERLAP_CONFLICT') {
      return errorResponse(result.code, {
        details: {
          conflicts: result.conflicts,
          alternatives: result.alternatives,
        },
      })
    }
    return errorResponse(result.code)
  }

  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = NestedShiftAssignmentsParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await listAssignmentsForShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    assignmentRepository,
    userSpecialtyRepository,
    shiftExpectedCompositionRepository,
    principal,
    { shiftId: paramParsed.data.shiftId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
