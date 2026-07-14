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
  shiftCandidateRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { ShiftIdParamSchema } from '~/server/schemas/candidate.schema'
import { applyToShift } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shiftId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await applyToShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    assignmentRepository,
    shiftCandidateRepository,
    auditLogRepository,
    principal,
    { shiftId: paramParsed.data.shiftId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 201 })
}
