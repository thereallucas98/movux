import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  scheduleRepository,
  shiftPatternRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  GeneratePatternSchema,
  PatternIdParamSchema,
} from '~/server/schemas/shift-pattern.schema'
import { generateShiftsFromPattern } from '~/server/use-cases'

type RouteContext = {
  params: Promise<{ id: string; scheduleId: string; patternId: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = PatternIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = GeneratePatternSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await generateShiftsFromPattern(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftPatternRepository,
    shiftRepository,
    auditLogRepository,
    principal,
    {
      patternId: paramParsed.data.patternId,
      rangeStart: bodyParsed.data.rangeStart,
      rangeEnd: bodyParsed.data.rangeEnd,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 200 })
}
