import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  assignmentRepository,
  auditLogRepository,
  shiftCandidateRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ApproveCandidateSchema,
  CandidateIdParamSchema,
} from '~/server/schemas/candidate.schema'
import { approveCandidate } from '~/server/use-cases'

type RouteContext = { params: Promise<{ candidateId: string }> }

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = CandidateIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const body = await req.json().catch(() => ({}))
  const bodyParsed = ApproveCandidateSchema.safeParse(body ?? {})
  if (!bodyParsed.success) return validationErrorResponse(bodyParsed.error)

  const principal = await getPrincipal(req)
  const result = await approveCandidate(
    workspaceMembershipRepository,
    shiftRepository,
    assignmentRepository,
    shiftCandidateRepository,
    auditLogRepository,
    principal,
    {
      candidateId: paramParsed.data.candidateId,
      autoAccept: bodyParsed.data.autoAccept,
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
