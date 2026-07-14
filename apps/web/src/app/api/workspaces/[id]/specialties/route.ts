import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  specialtyRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import {
  CreateWorkspaceSpecialtySchema,
  WorkspaceIdParamSchema,
} from '~/server/schemas/specialty.schema'
import {
  createWorkspaceSpecialty,
  listSpecialtiesForWorkspace,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = CreateWorkspaceSpecialtySchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await createWorkspaceSpecialty(
    workspaceRepository,
    workspaceMembershipRepository,
    specialtyRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      slug: bodyParsed.data.slug,
      name: bodyParsed.data.name,
      description: bodyParsed.data.description,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 201 })
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await listSpecialtiesForWorkspace(
    workspaceRepository,
    workspaceMembershipRepository,
    specialtyRepository,
    principal,
    { workspaceId: paramParsed.data.id },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 200 })
}
