import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import { proposalRepository, shipmentEventRepository, shipmentRepository } from '~/server/repositories'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import { markDelivered } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shipmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await markDelivered(
    {
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      shipmentEventRepo: shipmentEventRepository,
    },
    principal.userId,
    paramParsed.data.shipmentId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ status: 'DELIVERED' }, { status: 200 })
}
