'use client'

import { Check, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '~/components/ui/button'
import { Tag } from '~/components/ui/tag'
import { ApiError } from '~/lib/api-error'
import { categoryVisual } from '~/lib/format/category-visual'
import { cn } from '~/lib/utils'

import { useTaxonomies } from './_hooks/use-taxonomies'
import { useSetMemberSpecialty } from './_hooks/use-set-member-specialty'
import { useUnsetMemberSpecialty } from './_hooks/use-unset-member-specialty'
import type { MembershipSpecialty } from './_hooks/use-workspace-with-members'

interface Props {
  workspaceId: string
  member: {
    id: string
    user: { fullName: string }
    specialty: MembershipSpecialty | null
  }
  onClose: () => void
}

const ERROR_COPY: Record<string, string> = {
  SPECIALTY_NOT_IN_WORKSPACE: 'Essa profissão não pertence a este workspace.',
  TARGET_MEMBER_NOT_FOUND: 'Membro não encontrado.',
  FORBIDDEN: 'Sem permissão.',
  NOT_FOUND: 'Profissão não encontrada.',
}

export function SpecialtyPicker({ workspaceId, member, onClose }: Props) {
  const specialtiesQuery = useTaxonomies('specialties', workspaceId)
  const setMutation = useSetMemberSpecialty(workspaceId)
  const unsetMutation = useUnsetMemberSpecialty(workspaceId)
  const isPending = setMutation.isPending || unsetMutation.isPending

  const specialties = specialtiesQuery.data ?? []
  const currentId = member.specialty?.id ?? null

  async function handleSet(specialtyId: string) {
    try {
      await setMutation.mutateAsync({ memberId: member.id, specialtyId })
      onClose()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      toast.error((code && ERROR_COPY[code]) ?? 'Falha ao atualizar.')
    }
  }

  async function handleUnset() {
    try {
      await unsetMutation.mutateAsync(member.id)
      onClose()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      toast.error((code && ERROR_COPY[code]) ?? 'Falha ao remover.')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="px-1">
        <h3 className="text-foreground text-[14px] font-semibold">
          Definir profissão
        </h3>
        <p className="text-muted-foreground truncate text-[12px]">
          {member.user.fullName}
        </p>
      </div>

      {specialtiesQuery.isLoading ? (
        <p className="text-muted-foreground py-4 text-center text-[13px]">
          Carregando…
        </p>
      ) : specialties.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-muted-foreground text-[13px]">
            Nenhuma profissão disponível.
          </p>
          <Button asChild size="sm" variant="outline" onClick={onClose}>
            <Link href="/settings/specialties">
              <Plus className="size-4" /> Criar em Configurações
            </Link>
          </Button>
        </div>
      ) : (
        <ul role="listbox" className="flex flex-col gap-1">
          {specialties.map((s) => {
            const visual = categoryVisual(s.id)
            const isCurrent = s.id === currentId
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  disabled={isCurrent || isPending}
                  onClick={() => handleSet(s.id)}
                  className={cn(
                    'hover:bg-accent flex w-full items-center justify-between rounded-sm px-2 py-2 text-left transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    'disabled:opacity-60',
                  )}
                >
                  <Tag category={visual.palette}>{s.name}</Tag>
                  {isCurrent && (
                    <Check className="text-primary size-4" aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {currentId && specialties.length > 0 && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleUnset}
          className={cn(
            'border-border hover:bg-accent text-destructive mt-1 inline-flex items-center justify-center gap-1 rounded-sm border-t px-2 py-2 text-[13px] font-medium',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:opacity-60',
          )}
        >
          <X className="size-4" aria-hidden /> Remover profissão
        </button>
      )}
    </div>
  )
}
