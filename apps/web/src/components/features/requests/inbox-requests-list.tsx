'use client'

import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

import { RequestCard } from './request-card'
import { ResolveRequestDialog } from './resolve-request-dialog'
import {
  useRequests,
  type RequestWithRelationsRow,
} from './_hooks/use-requests'

type Filter = 'pending' | 'resolved' | 'history'

const STATUSES_BY_FILTER: Record<Filter, RequestWithRelationsRow['status'][]> =
  {
    pending: ['PENDING_PEER', 'PENDING'],
    resolved: ['APPROVED', 'REJECTED'],
    history: ['CANCELLED'],
  }

const COPY: Record<Filter, string> = {
  pending: 'Nenhum pedido aguardando aprovação.',
  resolved: 'Nenhum pedido resolvido ainda.',
  history: 'Sem histórico ainda.',
}

interface Props {
  workspaceId: string
  workspaceTimezone: string
  meId: string
}

export function InboxRequestsList({
  workspaceId,
  workspaceTimezone,
  meId,
}: Props) {
  const query = useRequests(workspaceId, 'workspace')
  const [filter, setFilter] = useState<Filter>('pending')
  const [resolving, setResolving] = useState<RequestWithRelationsRow | null>(
    null,
  )

  const data = query.data ?? []
  const filtered = useMemo(() => {
    const allowed = new Set(STATUSES_BY_FILTER[filter])
    return data.filter((r) => allowed.has(r.status))
  }, [data, filter])

  const counts = useMemo(() => {
    let pending = 0
    let resolved = 0
    let history = 0
    for (const r of data) {
      if (r.status === 'PENDING_PEER' || r.status === 'PENDING') pending += 1
      else if (r.status === 'APPROVED' || r.status === 'REJECTED') resolved += 1
      else if (r.status === 'CANCELLED') history += 1
    }
    return { pending, resolved, history }
  }, [data])

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-foreground text-[20px] font-semibold">
        Inbox de aprovação
      </h2>

      <div
        role="tablist"
        aria-label="Filtrar pedidos"
        className="border-border bg-muted/20 inline-flex w-fit gap-1 rounded-[10px] border p-1"
      >
        {(
          [
            { key: 'pending', label: 'Pendentes', count: counts.pending },
            { key: 'resolved', label: 'Resolvidas', count: counts.resolved },
            { key: 'history', label: 'Histórico', count: counts.history },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              filter === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[12px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-[12px] border border-dashed py-10 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Inbox className="text-muted-foreground size-5" aria-hidden />
          </div>
          <p className="text-muted-foreground max-w-md text-[14px]">
            {COPY[filter]}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((r) => (
            <li key={r.id}>
              <RequestCard
                request={r}
                variant="inbox"
                meId={meId}
                workspaceTimezone={workspaceTimezone}
                onResolve={(req) => setResolving(req)}
              />
            </li>
          ))}
        </ul>
      )}

      {resolving && (
        <ResolveRequestDialog
          workspaceId={workspaceId}
          request={resolving}
          open={resolving !== null}
          onOpenChange={(open) => !open && setResolving(null)}
        />
      )}
    </section>
  )
}
