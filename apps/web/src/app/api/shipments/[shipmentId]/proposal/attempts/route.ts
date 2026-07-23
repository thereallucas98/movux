import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  notificationLogRepository,
  proposalQueueRepository,
  proposalRepository,
  userRepository,
} from '~/server/repositories'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import { AddProposalAttemptSchema } from '~/server/schemas/proposal.schema'
import { addProposalAttempt } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shipmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = AddProposalAttemptSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const result = await addProposalAttempt(
    {
      proposalRepo: proposalRepository,
      queueRepo: proposalQueueRepository,
      userRepo: userRepository,
      notificationLogRepo: notificationLogRepository,
    },
    principal.userId,
    paramParsed.data.shipmentId,
    bodyParsed.data,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.proposal, { status: 201 })
}
