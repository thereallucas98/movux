import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  requestRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ListRequestsQuerySchema,
  parseAttachmentField,
  SubmitRequestSchema,
} from '~/server/schemas/request.schema'
import {
  listRequests,
  submitOfferRequest,
  submitSwapRequest,
  submitTimeOffRequest,
} from '~/server/use-cases'

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? ''
  let bodyJson: unknown
  let attachmentFile: File | null = null

  if (contentType.startsWith('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return errorResponse('VALIDATION_ERROR')
    }
    const attachmentRes = parseAttachmentField(formData)
    if (!attachmentRes.success) return errorResponse(attachmentRes.code)
    attachmentFile = attachmentRes.file

    const payloadRaw = formData.get('payload')
    if (typeof payloadRaw !== 'string') {
      return errorResponse('VALIDATION_ERROR')
    }
    try {
      bodyJson = JSON.parse(payloadRaw)
    } catch {
      return errorResponse('VALIDATION_ERROR')
    }
  } else {
    bodyJson = await req.json().catch(() => null)
  }

  const parsed = SubmitRequestSchema.safeParse(bodyJson)
  if (!parsed.success) return validationErrorResponse(parsed.error)
  const body = parsed.data

  const principal = await getPrincipal(req)

  if (body.type === 'SWAP') {
    const result = await submitSwapRequest(
      workspaceMembershipRepository,
      shiftRepository,
      assignmentRepository,
      requestRepository,
      auditLogRepository,
      principal,
      {
        workspaceId: body.workspaceId,
        swapSourceAssignmentId: body.swapSourceAssignmentId,
        swapTargetUserId: body.swapTargetUserId,
        swapTargetAssignmentId: body.swapTargetAssignmentId,
        reason: body.reason,
      },
    )
    if (!result.success) return errorResponseFromResult(result)
    return NextResponse.json(result.data, { status: 201 })
  }

  if (body.type === 'OFFER') {
    const result = await submitOfferRequest(
      workspaceMembershipRepository,
      assignmentRepository,
      requestRepository,
      auditLogRepository,
      principal,
      {
        workspaceId: body.workspaceId,
        offerSourceAssignmentId: body.offerSourceAssignmentId,
        reason: body.reason,
      },
    )
    if (!result.success) return errorResponseFromResult(result)
    return NextResponse.json(result.data, { status: 201 })
  }

  // TIME_OFF
  const attachmentBytes = attachmentFile
    ? Buffer.from(await attachmentFile.arrayBuffer())
    : null
  const result = await submitTimeOffRequest(
    workspaceMembershipRepository,
    requestRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: body.workspaceId,
      timeOffStart: new Date(body.timeOffStart),
      timeOffEnd: new Date(body.timeOffEnd),
      reason: body.reason,
      ...(attachmentFile &&
        attachmentBytes && {
          attachment: {
            file: attachmentBytes,
            contentType: attachmentFile.type,
            sizeBytes: attachmentFile.size,
            originalFilename: attachmentFile.name,
          },
        }),
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const queryRaw = {
    workspaceId: url.searchParams.get('workspaceId') ?? '',
    status: url.searchParams.get('status') ?? undefined,
    type: url.searchParams.get('type') ?? undefined,
    scope: url.searchParams.get('scope') ?? undefined,
  }
  const parsed = ListRequestsQuerySchema.safeParse(queryRaw)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const principal = await getPrincipal(req)
  const cursor = url.searchParams.get('cursor')
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Number(limitRaw) : undefined

  const result = await listRequests(
    workspaceMembershipRepository,
    requestRepository,
    principal,
    {
      workspaceId: parsed.data.workspaceId,
      status: parsed.data.status,
      type: parsed.data.type,
      scope: parsed.data.scope,
      cursor,
      limit,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(
    { data: result.data, nextCursor: result.nextCursor },
    { status: 200 },
  )
}
