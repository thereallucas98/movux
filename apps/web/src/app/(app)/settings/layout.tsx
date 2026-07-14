import type { ReactNode } from 'react'

import { SettingsNav } from '~/components/features/settings/settings-nav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-48 lg:shrink-0">
        <SettingsNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
