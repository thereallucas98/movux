import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  tenantMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import {
  CursorPageSchema,
  TenantIdParamSchema,
} from '~/server/schemas/workspace.schema'
import { listWorkspacesForTenant } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const pageParsed = CursorPageSchema.safeParse({
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!pageParsed.success) return validationErrorResponse(pageParsed.error)

  const principal = await getPrincipal(req)
  const result = await listWorkspacesForTenant(
    workspaceRepository,
    tenantMembershipRepository,
    principal,
    {
      tenantId: paramParsed.data.id,
      cursor: pageParsed.data.cursor ?? null,
      limit: pageParsed.data.limit,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
