import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  customerProfileRepository,
  pricingRepository,
  shipmentRepository,
} from '~/server/repositories'
import {
  CreateShipmentSchema,
  ListShipmentsQuerySchema,
} from '~/server/schemas/shipment.schema'
import { createShipment, listShipmentsForCustomer } from '~/server/use-cases'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER') return errorResponse('FORBIDDEN')

  const body = await req.json().catch(() => null)
  const parsed = CreateShipmentSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await createShipment(
    {
      customerProfileRepo: customerProfileRepository,
      pricingRepo: pricingRepository,
      shipmentRepo: shipmentRepository,
    },
    principal.userId,
    parsed.data,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ shipment: result.shipment }, { status: 201 })
}

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CUSTOMER') return errorResponse('FORBIDDEN')

  const url = new URL(req.url)
  const parsed = ListShipmentsQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await listShipmentsForCustomer(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
    },
    principal.userId,
    parsed.data,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(
    { data: result.data, nextCursor: result.nextCursor },
    { status: 200 },
  )
}
