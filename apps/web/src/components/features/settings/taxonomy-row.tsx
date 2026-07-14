'use client'

import { MoreVertical } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { IconButton } from '~/components/ui/icon-button'
import { Tag } from '~/components/ui/tag'
import { cn } from '~/lib/utils'

import type { TaxonomyAdapter, TaxonomyRow } from './_adapters/types'
import { DeleteTaxonomyDialog } from './delete-taxonomy-dialog'
import { TaxonomyForm } from './taxonomy-form'

const SOURCE_LABEL: Record<string, string> = {
  GLOBAL: 'Global',
  TENANT: 'Tenant',
  WORKSPACE: 'Workspace',
}

interface Props {
  workspaceId: string
  row: TaxonomyRow
  adapter: TaxonomyAdapter
  isAdmin: boolean
  variant: 'card' | 'row'
  isEditing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSavedEdit: () => void
}

export function TaxonomyRowView({
  workspaceId,
  row,
  adapter,
  isAdmin,
  variant,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSavedEdit,
}: Props) {
  const isWorkspace = row.source === 'WORKSPACE'
  const showActions = isAdmin && isWorkspace
  const visual = adapter.iconResolver(row.id)
  const Icon = visual.Icon

  if (isEditing) {
    return variant === 'card' ? (
      <li className="border-border bg-background rounded-[12px] border p-3">
        <TaxonomyForm
          workspaceId={workspaceId}
          adapter={adapter}
          mode="edit"
          initial={{ id: row.id, name: row.name, description: row.description }}
          onSuccess={onSavedEdit}
          onCancel={onCancelEdit}
        />
      </li>
    ) : (
      <tr>
        <td colSpan={4} className="px-4 py-3">
          <TaxonomyForm
            workspaceId={workspaceId}
            adapter={adapter}
            mode="edit"
            initial={{
              id: row.id,
              name: row.name,
              description: row.description,
            }}
            onSuccess={onSavedEdit}
            onCancel={onCancelEdit}
          />
        </td>
      </tr>
    )
  }

  const actions = showActions ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          variant="outline"
          size="sm"
          aria-label={`Ações para ${row.name}`}
        >
          <MoreVertical />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onStartEdit()
          }}
        >
          Editar
        </DropdownMenuItem>
        <DeleteTaxonomyDialog
          workspaceId={workspaceId}
          adapter={adapter}
          row={{ id: row.id, name: row.name }}
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
  ) : null

  const dimmed = !isWorkspace ? 'opacity-80' : ''

  if (variant === 'card') {
    return (
      <li
        className={cn(
          'border-border bg-background flex items-center gap-3 rounded-[12px] border p-4',
          dimmed,
        )}
      >
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-[8px]',
            visual.blockClass,
          )}
        >
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-[14px] font-semibold">
            {row.name}
          </span>
          {row.description && (
            <span className="text-muted-foreground truncate text-[13px]">
              {row.description}
            </span>
          )}
          {!isWorkspace && (
            <div className="mt-2">
              <Tag category="gray">{SOURCE_LABEL[row.source]}</Tag>
            </div>
          )}
        </div>
        {actions}
      </li>
    )
  }

  return (
    <tr className={cn('border-border border-b last:border-b-0', dimmed)}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-[8px]',
              visual.blockClass,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
          <span className="text-foreground text-[14px] font-medium">
            {row.name}
          </span>
        </div>
      </td>
      <td className="text-muted-foreground px-4 py-3 text-[14px]">
        {row.description ?? '—'}
      </td>
      <td className="px-4 py-3">
        {!isWorkspace && <Tag category="gray">{SOURCE_LABEL[row.source]}</Tag>}
      </td>
      <td className="px-4 py-3 text-right">{actions}</td>
    </tr>
  )
}
