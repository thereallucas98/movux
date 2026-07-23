import { NextResponse } from 'next/server'
import { getClientIp } from '~/lib/get-client-ip'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  customerProfileRepository,
  proposalRepository,
  safetyCheckInRepository,
  shipmentEventRepository,
  shipmentRepository,
} from '~/server/repositories'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import { confirmSafetyCheckIn } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shipmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER' && principal.role !== 'CARRIER') {
    return errorResponse('FORBIDDEN')
  }

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await confirmSafetyCheckIn(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      safetyCheckInRepo: safetyCheckInRepository,
      shipmentEventRepo: shipmentEventRepository,
    },
    principal.userId,
    principal.role,
    paramParsed.data.shipmentId,
    getClientIp(req),
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.checkIn, { status: 201 })
}
