import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  scheduleRepository,
  shiftCandidateRepository,
  shiftExpectedCompositionRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ShiftIdParamSchema,
  UpdateShiftSchema,
} from '~/server/schemas/shift.schema'
import { deleteShift, getShiftById, updateShift } from '~/server/use-cases'

type RouteContext = {
  params: Promise<{ id: string; scheduleId: string; shiftId: string }>
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getShiftById(
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

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = UpdateShiftSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await updateShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    shiftCandidateRepository,
    auditLogRepository,
    principal,
    { shiftId: paramParsed.data.shiftId, data: bodyParsed.data },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const reason = url.searchParams.get('reason')

  const principal = await getPrincipal(req)
  const result = await deleteShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    auditLogRepository,
    principal,
    { shiftId: paramParsed.data.shiftId, reason },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
