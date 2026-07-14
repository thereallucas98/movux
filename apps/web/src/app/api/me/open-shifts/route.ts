import { NextResponse } from 'next/server'

import { getPrincipal } from '~/lib/get-principal'
import { errorResponse } from '~/server/http/error-response'
import {
  shiftRepository,
  workspaceMembershipRepository,
} from '~/server/repositories'
import { listOpenShiftsForMe } from '~/server/use-cases'

export async function GET(req: Request) {
  const principal = await getPrincipal(req)
  const result = await listOpenShiftsForMe(
    workspaceMembershipRepository,
    shiftRepository,
    principal,
  )
  if (!result.success) return errorResponse(result.code)
  return NextResponse.json(result.data, { status: 200 })
}
