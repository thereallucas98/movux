import { MembersList } from '~/components/features/settings/members-list'

import { resolveSettingsContext } from '../_data'

interface PageProps {
  searchParams?: Promise<{ ws?: string }>
}

export default async function SettingsMembersPage({ searchParams }: PageProps) {
  const ctx = await resolveSettingsContext(searchParams)

  return (
    <section
      aria-labelledby="members-heading"
      className="border-border bg-background rounded-[12px] border p-6"
    >
      <header className="mb-6">
        <h2
          id="members-heading"
          className="text-foreground text-[18px] font-semibold"
        >
          Membros do workspace
        </h2>
        <p className="text-muted-foreground mt-1 text-[14px]">
          Adicione, altere papéis e remova pessoas do workspace.
        </p>
      </header>

      <MembersList
        workspaceId={ctx.workspaceId}
        meUserId={ctx.principal.userId}
        isAdmin={ctx.myMembershipRole === 'ADMIN'}
      />
    </section>
  )
}
