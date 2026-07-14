'use client'

import { MoreVertical } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useWorkspaceWithMembers } from '~/components/features/settings/_hooks/use-workspace-with-members'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { IconButton } from '~/components/ui/icon-button'
import { Skeleton } from '~/components/ui/skeleton'

import { AssignmentStatusTag } from './assignment-status-tag'
import { CompositionMatchTag } from './composition-match-tag'
import { DeadlineTag } from './deadline-tag'
import { ForceAcceptConfirmDialog } from './force-accept-confirm-dialog'
import { RejectOverrideForm } from './reject-override-form'
import { UnassignConfirmDialog } from './unassign-confirm-dialog'
import {
  useShiftAssignments,
  type AssignmentRow,
} from './_hooks/use-shift-assignments'

interface Props {
  workspaceId: string
  scheduleId: string
  shift: { id: string; headcount: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ActionState =
  | { type: 'unassign'; assignment: AssignmentRow }
  | { type: 'force'; assignment: AssignmentRow }
  | { type: 'reject'; assignment: AssignmentRow }
  | null

export function AssignmentsListDialog({
  workspaceId,
  scheduleId,
  shift,
  open,
  onOpenChange,
}: Props) {
  const assignmentsQuery = useShiftAssignments(
    workspaceId,
    scheduleId,
    shift.id,
    { enabled: open },
  )
  const membersQuery = useWorkspaceWithMembers(workspaceId)

  const [action, setAction] = useState<ActionState>(null)

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of membersQuery.data?.memberships ?? []) {
      map.set(m.user.id, m.user.fullName)
    }
    return map
  }, [membersQuery.data])

  const assignments = assignmentsQuery.data ?? []
  const isLoading = assignmentsQuery.isLoading

  function actionsFor(a: AssignmentRow): {
    canUnassign: boolean
    canForce: boolean
    canReject: boolean
  } {
    const canUnassign = a.status === 'PENDING_ACCEPT' || a.status === 'EXPIRED'
    const canForce = a.status === 'PENDING_ACCEPT'
    const canReject = a.status === 'PENDING_ACCEPT'
    return { canUnassign, canForce, canReject }
  }

  return (
    <>
      <AdaptiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Atribuídos a este turno"
        description={`Headcount: ${shift.headcount}`}
        breakpoint="mobileOrTablet"
        contentClassName="md:max-w-[34rem] lg:max-w-[44rem]"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-[10px]" />
            <Skeleton className="h-14 w-full rounded-[10px]" />
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[10px] border border-dashed py-8 text-center text-[14px]">
            Ninguém atribuído ainda.
          </p>
        ) : (
          <ul className="border-border max-h-[24rem] overflow-y-auto rounded-[10px] border">
            {assignments.map((a) => {
              const name = userNameById.get(a.userId) ?? a.userId.slice(0, 8)
              const acts = actionsFor(a)
              const showKebab =
                acts.canUnassign || acts.canForce || acts.canReject
              return (
                <li
                  key={a.id}
                  className="border-border flex items-center gap-3 border-b px-3 py-3 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-foreground truncate text-[14px] font-medium">
                      {name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <AssignmentStatusTag status={a.status} />
                      <CompositionMatchTag status={a.compositionStatus} />
                      {a.status === 'PENDING_ACCEPT' && (
                        <DeadlineTag deadline={a.decisionDeadline} />
                      )}
                    </div>
                  </div>
                  {showKebab && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton
                          variant="outline"
                          size="sm"
                          aria-label={`Ações para ${name}`}
                        >
                          <MoreVertical />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {acts.canForce && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setAction({ type: 'force', assignment: a })
                            }}
                          >
                            Forçar aceite
                          </DropdownMenuItem>
                        )}
                        {acts.canReject && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setAction({ type: 'reject', assignment: a })
                            }}
                          >
                            Rejeitar
                          </DropdownMenuItem>
                        )}
                        {acts.canUnassign && (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              setAction({ type: 'unassign', assignment: a })
                            }}
                            className="text-destructive"
                          >
                            Cancelar atribuição
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </AdaptiveDialog>

      {action?.type === 'unassign' && (
        <UnassignConfirmDialog
          workspaceId={workspaceId}
          scheduleId={scheduleId}
          shiftId={shift.id}
          assignmentId={action.assignment.id}
          userName={userNameById.get(action.assignment.userId) ?? '—'}
          open={true}
          onOpenChange={(o) => !o && setAction(null)}
        />
      )}
      {action?.type === 'force' && (
        <ForceAcceptConfirmDialog
          scheduleId={scheduleId}
          shiftId={shift.id}
          assignmentId={action.assignment.id}
          userName={userNameById.get(action.assignment.userId) ?? '—'}
          open={true}
          onOpenChange={(o) => !o && setAction(null)}
        />
      )}
      {action?.type === 'reject' && (
        <RejectOverrideForm
          scheduleId={scheduleId}
          shiftId={shift.id}
          assignmentId={action.assignment.id}
          userName={userNameById.get(action.assignment.userId) ?? '—'}
          open={true}
          onOpenChange={(o) => !o && setAction(null)}
        />
      )}
    </>
  )
}
