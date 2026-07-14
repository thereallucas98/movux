import type { ReactNode } from 'react'

import { ProfileNav } from '~/components/features/profile/profile-nav'

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
      <aside className="lg:w-48 lg:shrink-0">
        <ProfileNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
