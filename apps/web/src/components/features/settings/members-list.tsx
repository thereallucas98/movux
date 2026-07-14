'use client'

import { Plus, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

import { AddMemberForm } from './add-member-form'
import { MemberRow } from './member-row'
import {
  type MembershipSpecialty,
  useNextMembersPage,
  useWorkspaceWithMembers,
  type WorkspaceRole,
} from './_hooks/use-workspace-with-members'
import { useTaxonomies } from './_hooks/use-taxonomies'

interface Props {
  workspaceId: string
  meUserId: string
  isAdmin: boolean
}

interface Membership {
  id: string
  role: WorkspaceRole
  isActive: boolean
  createdAt: string
  user: { id: string; email: string; fullName: string }
  specialty: MembershipSpecialty | null
}

export function MembersList({ workspaceId, meUserId, isAdmin }: Props) {
  const firstPage = useWorkspaceWithMembers(workspaceId)
  const specialtiesQuery = useTaxonomies('specialties', workspaceId)
  const specialtiesCount = specialtiesQuery.data?.length ?? 0
  const [cursor, setCursor] = useState<string | null>(null)
  const nextPage = useNextMembersPage(workspaceId, cursor)
  const [appended, setAppended] = useState<Membership[]>([])
  const [showAdd, setShowAdd] = useState(false)

  const memberships = useMemo<Membership[]>(() => {
    const base = firstPage.data?.memberships ?? []
    return [...base, ...appended]
  }, [firstPage.data, appended])

  const nextCursor =
    nextPage.data?.nextMembershipCursor ??
    firstPage.data?.nextMembershipCursor ??
    null

  // After a "Carregar mais" page resolves, append + advance the cursor pointer.
  if (
    nextPage.data &&
    cursor &&
    !appended.some((m) => m.id === nextPage.data.memberships[0]?.id)
  ) {
    setAppended((prev) => [...prev, ...nextPage.data!.memberships])
    setCursor(null) // reset until next click
  }

  if (firstPage.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[12px]" />
        ))}
      </div>
    )
  }

  const onlySelf =
    memberships.length === 1 && memberships[0]?.user.id === meUserId

  return (
    <div className="flex flex-col gap-4">
      {isAdmin && !specialtiesQuery.isLoading && specialtiesCount === 0 && (
        <div className="bg-muted/40 border-border flex flex-wrap items-center justify-between gap-3 rounded-[12px] border p-3">
          <p className="text-muted-foreground text-[13px]">
            Crie profissões em <strong>Configurações &gt; Profissões</strong>{' '}
            para atribuí-las aos membros.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/specialties">Configurar</Link>
          </Button>
        </div>
      )}

      {isAdmin && !showAdd && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdd(true)}
          >
            <UserPlus className="size-4" /> Adicionar membro
          </Button>
        </div>
      )}

      {isAdmin && showAdd && (
        <AddMemberForm
          workspaceId={workspaceId}
          onSuccess={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {onlySelf ? (
        <p className="text-muted-foreground border-border rounded-[12px] border border-dashed py-10 text-center text-[14px]">
          {isAdmin
            ? 'Convide pessoas pelo formulário acima.'
            : 'Nenhum outro membro neste workspace.'}
        </p>
      ) : (
        <>
          {/* Mobile card list */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {memberships.map((m) => (
              <MemberRow
                key={m.id}
                workspaceId={workspaceId}
                member={m}
                isSelf={m.user.id === meUserId}
                isAdmin={isAdmin}
                variant="card"
              />
            ))}
          </ul>

          {/* Desktop table */}
          <div className="border-border hidden overflow-hidden rounded-[12px] border lg:block">
            <table className="w-full text-left">
              <thead className="bg-muted text-muted-foreground text-[12px] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 font-medium">Profissão</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <MemberRow
                    key={m.id}
                    workspaceId={workspaceId}
                    member={m}
                    isSelf={m.user.id === meUserId}
                    isAdmin={isAdmin}
                    variant="row"
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {nextCursor && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCursor(nextCursor)}
          disabled={nextPage.isFetching}
        >
          <Plus className="size-4" />
          {nextPage.isFetching ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}
    </div>
  )
}
