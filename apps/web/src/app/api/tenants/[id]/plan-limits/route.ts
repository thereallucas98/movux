import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  tenantMembershipRepository,
  tenantRepository,
} from '~/server/repositories'
import { TenantIdParamSchema } from '~/server/schemas/tenant.schema'
import { getTenantPlanLimits } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getTenantPlanLimits(
    tenantRepository,
    tenantMembershipRepository,
    principal,
    { tenantId: paramParsed.data.id },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
