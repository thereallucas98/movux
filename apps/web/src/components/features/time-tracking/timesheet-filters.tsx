'use client'

import type { DateRange } from 'react-day-picker'

import { useWorkspaceWithMembers } from '~/components/features/settings/_hooks/use-workspace-with-members'
import { Checkbox } from '~/components/ui/checkbox'
import { DateRangePicker } from '~/components/ui/date-range-picker'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

export interface TimesheetFiltersValue {
  from: Date | null
  to: Date | null
  userId: string | null
  needsClosure: boolean
}

interface Props {
  workspaceId: string
  value: TimesheetFiltersValue
  onChange: (next: TimesheetFiltersValue) => void
}

export function TimesheetFilters({ workspaceId, value, onChange }: Props) {
  const membersQuery = useWorkspaceWithMembers(workspaceId)
  const memberships = membersQuery.data?.memberships ?? []

  function handleRangeChange(range: DateRange | undefined) {
    onChange({
      ...value,
      from: range?.from ?? null,
      to: range?.to ?? null,
    })
  }

  function handleUserChange(next: string) {
    onChange({ ...value, userId: next === 'all' ? null : next })
  }

  function handleNeedsClosureChange(next: boolean) {
    onChange({ ...value, needsClosure: next })
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-[12px] border p-4 lg:flex-row lg:items-end">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label>Período</Label>
        <DateRangePicker
          value={
            value.from || value.to
              ? { from: value.from ?? undefined, to: value.to ?? undefined }
              : undefined
          }
          onChange={handleRangeChange}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Label>Usuário</Label>
        <Select value={value.userId ?? 'all'} onValueChange={handleUserChange}>
          <SelectTrigger className="h-12">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {memberships.map((m) => (
              <SelectItem key={m.user.id} value={m.user.id}>
                {m.user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 lg:pb-3">
        <Checkbox
          id="needs-closure"
          checked={value.needsClosure}
          onCheckedChange={(checked) =>
            handleNeedsClosureChange(checked === true)
          }
        />
        <Label htmlFor="needs-closure" className="font-normal">
          Apenas pendentes de fechamento
        </Label>
      </div>
    </div>
  )
}
