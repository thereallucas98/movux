import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  customerProfileRepository,
  notificationLogRepository,
  proposalQueueRepository,
  proposalRepository,
  shipmentEventRepository,
  shipmentRepository,
  userRepository,
} from '~/server/repositories'
import { ProposalIdParamSchema } from '~/server/schemas/proposal.schema'
import { rejectProposal } from '~/server/use-cases'

type RouteContext = {
  params: Promise<{ shipmentId: string; proposalId: string }>
}

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = ProposalIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await rejectProposal(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      queueRepo: proposalQueueRepository,
      shipmentEventRepo: shipmentEventRepository,
      userRepo: userRepository,
      notificationLogRepo: notificationLogRepository,
    },
    principal.userId,
    paramParsed.data.shipmentId,
    paramParsed.data.proposalId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ status: 'REJECTED' }, { status: 200 })
}
