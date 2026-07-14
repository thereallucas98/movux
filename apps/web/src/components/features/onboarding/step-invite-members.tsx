'use client'

import { Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Type } from '~/components/ui/type'
import { cn } from '~/lib/utils'
import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'

import {
  InviteRow,
  type InviteRole,
  type InviteRowState,
  type RowStatus,
  type SpecialtyOption,
} from './invite-row'

interface Props {
  workspaceId: string
  onDone: () => void
}

function emptyRow(): InviteRowState {
  return { email: '', role: 'COLABORADOR', specialtyId: '', status: 'idle' }
}

function isMeaningful(r: InviteRowState): boolean {
  return r.email.trim().length > 0
}

function isReadyToSubmit(r: InviteRowState): boolean {
  return isMeaningful(r) && r.specialtyId.length > 0
}

function codeToStatus(code: string | undefined): RowStatus {
  switch (code) {
    case 'TARGET_USER_NOT_FOUND':
      return 'TARGET_USER_NOT_FOUND'
    case 'ALREADY_MEMBER':
      return 'ALREADY_MEMBER'
    default:
      return 'OTHER'
  }
}

export function StepInviteMembers({ workspaceId, onDone }: Props) {
  const [rows, setRows] = useState<InviteRowState[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [hasFailures, setHasFailures] = useState(false)
  const specialties = useTaxonomies('specialties', workspaceId)
  const specialtyOptions: SpecialtyOption[] =
    specialties.data?.map((s) => ({ id: s.id, name: s.name })) ?? []
  // Once specialties load, pre-fill blank rows with the first option to
  // reduce friction; user can change before submit.
  useEffect(() => {
    if (specialtyOptions.length === 0) return
    setRows((prev) =>
      prev.map((r) =>
        r.specialtyId === ''
          ? { ...r, specialtyId: specialtyOptions[0].id }
          : r,
      ),
    )
  }, [specialties.data?.length, specialtyOptions])

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
    setHasFailures(false)
  }

  function changeRow(idx: number, patch: Partial<InviteRowState>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function removeRow(idx: number) {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
    )
  }

  async function submitOne(
    row: InviteRowState,
  ): Promise<{ ok: true } | { ok: false; status: RowStatus }> {
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: row.email.trim(),
        role: row.role as InviteRole,
        specialtyId: row.specialtyId,
      }),
    })
    if (res.ok) return { ok: true }
    const body = (await res.json().catch(() => null)) as {
      code?: string
    } | null
    return { ok: false, status: codeToStatus(body?.code) }
  }

  async function onConcluir() {
    // Block submit if any meaningful row is missing a specialty (server would
    // reject anyway with 400, but the inline error is clearer than a toast).
    const incomplete = rows.some(
      (r) => isMeaningful(r) && r.specialtyId.length === 0,
    )
    if (incomplete) {
      setHasFailures(true)
      return
    }

    const meaningfulIdx = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => isReadyToSubmit(r))

    if (meaningfulIdx.length === 0) {
      onDone()
      return
    }

    setSubmitting(true)
    setHasFailures(false)
    setRows((prev) =>
      prev.map((r) => (isMeaningful(r) ? { ...r, status: 'pending' } : r)),
    )

    const results = await Promise.allSettled(
      meaningfulIdx.map(({ r }) => submitOne(r)),
    )

    let anyFailed = false
    setRows((prev) =>
      prev.map((r, i) => {
        const slot = meaningfulIdx.findIndex((m) => m.i === i)
        if (slot === -1) return r
        const settled = results[slot]
        if (settled.status === 'fulfilled' && settled.value.ok) {
          return { ...r, status: 'success' }
        }
        anyFailed = true
        const status: RowStatus =
          settled.status === 'fulfilled' && !settled.value.ok
            ? settled.value.status
            : 'OTHER'
        return { ...r, status }
      }),
    )

    setSubmitting(false)
    if (!anyFailed) {
      onDone()
      return
    }
    setHasFailures(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <Users className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-foreground text-[20px] leading-[28px] font-bold">
            Convide sua equipe
          </h1>
          <p className="text-muted-foreground text-[14px] leading-[20px]">
            Adicione pessoas que já têm conta. Você pode pular e convidar
            depois.
          </p>
        </div>
      </header>

      {hasFailures && (
        <Type variant="danger">
          Alguns convites falharam. Ajuste os emails ou clique em &quot;Pular
          esta etapa&quot;.
        </Type>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <InviteRow
            key={i}
            index={i}
            row={row}
            canRemove={rows.length > 1}
            specialties={specialtyOptions}
            onChange={changeRow}
            onRemove={removeRow}
          />
        ))}
        <button
          type="button"
          onClick={addRow}
          className="text-primary inline-flex items-center justify-center gap-1 text-[14px] font-medium hover:underline"
        >
          <Plus className="size-4" aria-hidden /> Adicionar pessoa
        </button>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          type="button"
          variant="solid"
          size="md"
          disabled={submitting}
          onClick={onConcluir}
          className={cn('w-full', submitting && 'opacity-60')}
        >
          {submitting ? 'Enviando…' : 'Concluir'}
        </Button>
        <button
          type="button"
          onClick={onDone}
          className="text-muted-foreground text-[14px] hover:underline"
        >
          Pular esta etapa
        </button>
      </div>
    </div>
  )
}
