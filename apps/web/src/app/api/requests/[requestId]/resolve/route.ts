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
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  RequestIdParamSchema,
  ResolveRequestBodySchema,
} from '~/server/schemas/request.schema'
import { resolveRequest } from '~/server/use-cases'

type RouteContext = { params: Promise<{ requestId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = RequestIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = ResolveRequestBodySchema.safeParse(body ?? {})
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await resolveRequest(
    workspaceMembershipRepository,
    requestRepository,
    shiftRepository,
    assignmentRepository,
    auditLogRepository,
    principal,
    {
      requestId: paramParsed.data.requestId,
      decision: bodyParsed.data.decision,
      resolutionReason: bodyParsed.data.resolutionReason ?? null,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
