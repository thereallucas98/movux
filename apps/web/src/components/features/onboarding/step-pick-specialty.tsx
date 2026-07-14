'use client'

import { Briefcase, Check } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/ui/button'
import { Type } from '~/components/ui/type'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

interface Props {
  workspaceId: string
  membershipId: string
  onSuccess: () => void
}

export function StepPickSpecialty({
  workspaceId,
  membershipId,
  onSuccess,
}: Props) {
  const specialties = useTaxonomies('specialties', workspaceId)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConfirm() {
    if (!selected) {
      setError('Selecione uma profissão')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/members/${membershipId}/specialty`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ specialtyId: selected }),
        },
      )
      if (!res.ok) throw await ApiError.fromResponse(res)
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      setError(
        code === 'SPECIALTY_NOT_IN_WORKSPACE'
          ? 'Profissão não disponível neste workspace'
          : 'Não foi possível salvar. Tente novamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <Briefcase className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
            Qual sua profissão?
          </h1>
          <p className="text-muted-foreground text-[14px] leading-[20px]">
            Identifica seu papel nesta unidade. Você pode trocar depois.
          </p>
        </div>
      </header>

      {specialties.isLoading && (
        <p className="text-muted-foreground text-center text-sm">
          Carregando profissões…
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {specialties.data?.map((s) => {
          const isSelected = selected === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s.id)}
              className={cn(
                'border-border flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                  : 'hover:bg-muted/40',
              )}
              aria-pressed={isSelected}
            >
              <span>{s.name}</span>
              {isSelected && (
                <Check className="text-primary size-4 shrink-0" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <Type variant="danger" className="text-center">
          {error}
        </Type>
      )}

      <Button
        type="button"
        variant="solid"
        size="md"
        onClick={onConfirm}
        disabled={submitting || !selected}
        className="w-full"
      >
        {submitting ? 'Salvando…' : 'Continuar'}
      </Button>
    </div>
  )
}
