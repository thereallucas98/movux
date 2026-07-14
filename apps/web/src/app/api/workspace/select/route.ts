import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import { setWorkspaceCookie } from '~/server/http/cookie'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import { workspaceMembershipRepository } from '~/server/repositories'
import { SelectWorkspaceSchema } from '~/server/schemas/workspace-select.schema'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)
  if (!principal) return errorResponse('UNAUTHENTICATED')

  const body = await req.json().catch(() => null)
  const parsed = SelectWorkspaceSchema.safeParse(body)
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const membership = await workspaceMembershipRepository.findActive({
    workspaceId: parsed.data.workspaceId,
    userId: principal.userId,
  })
  if (!membership) return errorResponse('FORBIDDEN')

  const res = new NextResponse(null, { status: 204 })
  setWorkspaceCookie(res, parsed.data.workspaceId)
  return res
}
