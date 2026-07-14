import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  transferRequestRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ListTransferRequestsQuerySchema,
  WorkspaceIdParamSchema,
} from '~/server/schemas/assignment-decision.schema'
import { listTransferRequestsForWorkspace } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const queryParsed = ListTransferRequestsQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)

  const principal = await getPrincipal(req)
  const result = await listTransferRequestsForWorkspace(
    workspaceMembershipRepository,
    transferRequestRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      filter: { status: queryParsed.data.status },
      cursor: queryParsed.data.cursor,
      limit: queryParsed.data.limit,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
