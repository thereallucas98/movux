import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  categoryRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  CategoryIdParamSchema,
  UpdateWorkspaceCategorySchema,
} from '~/server/schemas/category.schema'
import {
  softDeleteWorkspaceCategory,
  updateWorkspaceCategory,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; categoryId: string }> }

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = CategoryIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = UpdateWorkspaceCategorySchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await updateWorkspaceCategory(
    workspaceMembershipRepository,
    categoryRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      categoryId: paramParsed.data.categoryId,
      data: bodyParsed.data,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = CategoryIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await softDeleteWorkspaceCategory(
    workspaceMembershipRepository,
    categoryRepository,
    auditLogRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      categoryId: paramParsed.data.categoryId,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
