import type { ReactNode } from 'react'

import { AppShell } from '~/components/features/nav/app-shell'
import { requireMe } from '~/lib/require-me'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const me = await requireMe()

  return <AppShell me={me}>{children}</AppShell>
}
