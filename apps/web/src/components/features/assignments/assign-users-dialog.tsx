'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useTaxonomies } from '~/components/features/settings/_hooks/use-taxonomies'
import { useWorkspaceWithMembers } from '~/components/features/settings/_hooks/use-workspace-with-members'
import { useShiftExpectedComposition } from '~/components/features/shifts/_hooks/use-shift-expected-composition'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
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
import { Tag } from '~/components/ui/tag'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { CompositionMatchTag } from './composition-match-tag'
import { useAssignUsers } from './_hooks/use-assign-users'
import { useShiftAssignments } from './_hooks/use-shift-assignments'

interface Props {
  workspaceId: string
  scheduleId: string
  shift: { id: string; headcount: number; categoryId: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

type CompStatus = 'MATCH' | 'MISMATCH' | 'UNKNOWN'

function computeCompositionStatus(
  specialtyId: string | null | undefined,
  expected: Set<string>,
): CompStatus {
  if (!specialtyId) return 'UNKNOWN'
  if (expected.size === 0) return 'UNKNOWN'
  return expected.has(specialtyId) ? 'MATCH' : 'MISMATCH'
}

export function AssignUsersDialog({
  workspaceId,
  scheduleId,
  shift,
  open,
  onOpenChange,
}: Props) {
  const membersQuery = useWorkspaceWithMembers(workspaceId)
  const compositionQuery = useShiftExpectedComposition(
    workspaceId,
    scheduleId,
    shift.id,
    { enabled: open },
  )
  const existingAssignments = useShiftAssignments(
    workspaceId,
    scheduleId,
    shift.id,
    { enabled: open },
  )
  const specialtiesQuery = useTaxonomies('specialties', workspaceId)
  const mutation = useAssignUsers(workspaceId, scheduleId, shift.id)

  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all')
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())

  const expectedSpecialtyIds = useMemo(() => {
    const set = new Set<string>()
    for (const item of compositionQuery.data ?? []) set.add(item.specialtyId)
    return set
  }, [compositionQuery.data])

  const alreadyAssignedUserIds = useMemo(() => {
    const set = new Set<string>()
    const ACTIVE = new Set([
      'PENDING_ACCEPT',
      'ACCEPTED',
      'PENDING_CLOSURE',
      'COMPLETED',
    ])
    for (const a of existingAssignments.data ?? []) {
      if (ACTIVE.has(a.status)) set.add(a.userId)
    }
    return set
  }, [existingAssignments.data])

  const memberships = membersQuery.data?.memberships ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return memberships.filter((m) => {
      if (q && !m.user.fullName.toLowerCase().includes(q)) return false
      if (specialtyFilter !== 'all') {
        if (specialtyFilter === 'none' && m.specialty) return false
        if (specialtyFilter !== 'none' && m.specialty?.id !== specialtyFilter) {
          return false
        }
      }
      return true
    })
  }, [memberships, search, specialtyFilter])

  function toggle(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleSubmit() {
    if (selectedUserIds.size === 0) return
    try {
      await mutation.mutateAsync(Array.from(selectedUserIds))
      setSelectedUserIds(new Set())
      onOpenChange(false)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'SHIFT_HEADCOUNT_FULL') {
        toast.error('Já não há vagas disponíveis para este turno.')
        return
      }
      if (code === 'USER_NOT_WORKSPACE_MEMBER') {
        toast.error(
          'Algum dos usuários selecionados não pertence ao workspace.',
        )
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('O turno não permite atribuições no estado atual.')
        onOpenChange(false)
        return
      }
      toast.error('Não foi possível atribuir.')
    }
  }

  const isLoading = membersQuery.isLoading
  const isSubmitting = mutation.isPending

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Atribuir colaboradores"
      description={`Headcount: ${shift.headcount}`}
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[40rem] lg:max-w-[56rem]"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-muted-foreground text-[14px]">
            {selectedUserIds.size} selecionado(s)
          </span>
          <div className="flex gap-2">
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
              onClick={handleSubmit}
              disabled={selectedUserIds.size === 0 || isSubmitting}
              className={cn(isSubmitting && 'opacity-60')}
            >
              {isSubmitting ? 'Atribuindo…' : 'Atribuir'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_14rem]">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={specialtyFilter}
            onValueChange={(v) => setSpecialtyFilter(v)}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Filtrar por especialidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as especialidades</SelectItem>
              <SelectItem value="none">Sem especialidade</SelectItem>
              {(specialtiesQuery.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full rounded-[10px]" />
            <Skeleton className="h-14 w-full rounded-[10px]" />
            <Skeleton className="h-14 w-full rounded-[10px]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground border-border rounded-[10px] border border-dashed py-8 text-center text-[14px]">
            Nenhum membro encontrado.
          </p>
        ) : (
          <ul className="border-border max-h-[24rem] overflow-y-auto rounded-[10px] border">
            {filtered.map((m) => {
              const isAssigned = alreadyAssignedUserIds.has(m.user.id)
              const isSelected = selectedUserIds.has(m.user.id)
              const compStatus = computeCompositionStatus(
                m.specialty?.id ?? null,
                expectedSpecialtyIds,
              )
              return (
                <li
                  key={m.id}
                  className={cn(
                    'border-border flex items-center gap-3 border-b px-3 py-3 last:border-b-0',
                    isAssigned && 'opacity-50',
                  )}
                >
                  <Checkbox
                    id={`assign-${m.user.id}`}
                    checked={isSelected}
                    disabled={isAssigned}
                    onCheckedChange={() => toggle(m.user.id)}
                  />
                  <Label
                    htmlFor={`assign-${m.user.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-1 font-normal"
                  >
                    <span className="text-foreground truncate text-[14px] font-medium">
                      {m.user.fullName}
                    </span>
                    <span className="text-muted-foreground truncate text-[12px]">
                      {m.user.email}
                    </span>
                  </Label>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    {m.specialty ? (
                      <Tag category="blue">{m.specialty.name}</Tag>
                    ) : (
                      <Tag category="gray">Sem especialidade</Tag>
                    )}
                    <CompositionMatchTag status={compStatus} />
                    {isAssigned && (
                      <span className="text-muted-foreground text-[11px]">
                        Já atribuído
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AdaptiveDialog>
  )
}
