'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { IconButton } from '~/components/ui/icon-button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Skeleton } from '~/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import {
  useShiftExpectedComposition,
  type ShiftCompositionItem,
} from './_hooks/use-shift-expected-composition'
import { useSetShiftExpectedComposition } from './_hooks/use-set-shift-expected-composition'

interface Props {
  workspaceId: string
  scheduleId: string
  shift: { id: string; headcount: number }
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Row {
  specialtyId: string
  count: number
}

function newEmptyRow(): Row {
  return { specialtyId: '', count: 1 }
}

export function ExpectedCompositionDialog({
  workspaceId,
  scheduleId,
  shift,
  open,
  onOpenChange,
}: Props) {
  const compositionQuery = useShiftExpectedComposition(
    workspaceId,
    scheduleId,
    shift.id,
    { enabled: open },
  )
  const specialtiesQuery = useTaxonomies('specialties', workspaceId)
  const specialties = specialtiesQuery.data ?? []
  const mutation = useSetShiftExpectedComposition(
    workspaceId,
    scheduleId,
    shift.id,
  )

  const [rows, setRows] = useState<Row[]>([])
  const [seeded, setSeeded] = useState(false)

  // Seed rows from server data on first arrival; reset when dialog closes.
  useEffect(() => {
    if (!open) {
      setSeeded(false)
      return
    }
    if (!seeded && compositionQuery.data) {
      setRows(
        compositionQuery.data.length === 0
          ? [newEmptyRow()]
          : compositionQuery.data.map((i: ShiftCompositionItem) => ({
              specialtyId: i.specialtyId,
              count: i.count,
            })),
      )
      setSeeded(true)
    }
  }, [open, seeded, compositionQuery.data])

  const usedSpecialtyIds = useMemo(() => {
    return new Set(rows.map((r) => r.specialtyId).filter((id) => id !== ''))
  }, [rows])

  const total = rows.reduce((sum, r) => sum + (r.count || 0), 0)
  const mismatched = total !== shift.headcount
  const hasIncompleteRow = rows.some((r) => r.specialtyId === '')
  const allSpecialtiesUsed =
    specialties.length > 0 && usedSpecialtyIds.size >= specialties.length

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    )
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function addRow() {
    setRows((prev) => [...prev, newEmptyRow()])
  }

  async function handleSave() {
    const items = rows
      .filter((r) => r.specialtyId !== '')
      .map((r) => ({ specialtyId: r.specialtyId, count: r.count }))
    try {
      await mutation.mutateAsync({ items })
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esta escala não está mais em rascunho.')
        onOpenChange(false)
        return
      }
      if (code === 'SPECIALTY_NOT_IN_WORKSPACE') {
        toast.error('Especialidade não pertence a este workspace.')
        return
      }
      if (code === 'VALIDATION_ERROR') {
        toast.error('Dados inválidos.')
        return
      }
      toast.error('Não foi possível salvar a composição.')
    }
  }

  const isLoading = compositionQuery.isLoading
  const isSubmitting = mutation.isPending

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar composição"
      description={`Defina quantas pessoas de cada especialidade compõem este turno (${shift.headcount} ${shift.headcount === 1 ? 'vaga' : 'vagas'}).`}
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[34rem] lg:max-w-[40rem]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'text-[14px] font-medium',
                    mismatched ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  Total: {total} / {shift.headcount}
                </span>
              </TooltipTrigger>
              {mismatched && (
                <TooltipContent>
                  O total de especialidades não confere com o número de vagas (
                  {shift.headcount}).
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="solid"
              size="md"
              onClick={handleSave}
              disabled={isSubmitting || hasIncompleteRow}
            >
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full rounded-[8px]" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
          </>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-[13px]">
                Nenhuma especialidade definida. Adicione a primeira abaixo.
              </p>
            ) : (
              rows.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 lg:grid lg:grid-cols-[1fr_6rem_3rem] lg:items-center"
                >
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`comp-specialty-${index}`}
                      className="lg:hidden"
                    >
                      Especialidade
                    </Label>
                    <Select
                      value={row.specialtyId || ''}
                      onValueChange={(v) =>
                        updateRow(index, { specialtyId: v })
                      }
                    >
                      <SelectTrigger
                        id={`comp-specialty-${index}`}
                        className="h-12"
                      >
                        <SelectValue placeholder="Selecione uma especialidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map((s) => (
                          <SelectItem
                            key={s.id}
                            value={s.id}
                            disabled={
                              s.id !== row.specialtyId &&
                              usedSpecialtyIds.has(s.id)
                            }
                          >
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 lg:items-stretch">
                    <div className="flex flex-1 flex-col gap-1">
                      <Label
                        htmlFor={`comp-count-${index}`}
                        className="lg:hidden"
                      >
                        Quantidade
                      </Label>
                      <Input
                        id={`comp-count-${index}`}
                        type="number"
                        min={1}
                        max={1000}
                        step={1}
                        value={row.count}
                        onChange={(e) =>
                          updateRow(index, {
                            count: Math.max(
                              1,
                              Math.min(1000, Number(e.target.value) || 1),
                            ),
                          })
                        }
                      />
                    </div>
                    <IconButton
                      type="button"
                      variant="danger"
                      size="md"
                      aria-label="Remover linha"
                      onClick={() => removeRow(index)}
                    >
                      <X />
                    </IconButton>
                  </div>
                </div>
              ))
            )}
            {!allSpecialtiesUsed && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={addRow}
                className="self-start"
              >
                <Plus className="size-4" /> Adicionar especialidade
              </Button>
            )}
          </>
        )}
      </div>
    </AdaptiveDialog>
  )
}
