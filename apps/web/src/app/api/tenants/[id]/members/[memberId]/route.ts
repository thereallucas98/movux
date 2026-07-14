import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  tenantMembershipRepository,
} from '~/server/repositories'
import { MemberIdParamSchema } from '~/server/schemas/tenant.schema'
import { removeTenantMember } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; memberId: string }> }

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = MemberIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await removeTenantMember(
    tenantMembershipRepository,
    auditLogRepository,
    principal,
    {
      tenantId: paramParsed.data.id,
      memberId: paramParsed.data.memberId,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
