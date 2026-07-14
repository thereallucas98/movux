import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  tenantMembershipRepository,
  tenantRepository,
} from '~/server/repositories'
import {
  CursorPageSchema,
  TenantIdParamSchema,
  UpdateTenantSchema,
} from '~/server/schemas/tenant.schema'
import {
  getTenantById,
  softDeleteTenant,
  updateTenant,
} from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const pageParsed = CursorPageSchema.safeParse({
    cursor: url.searchParams.get('membersCursor') ?? undefined,
    limit: url.searchParams.get('membersLimit') ?? undefined,
  })
  if (!pageParsed.success) return validationErrorResponse(pageParsed.error)

  const principal = await getPrincipal(req)
  const result = await getTenantById(
    tenantRepository,
    tenantMembershipRepository,
    principal,
    {
      tenantId: paramParsed.data.id,
      membersCursor: pageParsed.data.cursor ?? null,
      membersLimit: pageParsed.data.limit,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = UpdateTenantSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await updateTenant(
    tenantRepository,
    tenantMembershipRepository,
    auditLogRepository,
    principal,
    { tenantId: paramParsed.data.id, data: bodyParsed.data },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await softDeleteTenant(
    tenantRepository,
    tenantMembershipRepository,
    auditLogRepository,
    principal,
    { tenantId: paramParsed.data.id },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
