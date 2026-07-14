import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import type { AssignmentStatus } from '~/server/repositories/assignment.repository'
import { listAssignmentsForUserInWorkspace } from '~/server/use-cases'

type RouteContext = { params: Promise<{ id: string; memberId: string }> }

const ParamSchema = z.object({
  id: z.uuid(),
  memberId: z.uuid(),
})

const ALL_STATUSES: AssignmentStatus[] = [
  'PENDING_ACCEPT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
  'TRANSFERRED',
  'PENDING_CLOSURE',
  'COMPLETED',
]

const DEFAULT_STATUSES: AssignmentStatus[] = ['ACCEPTED']

function parseStatuses(raw: string | null): AssignmentStatus[] {
  if (!raw) return DEFAULT_STATUSES
  const parts = raw.split(',').map((s) => s.trim().toUpperCase())
  const valid = parts.filter((p): p is AssignmentStatus =>
    (ALL_STATUSES as string[]).includes(p),
  )
  return valid.length > 0 ? Array.from(new Set(valid)) : DEFAULT_STATUSES
}

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const statuses = parseStatuses(url.searchParams.get('status'))

  const principal = await getPrincipal(req)
  const result = await listAssignmentsForUserInWorkspace(
    workspaceMembershipRepository,
    assignmentRepository,
    principal,
    {
      workspaceId: paramParsed.data.id,
      userId: paramParsed.data.memberId,
      statuses,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
