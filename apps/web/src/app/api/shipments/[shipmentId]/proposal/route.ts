import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import {
  customerProfileRepository,
  notificationLogRepository,
  proposalQueueRepository,
  proposalRepository,
  shipmentEventRepository,
  shipmentRepository,
  userRepository,
} from '~/server/repositories'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import { SubmitProposalSchema } from '~/server/schemas/proposal.schema'
import { getMyProposal, submitProposal } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shipmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = SubmitProposalSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const result = await submitProposal(
    {
      shipmentRepo: shipmentRepository,
      queueRepo: proposalQueueRepository,
      proposalRepo: proposalRepository,
      shipmentEventRepo: shipmentEventRepository,
      customerProfileRepo: customerProfileRepository,
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

export async function GET(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await getMyProposal(
    {
      proposalRepo: proposalRepository,
      queueRepo: proposalQueueRepository,
      userRepo: userRepository,
      notificationLogRepo: notificationLogRepository,
    },
    principal.userId,
    paramParsed.data.shipmentId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.proposal, { status: 200 })
}
