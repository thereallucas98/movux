import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  specialtyRepository,
  userRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import {
  AddWorkspaceMemberSchema,
  WorkspaceIdParamSchema,
} from '~/server/schemas/workspace.schema'
import { addWorkspaceMember } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = AddWorkspaceMemberSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await addWorkspaceMember(
    workspaceRepository,
    workspaceMembershipRepository,
    userRepository,
    auditLogRepository,
    specialtyRepository,
    userSpecialtyRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      email: bodyParsed.data.email,
      role: bodyParsed.data.role,
      specialtyId: bodyParsed.data.specialtyId,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 201 })
}
