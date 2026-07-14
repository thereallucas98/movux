import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  userRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ChangeWorkspaceMemberRoleSchema,
  WorkspaceMemberIdParamSchema,
} from '~/server/schemas/workspace.schema'
import {
  changeWorkspaceMemberRole,
  getWorkspaceMemberDetail,
  removeWorkspaceMember,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; memberId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceMemberIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getWorkspaceMemberDetail(
    workspaceMembershipRepository,
    userSpecialtyRepository,
    userRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      memberId: paramParsed.data.memberId,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceMemberIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = ChangeWorkspaceMemberRoleSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await changeWorkspaceMemberRole(
    workspaceMembershipRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      memberId: paramParsed.data.memberId,
      role: bodyParsed.data.role,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceMemberIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await removeWorkspaceMember(
    workspaceMembershipRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      memberId: paramParsed.data.memberId,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
