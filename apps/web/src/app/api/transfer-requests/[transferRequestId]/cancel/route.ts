import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  transferRequestRepository,
} from '~/server/repositories'
import { TransferRequestIdParamSchema } from '~/server/schemas/assignment-decision.schema'
import { cancelTransferRequest } from '~/server/use-cases'

type RouteContext = { params: Promise<{ transferRequestId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TransferRequestIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await cancelTransferRequest(
    transferRequestRepository,
    auditLogRepository,
    principal,
    { transferRequestId: paramParsed.data.transferRequestId },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
