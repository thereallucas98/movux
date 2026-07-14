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
  CreateTenantSchema,
  CursorPageSchema,
} from '~/server/schemas/tenant.schema'
import { createTenant, listTenantsForUser } from '~/server/use-cases'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)

  const body = await req.json().catch(() => null)
  const parsed = CreateTenantSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const result = await createTenant(
    tenantRepository,
    tenantMembershipRepository,
    auditLogRepository,
    principal,
    parsed.data,
  )

  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(
    { tenant: result.data.tenant, membership: result.data.membership },
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

  const result = await listTenantsForUser(tenantRepository, principal, {
    cursor: parsed.data.cursor ?? null,
    limit: parsed.data.limit,
  })
  if (!result.success) return errorResponse(result.code)

  return NextResponse.json(result.data, { status: 200 })
}
