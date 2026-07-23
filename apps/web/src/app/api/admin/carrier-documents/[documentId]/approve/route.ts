import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  carrierDocumentRepository,
  carrierProfileRepository,
  notificationLogRepository,
  userRepository,
} from '~/server/repositories'
import { CarrierDocumentIdParamSchema } from '~/server/schemas/carrier-document.schema'
import { approveCarrierDocument } from '~/server/use-cases'

type RouteContext = { params: Promise<{ documentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = CarrierDocumentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const result = await approveCarrierDocument(
    {
      carrierDocumentRepo: carrierDocumentRepository,
      carrierProfileRepo: carrierProfileRepository,
      userRepo: userRepository,
      notificationLogRepo: notificationLogRepository,
    },
    principal.userId,
    paramParsed.data.documentId,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ status: 'APPROVED' }, { status: 200 })
}
