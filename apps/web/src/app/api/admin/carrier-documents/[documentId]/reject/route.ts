import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import { carrierDocumentRepository } from '~/server/repositories'
import {
  CarrierDocumentIdParamSchema,
  RejectCarrierDocumentSchema,
} from '~/server/schemas/carrier-document.schema'
import { rejectCarrierDocument } from '~/server/use-cases'

type RouteContext = { params: Promise<{ documentId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')

  const params = await context.params
  const paramParsed = CarrierDocumentIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = RejectCarrierDocumentSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const result = await rejectCarrierDocument(
    { carrierDocumentRepo: carrierDocumentRepository },
    principal.userId,
    paramParsed.data.documentId,
    bodyParsed.data.rejectionReason,
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json({ status: 'REJECTED' }, { status: 200 })
}
