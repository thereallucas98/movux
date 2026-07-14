import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  categoryRepository,
  tenantMembershipRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import {
  CreateWorkspaceSchema,
  CursorPageSchema,
} from '~/server/schemas/workspace.schema'
import { createWorkspace, listWorkspacesForUser } from '~/server/use-cases'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)

  const body = await req.json().catch(() => null)
  const parsed = CreateWorkspaceSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await createWorkspace(
    workspaceRepository,
    workspaceMembershipRepository,
    tenantMembershipRepository,
    categoryRepository,
    auditLogRepository,
    principal,
    parsed.data,
  )
  if (!result.success) return errorResponseFromResult(result)

  return NextResponse.json(
    { workspace: result.data.workspace, membership: result.data.membership },
    { status: 201 },
  )
}

export async function GET(req: Request) {
  const principal = await getPrincipal(req)

  const url = new URL(req.url)
  const parsed = CursorPageSchema.safeParse({
    cursor: url.searchParams.get('cursor') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await listWorkspacesForUser(workspaceRepository, principal, {
    cursor: parsed.data.cursor ?? null,
    limit: parsed.data.limit,
  })
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.data, { status: 200 })
}
