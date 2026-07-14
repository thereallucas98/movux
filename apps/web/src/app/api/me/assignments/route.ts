import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import { errorResponse } from '~/server/http/error-response'
import { assignmentRepository } from '~/server/repositories'
import type { AssignmentStatus } from '~/server/repositories/assignment.repository'
import { listMyAssignments } from '~/server/use-cases'

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

const DEFAULT_STATUSES: AssignmentStatus[] = [
  'PENDING_ACCEPT',
  'ACCEPTED',
  'PENDING_CLOSURE',
]

function parseStatuses(raw: string | null): AssignmentStatus[] {
  if (!raw) return DEFAULT_STATUSES
  const parts = raw.split(',').map((s) => s.trim().toUpperCase())
  const valid = parts.filter((p): p is AssignmentStatus =>
    (ALL_STATUSES as string[]).includes(p),
  )
  return valid.length > 0 ? Array.from(new Set(valid)) : DEFAULT_STATUSES
}

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined
  const d = new Date(raw)
  return isNaN(d.getTime()) ? undefined : d
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const statuses = parseStatuses(url.searchParams.get('status'))
  const from = parseDate(url.searchParams.get('from'))
  const to = parseDate(url.searchParams.get('to'))

  const principal = await getPrincipal(req)
  const result = await listMyAssignments(assignmentRepository, principal, {
    statuses,
    from,
    to,
  })
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
