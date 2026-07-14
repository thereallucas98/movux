'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import { cn } from '~/lib/utils'

interface Workspace {
  id: string
  name: string
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace
  /** When `list`, renders an unwrapped list (used inside the mobile "Mais" sheet). */
  variant?: 'trigger' | 'list'
  onSelected?: () => void
  /** Hides the workspace name label + chevron and centers the initial pill —
   * used by the desktop sidebar in its collapsed (icon-rail) state. */
  collapsed?: boolean
}

async function selectWorkspace(workspaceId: string) {
  const res = await fetch('/api/workspace/select', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspaceId }),
  })
  if (!res.ok) {
    throw new Error('Falha ao trocar de workspace')
  }
}

function initialFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'W'
}

export function WorkspaceSwitcher({
  workspaces,
  currentWorkspace,
  variant = 'trigger',
  onSelected,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: selectWorkspace,
    onSuccess: (_data, workspaceId) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('ws', workspaceId)
      router.push(`${pathname}?${params.toString()}`)
      router.refresh()
      queryClient.invalidateQueries()
      setOpen(false)
      onSelected?.()
    },
    onError: (error) => {
      handlePlanLimitError(error, {
        onSimpleOrBoolean: (msg) => toast.error(msg),
        onOtherError: (e) => toast.error(e.message),
      })
    },
  })

  if (workspaces.length === 0) return null

  const isSingle = workspaces.length === 1

  if (variant === 'list') {
    return (
      <ul
        className="flex flex-col gap-1"
        role="listbox"
        aria-label="Workspaces"
      >
        {workspaces.map((ws) => {
          const isCurrent = ws.id === currentWorkspace.id
          return (
            <li key={ws.id}>
              <button
                type="button"
                role="option"
                aria-selected={isCurrent}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(ws.id)}
                className={cn(
                  'hover:bg-accent flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-3 text-left text-sm font-medium transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="truncate">{ws.name}</span>
                {isCurrent ? (
                  <Check className="text-primary size-4 shrink-0" />
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  // Show the full name + chevron only on lg+ AND when not collapsed by the
  // user toggle. Below lg the sidebar is auto-rail (md), so the same compact
  // treatment applies.
  const showLabel = !collapsed
  const labelClass = cn(
    'truncate text-sm font-semibold',
    showLabel ? 'hidden lg:block' : 'hidden',
  )
  const chevronClass = cn(
    'text-muted-foreground size-4 shrink-0',
    showLabel ? 'hidden lg:block' : 'hidden',
  )

  if (isSingle) {
    return (
      <div
        className={cn(
          'border-input bg-background flex items-center rounded-sm border py-2',
          showLabel ? 'gap-2 px-3' : 'justify-center px-2',
        )}
        data-slot="workspace-switcher-static"
        title={collapsed ? currentWorkspace.name : undefined}
      >
        <span className="bg-accent text-foreground flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold">
          {initialFor(currentWorkspace.name)}
        </span>
        <span className={labelClass}>{currentWorkspace.name}</span>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={`Trocar workspace (atual: ${currentWorkspace.name})`}
        title={collapsed ? currentWorkspace.name : undefined}
        className={cn(
          'border-input bg-background hover:bg-accent flex w-full cursor-pointer items-center rounded-sm border py-2 text-left transition-colors',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          showLabel ? 'justify-between gap-2 px-3' : 'justify-center px-2',
        )}
      >
        <span
          className={cn(
            'flex items-center',
            showLabel ? 'min-w-0 gap-2' : 'justify-center',
          )}
        >
          <span className="bg-accent text-foreground flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold">
            {initialFor(currentWorkspace.name)}
          </span>
          <span className={labelClass}>{currentWorkspace.name}</span>
        </span>
        <ChevronDown className={chevronClass} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <ul className="flex flex-col gap-1" role="listbox">
          {workspaces.map((ws) => {
            const isCurrent = ws.id === currentWorkspace.id
            return (
              <li key={ws.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(ws.id)}
                  className={cn(
                    'hover:bg-accent flex w-full cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-left text-sm font-medium transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  )}
                >
                  <span className="truncate">{ws.name}</span>
                  {isCurrent ? (
                    <Check className="text-primary size-4 shrink-0" />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
