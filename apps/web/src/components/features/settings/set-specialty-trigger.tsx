'use client'

import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Tag } from '~/components/ui/tag'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { useMediaQuery } from '~/hooks/use-media-query'
import { categoryVisual } from '~/lib/format/category-visual'
import { cn } from '~/lib/utils'

import { SpecialtyPicker } from './specialty-picker'
import type { MembershipSpecialty } from './_hooks/use-workspace-with-members'

interface Props {
  workspaceId: string
  member: {
    id: string
    user: { fullName: string }
    specialty: MembershipSpecialty | null
  }
  isSelf: boolean
  isAdmin: boolean
}

function SpecialtyTagDisplay({
  specialty,
  interactive,
}: {
  specialty: MembershipSpecialty | null
  interactive: boolean
}) {
  if (specialty) {
    const visual = categoryVisual(specialty.id)
    return (
      <span
        className={cn('inline-flex items-center gap-1', interactive && 'group')}
      >
        <Tag category={visual.palette}>{specialty.name}</Tag>
        {interactive && (
          <Pencil
            className="text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        )}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'border-border text-muted-foreground rounded-badge inline-flex items-center gap-1 border border-dashed px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
      )}
    >
      <Plus className="size-3" aria-hidden /> Definir
    </span>
  )
}

export function SetSpecialtyTrigger({
  workspaceId,
  member,
  isSelf,
  isAdmin,
}: Props) {
  const [open, setOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // Non-admin: read-only display.
  if (!isAdmin) {
    return (
      <SpecialtyTagDisplay specialty={member.specialty} interactive={false} />
    )
  }

  // Self: disabled with tooltip.
  if (isSelf) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-not-allowed opacity-70">
              <SpecialtyTagDisplay
                specialty={member.specialty}
                interactive={false}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Você não pode alterar sua própria profissão.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const triggerButton = (
    <button
      type="button"
      aria-label={`Definir profissão de ${member.user.fullName}`}
      className="focus-visible:ring-ring rounded-badge inline-flex cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
    >
      <SpecialtyTagDisplay specialty={member.specialty} interactive />
    </button>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-lg pt-2 pb-[max(env(safe-area-inset-bottom),16px)]"
        >
          <SheetHeader className="pt-2 pb-2">
            <SheetTitle>Profissão</SheetTitle>
          </SheetHeader>
          <SpecialtyPicker
            workspaceId={workspaceId}
            member={member}
            onClose={() => setOpen(false)}
          />
        </SheetContent>
        <button
          type="button"
          aria-label={`Definir profissão de ${member.user.fullName}`}
          onClick={() => setOpen(true)}
          className="focus-visible:ring-ring rounded-badge inline-flex cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
        >
          <SpecialtyTagDisplay specialty={member.specialty} interactive />
        </button>
      </Sheet>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <SpecialtyPicker
          workspaceId={workspaceId}
          member={member}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}
