import { WorkspaceInfoCard } from '~/components/features/settings/workspace-info-card'

import { resolveSettingsContext } from '../_data'

interface PageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function SettingsInfoPage({ searchParams }: PageProps) {
  const ctx = await resolveSettingsContext(searchParams)

  return (
    <WorkspaceInfoCard
      workspace={{
        id: ctx.workspaceId,
        name: ctx.workspaceName,
        timezone: ctx.workspaceTimezone,
        vertical: ctx.workspaceVertical,
      }}
      canEdit={ctx.myMembershipRole === 'ADMIN'}
    />
  )
}
