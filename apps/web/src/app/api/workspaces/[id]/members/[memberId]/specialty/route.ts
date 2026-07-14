import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  specialtyRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  MemberIdParamSchema,
  SetMemberSpecialtySchema,
} from '~/server/schemas/workspace-member-specialty.schema'
import {
  setWorkspaceMemberSpecialty,
  unsetWorkspaceMemberSpecialty,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; memberId: string }> }

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = MemberIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = SetMemberSpecialtySchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await setWorkspaceMemberSpecialty(
    workspaceMembershipRepository,
    userSpecialtyRepository,
    specialtyRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      memberId: paramParsed.data.memberId,
      specialtyId: bodyParsed.data.specialtyId,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = MemberIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await unsetWorkspaceMemberSpecialty(
    workspaceMembershipRepository,
    userSpecialtyRepository,
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
