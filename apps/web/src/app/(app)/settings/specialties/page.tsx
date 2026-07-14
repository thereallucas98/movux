import { TaxonomyList } from '~/components/features/settings/taxonomy-list'

import { resolveSettingsContext } from '../_data'

interface PageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function SettingsSpecialtiesPage({
  searchParams,
}: PageProps) {
  const ctx = await resolveSettingsContext(searchParams)
  return (
    <TaxonomyList
      resource="specialties"
      workspaceId={ctx.workspaceId}
      isAdmin={ctx.myMembershipRole === 'ADMIN'}
    />
  )
}
