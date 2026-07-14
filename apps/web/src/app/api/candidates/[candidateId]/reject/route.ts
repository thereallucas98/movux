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
import {
  CandidateIdParamSchema,
  RejectCandidateSchema,
} from '~/server/schemas/candidate.schema'
import { rejectCandidate } from '~/server/use-cases'

type RouteContext = { params: Promise<{ candidateId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = CandidateIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => null)
  const bodyParsed = RejectCandidateSchema.safeParse(body)
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await rejectCandidate(
    workspaceMembershipRepository,
    shiftCandidateRepository,
    auditLogRepository,
    principal,
    {
      candidateId: paramParsed.data.candidateId,
      reason: bodyParsed.data.reason,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
