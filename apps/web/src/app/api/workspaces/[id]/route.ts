import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import {
  CursorPageSchema,
  UpdateWorkspaceSchema,
  WorkspaceIdParamSchema,
} from '~/server/schemas/workspace.schema'
import {
  getWorkspaceById,
  softDeleteWorkspace,
  updateWorkspace,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const pageParsed = CursorPageSchema.safeParse({
    cursor: url.searchParams.get('membersCursor') ?? undefined,
    limit: url.searchParams.get('membersLimit') ?? undefined,
  })
  if (!pageParsed.success) return validationErrorResponse(pageParsed.error)

  const principal = await getPrincipal(req)
  const result = await getWorkspaceById(
    workspaceRepository,
    workspaceMembershipRepository,
    userSpecialtyRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      membersCursor: pageParsed.data.cursor ?? null,
      membersLimit: pageParsed.data.limit,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = UpdateWorkspaceSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await updateWorkspace(
    workspaceRepository,
    workspaceMembershipRepository,
    auditLogRepository,
    principal,
    { workspaceId: paramParsed.data.id, data: bodyParsed.data },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await softDeleteWorkspace(
    workspaceRepository,
    workspaceMembershipRepository,
    auditLogRepository,
    principal,
    { workspaceId: paramParsed.data.id },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
