import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import {
  errorResponse,
  validationErrorResponse,
} from '~/server/http/error-response'
import {
  scheduleRepository,
  shiftCandidateRepository,
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import {
  ListCandidatesQuerySchema,
  ShiftIdParamSchema,
} from '~/server/schemas/candidate.schema'
import { listCandidatesForShift } from '~/server/use-cases'

type RouteContext = { params: Promise<{ shiftId: string }> }

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params
  const paramParsed = ShiftIdParamSchema.safeParse(params)
  if (!paramParsed.success) return validationErrorResponse(paramParsed.error)

  const url = new URL(req.url)
  const queryParsed = ListCandidatesQuerySchema.safeParse({
    status: url.searchParams.get('status') ?? undefined,
  })
  if (!queryParsed.success) return validationErrorResponse(queryParsed.error)

  const principal = await getPrincipal(req)
  const result = await listCandidatesForShift(
    workspaceMembershipRepository,
    scheduleRepository,
    shiftRepository,
    shiftCandidateRepository,
    principal,
    {
      shiftId: paramParsed.data.shiftId,
      filter: { status: queryParsed.data.status },
    },
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
