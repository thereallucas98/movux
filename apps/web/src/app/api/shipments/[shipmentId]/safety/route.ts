import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  customerProfileRepository,
  proposalRepository,
  safetyCheckInRepository,
  shipmentRepository,
} from '~/server/repositories'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import { getSafetyCheckInStatus } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shipmentId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER' && principal.role !== 'CARRIER') {
    return errorResponse('FORBIDDEN')
  }

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await getSafetyCheckInStatus(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      safetyCheckInRepo: safetyCheckInRepository,
    },
    principal.userId,
    principal.role,
    paramParsed.data.shipmentId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(
    { customer: result.customer, carrier: result.carrier },
    { status: 200 },
  )
}
