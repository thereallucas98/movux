import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponseFromResult,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  categoryRepository,
  tenantMembershipRepository,
} from '~/server/repositories'
import { CreateWorkspaceCategorySchema } from '~/server/schemas/category.schema'
import { TenantIdParamSchema } from '~/server/schemas/tenant.schema'
import { createTenantCategory } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = CreateWorkspaceCategorySchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await createTenantCategory(
    tenantMembershipRepository,
    categoryRepository,
    auditLogRepository,
    principal,
    {
      tenantId: paramParsed.data.id,
      slug: bodyParsed.data.slug,
      name: bodyParsed.data.name,
      description: bodyParsed.data.description ?? null,
    },
  )
  if (!result.success) return errorResponseFromResult(result)
  return NextResponse.json(result.data, { status: 201 })
}
