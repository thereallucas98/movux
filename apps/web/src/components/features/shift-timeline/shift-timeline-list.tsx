'use client'

import { useMemo } from 'react'

import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

import { AddNoteForm } from './add-note-form'
import { TimelineEventCard } from './timeline-event-card'
import { useShiftTimeline } from './_hooks/use-shift-timeline'

interface Props {
  shiftId: string
  canAddNote: boolean
}

export function ShiftTimelineList({ shiftId, canAddNote }: Props) {
  const query = useShiftTimeline(shiftId, { order: 'desc' })

  const items = useMemo(() => {
    return query.data?.pages.flatMap((p) => p.data) ?? []
  }, [query.data])

  return (
    <section className="flex flex-col gap-4 pb-32 lg:pb-0">
      {canAddNote && (
        <div className="lg:order-first">
          <AddNoteForm shiftId={shiftId} />
        </div>
      )}

      <h2 className="text-foreground text-[18px] font-semibold">Histórico</h2>

      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[10px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
          Nenhum evento ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((e) => (
            <li key={e.id}>
              <TimelineEventCard event={e} />
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}
    </section>
  )
}
