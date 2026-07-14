import type { ReactNode } from 'react'

import { ShiftsNav } from '~/components/features/my-shifts/shifts-nav'

export default function MyShiftsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-48 lg:shrink-0">
        <ShiftsNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
