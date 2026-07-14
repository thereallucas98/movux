import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getServerPrincipal } from '~/lib/get-server-principal'
import {
  scheduleRepository,
  shiftRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import { WORKSPACE_COOKIE } from '~/server/http/cookie'

export type WorkspaceRole = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

export interface ShiftDetailContext {
  principal: { userId: string; role: string }
  workspaceId: string
  workspaceTimezone: string
  myMembershipRole: WorkspaceRole
  schedule: {
    id: string
    workspaceId: string
    categoryId: string
    name: string | null
    periodStart: Date
    periodEnd: Date
    status: string
  }
  shift: {
    id: string
    scheduleId: string
    categoryId: string
    startAt: Date
    endAt: Date
    headcount: number
    status: string
    assignmentMode: string
  }
}

interface Args {
  scheduleId: string
  shiftId: string
}

export async function resolveShiftDetailContext(
  args: Args,
  searchParams: Promise<{ ws?: string }> | undefined,
): Promise<ShiftDetailContext> {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const wsPage = await workspaceRepository.listForUser(
    principal.userId,
    null,
    100,
  )
  if (wsPage.data.length === 0) redirect('/onboarding')

  const cookieStore = await cookies()
  const cookieWs = cookieStore.get(WORKSPACE_COOKIE)?.value ?? null
  const sp = (await searchParams) ?? {}
  const requestedId = sp.ws ?? cookieWs
  const current =
    wsPage.data.find((w) => w.id === requestedId) ?? wsPage.data[0]

  const membership = await workspaceMembershipRepository.findActive({
    workspaceId: current.id,
    userId: principal.userId,
  })
  if (!membership) redirect('/dashboard')

  const schedule = await scheduleRepository.findById(args.scheduleId)
  if (!schedule || schedule.workspaceId !== current.id) {
    redirect('/schedules')
  }

  const shift = await shiftRepository.findById(args.shiftId)
  if (!shift || shift.scheduleId !== args.scheduleId) {
    redirect(`/schedules/${args.scheduleId}`)
  }

  return {
    principal: { userId: principal.userId, role: principal.role },
    workspaceId: current.id,
    workspaceTimezone: current.timezone,
    myMembershipRole: membership.role as WorkspaceRole,
    schedule: {
      id: schedule.id,
      workspaceId: schedule.workspaceId,
      categoryId: schedule.categoryId,
      name: schedule.name,
      periodStart: schedule.periodStart,
      periodEnd: schedule.periodEnd,
      status: schedule.status,
    },
    shift: {
      id: shift.id,
      scheduleId: shift.scheduleId,
      categoryId: shift.categoryId,
      startAt: shift.startAt,
      endAt: shift.endAt,
      headcount: shift.headcount,
      status: shift.status,
      assignmentMode: shift.assignmentMode,
    },
  }
}
