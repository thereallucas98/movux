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
  ChangeTenantPlanSchema,
  TenantIdParamSchema,
} from '~/server/schemas/tenant.schema'
import { changeTenantPlan } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = TenantIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = ChangeTenantPlanSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await changeTenantPlan(
    tenantRepository,
    tenantMembershipRepository,
    auditLogRepository,
    principal,
    {
      tenantId: paramParsed.data.id,
      plan: bodyParsed.data.plan,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(
    {
      tenantId: result.data.tenant.id,
      plan: result.data.tenant.plan,
      previousPlan: result.data.previousPlan,
      gracePeriodUntil: result.data.gracePeriodUntil,
      violations: result.data.violations,
    },
    { status: 200 },
  )
}
