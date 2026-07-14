'use client'

import { Check, Mail, Trash2 } from 'lucide-react'

import { IconButton } from '~/components/ui/icon-button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { cn } from '~/lib/utils'

export type InviteRole = 'COORDENADOR' | 'COLABORADOR'

export type RowStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'TARGET_USER_NOT_FOUND'
  | 'ALREADY_MEMBER'
  | 'OTHER'

export interface InviteRowState {
  email: string
  role: InviteRole
  specialtyId: string
  status: RowStatus
}

export interface SpecialtyOption {
  id: string
  name: string
}

interface Props {
  index: number
  row: InviteRowState
  canRemove: boolean
  specialties: SpecialtyOption[]
  onChange: (idx: number, patch: Partial<InviteRowState>) => void
  onRemove: (idx: number) => void
}

const ROLE_LABEL: Record<InviteRole, string> = {
  COORDENADOR: 'Coordenador',
  COLABORADOR: 'Colaborador',
}

const STATUS_COPY: Partial<Record<RowStatus, string>> = {
  TARGET_USER_NOT_FOUND: 'Usuário não encontrado',
  ALREADY_MEMBER: 'Já é membro',
  OTHER: 'Falha ao adicionar',
}

const MISSING_SPECIALTY_COPY = 'Profissão é obrigatória'

export function InviteRow({
  index,
  row,
  canRemove,
  specialties,
  onChange,
  onRemove,
}: Props) {
  const errorMsg = STATUS_COPY[row.status]
  const showSuccess = row.status === 'success'
  const showMissingSpec =
    !showSuccess &&
    row.email.trim().length > 0 &&
    row.specialtyId.length === 0 &&
    row.status === 'idle'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Mail
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            type="email"
            value={row.email}
            placeholder="email@exemplo.com"
            aria-label={`Email do convidado ${index + 1}`}
            aria-invalid={errorMsg ? true : undefined}
            disabled={row.status === 'pending' || showSuccess}
            onChange={(e) =>
              onChange(index, { email: e.target.value, status: 'idle' })
            }
            className={cn('pl-10')}
          />
        </div>
        <Select
          value={row.role}
          onValueChange={(value: InviteRole) =>
            onChange(index, { role: value })
          }
          disabled={row.status === 'pending' || showSuccess}
        >
          <SelectTrigger className="h-12 w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLABORADOR">Colaborador</SelectItem>
            <SelectItem value="COORDENADOR">Coordenador</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={row.specialtyId || undefined}
          onValueChange={(value) =>
            onChange(index, { specialtyId: value, status: 'idle' })
          }
          disabled={row.status === 'pending' || showSuccess}
        >
          <SelectTrigger
            className="h-12 w-44 shrink-0"
            aria-invalid={showMissingSpec ? true : undefined}
          >
            <SelectValue placeholder="Profissão" />
          </SelectTrigger>
          <SelectContent>
            {specialties.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canRemove && (
          <IconButton
            type="button"
            variant="outline"
            aria-label="Remover linha"
            onClick={() => onRemove(index)}
          >
            <Trash2 />
          </IconButton>
        )}
      </div>
      {errorMsg && (
        <span className="text-destructive text-[13px] font-medium">
          {errorMsg}
        </span>
      )}
      {!errorMsg && showMissingSpec && (
        <span className="text-destructive text-[13px] font-medium">
          {MISSING_SPECIALTY_COPY}
        </span>
      )}
      {showSuccess && (
        <span className="text-primary inline-flex items-center gap-1 text-[13px] font-medium">
          <Check className="size-4" /> Convite enviado · {ROLE_LABEL[row.role]}
        </span>
      )}
    </div>
  )
}
