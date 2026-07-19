import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import { shipmentRepository } from '~/server/repositories'
import { BrowseShipmentsQuerySchema } from '~/server/schemas/shipment.schema'
import { browseOpenShipments } from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const url = new URL(req.url)
  const parsed = BrowseShipmentsQuerySchema.safeParse({
    cityId: url.searchParams.get('cityId') ?? undefined,
    type: url.searchParams.get('type') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await browseOpenShipments(shipmentRepository, parsed.data)

  return NextResponse.json({ data: result.data, nextCursor: result.nextCursor }, { status: 200 })
}
