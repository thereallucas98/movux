'use client'

import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

import {
  useMyOpenShifts,
  type MyOpenShiftRow,
} from './_hooks/use-my-open-shifts'
import { MyOpenShiftCard } from './my-open-shift-card'

type Filter = 'available' | 'waitlist'

const COPY: Record<Filter, { emptyText: string }> = {
  available: { emptyText: 'Nenhum turno aberto com vagas no momento.' },
  waitlist: { emptyText: 'Nenhum turno em lista de espera.' },
}

function isAvailable(s: MyOpenShiftRow): boolean {
  return s.activeAssignmentsCount < s.headcount
}

export function MyOpenShiftsList() {
  const query = useMyOpenShifts()
  const data = query.data ?? []
  const [filter, setFilter] = useState<Filter>('available')

  const counts = useMemo(() => {
    let available = 0
    let waitlist = 0
    for (const s of data) {
      if (isAvailable(s)) available += 1
      else waitlist += 1
    }
    return { available, waitlist }
  }, [data])

  const items = useMemo(() => {
    if (filter === 'available') return data.filter(isAvailable)
    return data.filter((s) => !isAvailable(s))
  }, [data, filter])

  const copy = COPY[filter]

  return (
    <section
      aria-labelledby="my-open-shifts-heading"
      className="flex flex-col gap-4"
    >
      <h2
        id="my-open-shifts-heading"
        className="text-foreground text-[20px] font-semibold"
      >
        Abertos
      </h2>

      <div
        role="tablist"
        aria-label="Filtrar turnos abertos"
        className="border-border bg-muted/20 inline-flex w-fit gap-1 rounded-[10px] border p-1"
      >
        {(
          [
            { key: 'available', label: 'Com vagas', count: counts.available },
            {
              key: 'waitlist',
              label: 'Lista de espera',
              count: counts.waitlist,
            },
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
      ) : items.length === 0 ? (
        <div className="border-border flex flex-col items-center gap-3 rounded-[12px] border border-dashed py-10 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Inbox className="text-muted-foreground size-5" aria-hidden />
          </div>
          <p className="text-muted-foreground max-w-md text-[14px]">
            {copy.emptyText}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((s) => (
            <li key={s.id}>
              <MyOpenShiftCard openShift={s} variant={filter} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
