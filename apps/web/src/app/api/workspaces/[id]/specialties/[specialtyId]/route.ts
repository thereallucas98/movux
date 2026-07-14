import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  shiftExpectedCompositionRepository,
  specialtyRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  SpecialtyIdParamSchema,
  UpdateWorkspaceSpecialtySchema,
} from '~/server/schemas/specialty.schema'
import {
  softDeleteWorkspaceSpecialty,
  updateWorkspaceSpecialty,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; specialtyId: string }> }

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = SpecialtyIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = UpdateWorkspaceSpecialtySchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await updateWorkspaceSpecialty(
    workspaceMembershipRepository,
    specialtyRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      specialtyId: paramParsed.data.specialtyId,
      data: bodyParsed.data,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = SpecialtyIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await softDeleteWorkspaceSpecialty(
    workspaceMembershipRepository,
    specialtyRepository,
    userSpecialtyRepository,
    shiftExpectedCompositionRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      specialtyId: paramParsed.data.specialtyId,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
