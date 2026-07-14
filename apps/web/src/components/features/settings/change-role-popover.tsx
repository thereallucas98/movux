'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useChangeMemberRole } from './_hooks/use-change-member-role'
import type { WorkspaceRole } from './_hooks/use-workspace-with-members'

const OPTIONS: Array<{ value: WorkspaceRole; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'COORDENADOR', label: 'Coordenador' },
  { value: 'COLABORADOR', label: 'Colaborador' },
]

interface Props {
  workspaceId: string
  memberId: string
  currentRole: WorkspaceRole
  trigger: React.ReactNode
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'LAST_ADMIN':
      return 'Não é possível alterar o último ADMIN.'
    case 'CANNOT_DEMOTE_SELF':
      return 'Você não pode alterar seu próprio papel.'
    default:
      return 'Falha ao atualizar papel.'
  }
}

export function ChangeRolePopover({
  workspaceId,
  memberId,
  currentRole,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const mutation = useChangeMemberRole(workspaceId)

  async function handleSelect(role: WorkspaceRole) {
    if (role === currentRole) return
    try {
      await mutation.mutateAsync({ memberId, role })
      setOpen(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      toast.error(errorCopy(code))
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        <ul role="listbox" className="flex flex-col gap-1">
          {OPTIONS.map(({ value, label }) => {
            const isCurrent = value === currentRole
            return (
              <li key={value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  disabled={isCurrent || mutation.isPending}
                  onClick={() => handleSelect(value)}
                  className={cn(
                    'hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-[14px] font-medium transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    'disabled:opacity-60',
                  )}
                >
                  {label}
                  {isCurrent && (
                    <span className="text-muted-foreground text-[11px]">
                      atual
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
