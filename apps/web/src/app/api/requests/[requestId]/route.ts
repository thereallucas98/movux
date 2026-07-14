import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  requestRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { RequestIdParamSchema } from '~/server/schemas/request.schema'
import { getRequest } from '~/server/use-cases'

type RouteContext = { params: Promise<{ requestId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const parsed = RequestIdParamSchema.safeParse(params)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const principal = await getPrincipal(req)
  const result = await getRequest(
    workspaceMembershipRepository,
    requestRepository,
    principal,
    { requestId: parsed.data.requestId },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
