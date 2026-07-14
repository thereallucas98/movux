import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  shiftRepository,
  transferRequestRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  DecideTransferRequestSchema,
  TransferRequestIdParamSchema,
} from '~/server/schemas/assignment-decision.schema'
import { decideTransferRequest } from '~/server/use-cases'

type RouteContext = { params: Promise<{ transferRequestId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TransferRequestIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = DecideTransferRequestSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await decideTransferRequest(
    workspaceMembershipRepository,
    shiftRepository,
    assignmentRepository,
    transferRequestRepository,
    auditLogRepository,
    principal,
    {
      transferRequestId: paramParsed.data.transferRequestId,
      decision: bodyParsed.data.decision,
      reason: bodyParsed.data.reason,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    { ...result.data, shiftUnfilled: result.shiftUnfilled },
    { status: 200 },
  )
}
