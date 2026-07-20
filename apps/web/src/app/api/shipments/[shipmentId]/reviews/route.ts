import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import {
  carrierProfileRepository,
  customerProfileRepository,
  proposalRepository,
  reviewRepository,
  reviewTagRepository,
  shipmentRepository,
} from '~/server/repositories'
import { SubmitReviewSchema } from '~/server/schemas/review.schema'
import { ShipmentIdParamSchema } from '~/server/schemas/shipment.schema'
import { listReviewsForShipment, submitReview } from '~/server/use-cases'

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

  const body = await req.json().catch(() => null)
  const bodyParsed = SubmitReviewSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const result = await submitReview(
    {
      customerProfileRepo: customerProfileRepository,
      carrierProfileRepo: carrierProfileRepository,
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      reviewRepo: reviewRepository,
      reviewTagRepo: reviewTagRepository,
    },
    principal.userId,
    principal.role,
    paramParsed.data.shipmentId,
    bodyParsed.data,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.review, { status: 201 })
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

  const result = await listReviewsForShipment(
    {
      customerProfileRepo: customerProfileRepository,
      shipmentRepo: shipmentRepository,
      proposalRepo: proposalRepository,
      reviewRepo: reviewRepository,
    },
    principal.userId,
    principal.role,
    paramParsed.data.shipmentId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.reviews, { status: 200 })
}
