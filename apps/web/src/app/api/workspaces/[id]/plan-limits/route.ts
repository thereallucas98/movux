import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  tenantRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import { WorkspaceIdParamSchema } from '~/server/schemas/workspace.schema'
import { getWorkspacePlanLimits } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = WorkspaceIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await getWorkspacePlanLimits(
    workspaceRepository,
    workspaceMembershipRepository,
    tenantRepository,
    principal,
    { workspaceId: paramParsed.data.id },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
