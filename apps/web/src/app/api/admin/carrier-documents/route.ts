import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import { carrierDocumentRepository } from '~/server/repositories'
import { ListCarrierDocumentsQuerySchema } from '~/server/schemas/carrier-document.schema'
import { listCarrierDocumentsForAdmin } from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')

  const url = new URL(req.url)
  const queryParsed = ListCarrierDocumentsQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)

  const result = await listCarrierDocumentsForAdmin(
    { carrierDocumentRepo: carrierDocumentRepository },
    queryParsed.data,
  )

  return NextResponse.json(result, { status: 200 })
}
