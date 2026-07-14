'use client'

import { Inbox } from 'lucide-react'
import { Skeleton } from '~/components/ui/skeleton'
import type { MyAssignmentRow } from './_hooks/use-my-assignments'
import { MyShiftCard } from './my-shift-card'

interface Props {
  items: MyAssignmentRow[]
  isLoading: boolean
  emptyText: string
  cardVariant: 'pending' | 'accepted' | 'history'
}

export function MyShiftsTableView({
  items,
  isLoading,
  emptyText,
  cardVariant,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[12px]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-[12px] border border-dashed py-10 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <Inbox className="text-muted-foreground size-5" aria-hidden />
        </div>
        <p className="text-muted-foreground max-w-md text-[14px]">
          {emptyText}
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((a) => (
        <li key={a.id}>
          <MyShiftCard assignment={a} variant={cardVariant} />
        </li>
      ))}
    </ul>
  )
}
