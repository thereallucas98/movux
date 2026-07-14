'use client'

import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/ui/button'
import { Tag } from '~/components/ui/tag'

import { WorkspaceInfoForm } from './workspace-info-form'
import type { WorkspaceVertical } from './_hooks/use-workspace-with-members'

const VERTICAL_LABELS: Record<WorkspaceVertical, string> = {
  HOSPITAL: 'Hospital',
  CLINIC: 'Clínica',
  GYM: 'Academia',
  OTHER: 'Outro',
}

interface Props {
  workspace: {
    id: string
    name: string
    timezone: string
    vertical: WorkspaceVertical
  }
  canEdit: boolean
}

export function WorkspaceInfoCard({ workspace, canEdit }: Props) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <section
        aria-labelledby="workspace-info-heading"
        className="border-border bg-background rounded-[12px] border p-6"
      >
        <h2
          id="workspace-info-heading"
          className="text-foreground mb-6 text-[18px] font-semibold"
        >
          Editar workspace
        </h2>
        <WorkspaceInfoForm
          workspaceId={workspace.id}
          initial={{
            name: workspace.name,
            timezone: workspace.timezone,
            vertical: workspace.vertical,
          }}
          onCancel={() => setEditing(false)}
          onSuccess={() => setEditing(false)}
        />
      </section>
    )
  }

  return (
    <section
      aria-labelledby="workspace-info-heading"
      className="border-border bg-background rounded-[12px] border p-6"
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <h2
          id="workspace-info-heading"
          className="text-foreground text-[18px] font-semibold"
        >
          Informações do workspace
        </h2>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" /> Editar
          </Button>
        )}
      </header>

      <dl className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-[12px] font-medium tracking-[0.6px] uppercase">
            Nome
          </dt>
          <dd className="text-foreground text-[16px] font-medium">
            {workspace.name}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-[12px] font-medium tracking-[0.6px] uppercase">
            Vertical
          </dt>
          <dd>
            <Tag category="green">{VERTICAL_LABELS[workspace.vertical]}</Tag>
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-[12px] font-medium tracking-[0.6px] uppercase">
            Fuso horário
          </dt>
          <dd className="text-foreground text-[16px]">{workspace.timezone}</dd>
        </div>
      </dl>
    </section>
  )
}
