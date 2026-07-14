'use client'

import { MoreVertical } from 'lucide-react'

import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { IconButton } from '~/components/ui/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { cn } from '~/lib/utils'

import { ChangeRolePopover } from './change-role-popover'
import { RemoveMemberDialog } from './remove-member-dialog'
import { RoleTag } from './role-tag'
import { SetSpecialtyTrigger } from './set-specialty-trigger'
import type {
  MembershipSpecialty,
  WorkspaceRole,
} from './_hooks/use-workspace-with-members'

interface Member {
  id: string
  role: WorkspaceRole
  user: { id: string; email: string; fullName: string }
  specialty: MembershipSpecialty | null
}

interface Props {
  workspaceId: string
  member: Member
  isSelf: boolean
  isAdmin: boolean
  variant: 'card' | 'row'
}

function initialsFor(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MemberRow({
  workspaceId,
  member,
  isSelf,
  isAdmin,
  variant,
}: Props) {
  const showActions = isAdmin && !isSelf

  const actions = showActions ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Ações para ${member.user.fullName}`}
        >
          <MoreVertical />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <ChangeRolePopover
          workspaceId={workspaceId}
          memberId={member.id}
          currentRole={member.role}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Alterar papel
            </DropdownMenuItem>
          }
        />
        <RemoveMemberDialog
          workspaceId={workspaceId}
          memberId={member.id}
          fullName={member.user.fullName}
          trigger={
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              className="text-destructive"
            >
              Remover
            </DropdownMenuItem>
          }
        />
      </DropdownMenuContent>
    </DropdownMenu>
  ) : isAdmin && isSelf ? (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <IconButton
              variant="outline"
              size="sm"
              aria-label="Ações indisponíveis"
              disabled
            >
              <MoreVertical />
            </IconButton>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Você não pode alterar seu próprio papel.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null

  if (variant === 'card') {
    return (
      <li className="border-border bg-background flex items-center gap-3 rounded-[12px] border p-4">
        <Avatar size="md">
          <AvatarFallback>{initialsFor(member.user.fullName)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-[14px] font-semibold">
            {member.user.fullName}
            {isSelf && (
              <span className="text-muted-foreground ml-2 text-[12px] font-normal">
                (você)
              </span>
            )}
          </span>
          <span className="text-muted-foreground truncate text-[13px]">
            {member.user.email}
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RoleTag role={member.role} />
            <SetSpecialtyTrigger
              workspaceId={workspaceId}
              member={member}
              isSelf={isSelf}
              isAdmin={isAdmin}
            />
          </div>
        </div>
        {actions}
      </li>
    )
  }

  return (
    <tr className={cn('border-border border-b last:border-b-0')}>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(member.user.fullName)}</AvatarFallback>
          </Avatar>
          <span className="text-foreground text-[14px] font-medium">
            {member.user.fullName}
            {isSelf && (
              <span className="text-muted-foreground ml-2 text-[12px] font-normal">
                (você)
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-4 text-[14px]">
        {member.user.email}
      </td>
      <td className="px-4 py-4">
        <RoleTag role={member.role} />
      </td>
      <td className="px-4 py-4">
        <SetSpecialtyTrigger
          workspaceId={workspaceId}
          member={member}
          isSelf={isSelf}
          isAdmin={isAdmin}
        />
      </td>
      <td className="px-4 py-4 text-right">{actions}</td>
    </tr>
  )
}
