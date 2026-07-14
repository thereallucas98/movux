import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  scheduleRepository,
  shiftExpectedCompositionRepository,
  shiftRepository,
  specialtyRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  SetExpectedCompositionSchema,
  ShiftIdParamSchema,
} from '~/server/schemas/shift.schema'
import {
  getShiftExpectedComposition,
  setExpectedComposition,
} from '~/server/use-cases'

type RouteContext = {
  params: Promise<{ id: string; scheduleId: string; shiftId: string }>
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = SetExpectedCompositionSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await setExpectedComposition(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    specialtyRepository,
    shiftExpectedCompositionRepository,
    auditLogRepository,
    principal,
    { shiftId: paramParsed.data.shiftId, items: bodyParsed.data.items },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getShiftExpectedComposition(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    shiftExpectedCompositionRepository,
    principal,
    { shiftId: paramParsed.data.shiftId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
