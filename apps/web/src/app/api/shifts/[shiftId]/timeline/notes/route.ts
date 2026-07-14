import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  requestRepository,
  scheduleRepository,
  shiftCandidateRepository,
  shiftRepository,
  shiftTimelineNoteRepository,
  userRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  AddShiftTimelineNoteBodySchema,
  ShiftIdParamSchema,
} from '~/server/schemas/shift-timeline.schema'
import { addShiftTimelineNote } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shiftId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = AddShiftTimelineNoteBodySchema.safeParse(body ?? {})
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await addShiftTimelineNote(
    workspaceMembershipRepository,
    shiftRepository,
    scheduleRepository,
    assignmentRepository,
    shiftCandidateRepository,
    requestRepository,
    shiftTimelineNoteRepository,
    auditLogRepository,
    userRepository,
    principal,
    {
      shiftId: paramParsed.data.shiftId,
      note: bodyParsed.data.note,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 201 })
}
