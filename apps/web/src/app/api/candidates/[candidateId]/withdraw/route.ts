import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  auditLogRepository,
  shiftCandidateRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { CandidateIdParamSchema } from '~/server/schemas/candidate.schema'
import { withdrawFromShift } from '~/server/use-cases'

type RouteContext = { params: Promise<{ candidateId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = CandidateIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const principal = await getPrincipal(req)
  const result = await withdrawFromShift(
    workspaceMembershipRepository,
    shiftCandidateRepository,
    auditLogRepository,
    principal,
    { candidateId: paramParsed.data.candidateId },
  )
  if (!result.success) return errorResponse(result.code)
  return new NextResponse(null, { status: 204 })
}
