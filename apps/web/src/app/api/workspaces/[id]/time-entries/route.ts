import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  timeEntryRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ListTimeEntriesQuerySchema,
  WorkspaceIdParamSchema,
} from '~/server/schemas/time-entry.schema'
import { exportTimeEntriesCsv, listTimeEntries } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const queryRaw = {
    format: url.searchParams.get('format') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
    userId: url.searchParams.get('userId') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  }
  const queryParsed = ListTimeEntriesQuerySchema.safeParse(queryRaw)
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)
  const q = queryParsed.data

  const principal = await getPrincipal(req)

  if (q.format === 'csv') {
    const result = await exportTimeEntriesCsv(
      workspaceMembershipRepository,
      timeEntryRepository,
      principal,
      {
        workspaceId: paramParsed.data.id,
        ...(q.from && { from: new Date(q.from) }),
        ...(q.to && { to: new Date(q.to) }),
        ...(q.userId && { userId: q.userId }),
      },
    )
    if (!result.success) return errorResponse(result.code)
    return new Response(result.data.body, {
      status: 200,
      headers: {
        'Content-Type': result.data.contentType,
        'Content-Disposition': `attachment; filename="${result.data.filename}"`,
      },
    })
  }

  const result = await listTimeEntries(
    workspaceMembershipRepository,
    timeEntryRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      ...(q.from && { from: new Date(q.from) }),
      ...(q.to && { to: new Date(q.to) }),
      ...(q.userId && { userId: q.userId }),
      cursor: q.cursor ?? null,
      ...(q.limit && { limit: q.limit }),
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    { data: result.data, nextCursor: result.nextCursor },
    { status: 200 },
  )
}
