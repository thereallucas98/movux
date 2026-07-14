'use client'

import { ChevronDown, ChevronRight, Plus, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

import { adapterFor } from './_adapters'
import type { TaxonomyResource } from './_adapters/types'
import { useTaxonomies } from './_hooks/use-taxonomies'
import { TaxonomyForm } from './taxonomy-form'
import { TaxonomyRowView } from './taxonomy-row'

interface Props {
  workspaceId: string
  isAdmin: boolean
  resource: TaxonomyResource
}

export function TaxonomyList({ workspaceId, isAdmin, resource }: Props) {
  const adapter = adapterFor(resource)
  const query = useTaxonomies(resource, workspaceId)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inheritedOpen, setInheritedOpen] = useState(true)

  const { workspaceRows, inheritedRows } = useMemo(() => {
    const all = query.data ?? []
    return {
      workspaceRows: all.filter((r) => r.source === 'WORKSPACE'),
      inheritedRows: all.filter((r) => r.source !== 'WORKSPACE'),
    }
  }, [query.data])

  return (
    <section
      aria-labelledby="taxonomy-heading"
      className="border-border bg-background rounded-[12px] border p-6"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2
            id="taxonomy-heading"
            className="text-foreground text-[18px] font-semibold"
          >
            {adapter.copy.pageTitle}
          </h2>
          <p className="text-muted-foreground mt-1 text-[14px]">
            {adapter.copy.pageDescription}
          </p>
        </div>
        {isAdmin && !creating && workspaceRows.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreating(true)}
          >
            <UserPlus className="size-4" /> {adapter.copy.addCta}
          </Button>
        )}
      </header>

      {creating && (
        <div className="mb-6">
          <TaxonomyForm
            workspaceId={workspaceId}
            adapter={adapter}
            mode="create"
            onSuccess={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
          ))}
        </div>
      ) : workspaceRows.length === 0 ? (
        isAdmin ? (
          <EmptyAdmin
            adapter={adapter}
            onCreate={() => setCreating(true)}
            disabled={creating}
          />
        ) : (
          <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
            Nenhum {adapter.copy.rowSubject} criado neste workspace.
          </p>
        )
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {workspaceRows.map((row) => (
              <TaxonomyRowView
                key={row.id}
                workspaceId={workspaceId}
                row={row}
                adapter={adapter}
                isAdmin={isAdmin}
                variant="card"
                isEditing={editingId === row.id}
                onStartEdit={() => setEditingId(row.id)}
                onCancelEdit={() => setEditingId(null)}
                onSavedEdit={() => setEditingId(null)}
              />
            ))}
          </ul>

          {/* Desktop table */}
          <div className="border-border hidden overflow-hidden rounded-[12px] border lg:block">
            <table className="w-full text-left">
              <thead className="bg-muted text-muted-foreground text-[12px] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {workspaceRows.map((row) => (
                  <TaxonomyRowView
                    key={row.id}
                    workspaceId={workspaceId}
                    row={row}
                    adapter={adapter}
                    isAdmin={isAdmin}
                    variant="row"
                    isEditing={editingId === row.id}
                    onStartEdit={() => setEditingId(row.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSavedEdit={() => setEditingId(null)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {inheritedRows.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setInheritedOpen((v) => !v)}
            className={cn(
              'text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-[14px] font-medium',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            )}
            aria-expanded={inheritedOpen}
          >
            {inheritedOpen ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            {adapter.copy.inheritedHeader} ({inheritedRows.length})
          </button>

          {inheritedOpen && (
            <>
              <ul className="mt-3 flex flex-col gap-3 lg:hidden">
                {inheritedRows.map((row) => (
                  <TaxonomyRowView
                    key={row.id}
                    workspaceId={workspaceId}
                    row={row}
                    adapter={adapter}
                    isAdmin={isAdmin}
                    variant="card"
                    isEditing={false}
                    onStartEdit={() => undefined}
                    onCancelEdit={() => undefined}
                    onSavedEdit={() => undefined}
                  />
                ))}
              </ul>
              <div className="border-border mt-3 hidden overflow-hidden rounded-[12px] border lg:block">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground text-[12px] uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nome</th>
                      <th className="px-4 py-3 font-medium">Descrição</th>
                      <th className="px-4 py-3 font-medium">Origem</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {inheritedRows.map((row) => (
                      <TaxonomyRowView
                        key={row.id}
                        workspaceId={workspaceId}
                        row={row}
                        adapter={adapter}
                        isAdmin={isAdmin}
                        variant="row"
                        isEditing={false}
                        onStartEdit={() => undefined}
                        onCancelEdit={() => undefined}
                        onSavedEdit={() => undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

interface EmptyAdminProps {
  adapter: ReturnType<typeof adapterFor>
  onCreate: () => void
  disabled: boolean
}

function EmptyAdmin({ adapter, onCreate, disabled }: EmptyAdminProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-[12px] border border-dashed py-10 text-center">
      <h3 className="text-foreground text-[16px] font-semibold">
        {adapter.copy.emptyTitle}
      </h3>
      <p className="text-muted-foreground max-w-md text-[14px]">
        {adapter.copy.emptyBody}
      </p>
      <Button
        type="button"
        variant="solid"
        size="sm"
        onClick={onCreate}
        disabled={disabled}
      >
        <Plus className="size-4" /> {adapter.copy.emptyCta}
      </Button>
    </div>
  )
}
