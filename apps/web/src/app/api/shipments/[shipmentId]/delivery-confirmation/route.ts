import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  customerProfileRepository,
  deliveryConfirmationRepository,
  proposalRepository,
  shipmentRepository,
} from '~/server/repositories'
import { DeliveryConfirmationBodySchema } from '~/server/schemas/delivery-confirmation.schema'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import {
  confirmDelivery,
  getDeliveryConfirmationStatus,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ shipmentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = DeliveryConfirmationBodySchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const result = await confirmDelivery(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
      deliveryConfirmationRepo: deliveryConfirmationRepository,
    },
    principal.userId,
    paramParsed.data.shipmentId,
    bodyParsed.data.confirmed,
    bodyParsed.data.issueDescription,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.confirmation, { status: 201 })
}

export async function GET(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER' && principal.role !== 'CARRIER') {
    return errorResponse('FORBIDDEN')
  }

  const params = await context.params
  const paramParsed = ShipmentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await getDeliveryConfirmationStatus(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      deliveryConfirmationRepo: deliveryConfirmationRepository,
    },
    principal.userId,
    principal.role,
    paramParsed.data.shipmentId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.confirmation, { status: 200 })
}
