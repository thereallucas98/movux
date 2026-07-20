import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { errorResponse, validationErrorResponse } from '~/server/http/error-response'
import { carrierDocumentRepository } from '~/server/repositories'
import {
  DocumentTypeSchema,
  parseDocumentField,
} from '~/server/schemas/carrier-document.schema'
import { listCarrierDocuments, uploadCarrierDocument } from '~/server/use-cases'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.startsWith('multipart/form-data')) {
    return errorResponse('VALIDATION_ERROR')
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return errorResponse('VALIDATION_ERROR')
  }

  const typeParsed = DocumentTypeSchema.safeParse(formData.get('type'))
  if (!typeParsed.success) return validationErrorResponse(typeParsed.error)

  const fileParsed = parseDocumentField(formData)
  if (!fileParsed.success) return errorResponse(fileParsed.code)

  const buffer = Buffer.from(await fileParsed.file.arrayBuffer())

  const result = await uploadCarrierDocument(
    { carrierDocumentRepo: carrierDocumentRepository },
    principal.userId,
    typeParsed.data,
    {
      buffer,
      contentType: fileParsed.file.type,
      originalFilename: fileParsed.file.name,
    },
  )
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.document, { status: 201 })
}

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')
  if (principal.role !== 'CARRIER') return errorResponse('FORBIDDEN')

  const result = await listCarrierDocuments(
    { carrierDocumentRepo: carrierDocumentRepository },
    principal.userId,
  )

  return NextResponse.json(result.documents, { status: 200 })
}
