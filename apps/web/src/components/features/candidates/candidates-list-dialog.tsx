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

import { ApproveCandidateDialog } from './approve-candidate-dialog'
import { CandidateStatusTag } from './candidate-status-tag'
import { RejectCandidateForm } from './reject-candidate-form'
import {
  useShiftCandidates,
  type ShiftCandidateRow,
} from './_hooks/use-shift-candidates'

interface Props {
  workspaceId: string
  scheduleId: string
  shift: { id: string; headcount: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ActionState =
  | { type: 'approve'; candidate: ShiftCandidateRow }
  | { type: 'reject'; candidate: ShiftCandidateRow }
  | null

export function CandidatesListDialog({
  workspaceId,
  scheduleId,
  shift,
  open,
  onOpenChange,
}: Props) {
  const candidatesQuery = useShiftCandidates(shift.id, { enabled: open })
  const membersQuery = useWorkspaceWithMembers(workspaceId)

  const [action, setAction] = useState<ActionState>(null)

  const userNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of membersQuery.data?.memberships ?? []) {
      map.set(m.user.id, m.user.fullName)
    }
    return map
  }, [membersQuery.data])

  const items = candidatesQuery.data ?? []
  const isLoading = candidatesQuery.isLoading

  return (
    <>
      <AdaptiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Candidatos na fila"
        description={`Headcount: ${shift.headcount}`}
        breakpoint="mobileOrTablet"
        contentClassName="md:max-w-[36rem] lg:max-w-[44rem]"
      >
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-[10px]" />
            <Skeleton className="h-14 w-full rounded-[10px]" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[10px] border border-dashed py-8 text-center text-[14px]">
            Ninguém na fila ainda.
          </p>
        ) : (
          <ul className="border-border max-h-[24rem] overflow-y-auto rounded-[10px] border">
            {items.map((c) => {
              const name = userNameById.get(c.userId) ?? c.userId.slice(0, 8)
              const showKebab = c.status === 'QUEUED'
              return (
                <li
                  key={c.id}
                  className="border-border flex items-center gap-3 border-b px-3 py-3 last:border-b-0"
                >
                  <span className="text-muted-foreground w-8 shrink-0 text-[13px] font-semibold">
                    #{c.queuePosition}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-foreground truncate text-[14px] font-medium">
                      {name}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <CandidateStatusTag status={c.status} />
                    </div>
                    {c.decisionReason && (
                      <span className="text-muted-foreground mt-1 truncate text-[12px]">
                        Motivo: {c.decisionReason}
                      </span>
                    )}
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
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            setAction({ type: 'approve', candidate: c })
                          }}
                        >
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault()
                            setAction({ type: 'reject', candidate: c })
                          }}
                          className="text-destructive"
                        >
                          Rejeitar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </AdaptiveDialog>

      {action?.type === 'approve' && (
        <ApproveCandidateDialog
          scheduleId={scheduleId}
          shiftId={shift.id}
          candidateId={action.candidate.id}
          userName={userNameById.get(action.candidate.userId) ?? '—'}
          open={true}
          onOpenChange={(o) => !o && setAction(null)}
        />
      )}
      {action?.type === 'reject' && (
        <RejectCandidateForm
          scheduleId={scheduleId}
          shiftId={shift.id}
          candidateId={action.candidate.id}
          userName={userNameById.get(action.candidate.userId) ?? '—'}
          open={true}
          onOpenChange={(o) => !o && setAction(null)}
        />
      )}
    </>
  )
}
