import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import { auditLogRepository, requestRepository } from '~/server/repositories'
import { RequestIdParamSchema } from '~/server/schemas/request.schema'
import { cancelRequest } from '~/server/use-cases'

type RouteContext = { params: Promise<{ requestId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const parsed = RequestIdParamSchema.safeParse(params)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const principal = await getPrincipal(req)
  const result = await cancelRequest(
    requestRepository,
    auditLogRepository,
    principal,
    { requestId: parsed.data.requestId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
