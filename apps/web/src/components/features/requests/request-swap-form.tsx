'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useMyAssignments } from '~/components/features/my-shifts/_hooks/use-my-assignments'
import { useWorkspaceWithMembers } from '~/components/features/settings/_hooks/use-workspace-with-members'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { formatShiftStartLabel } from '~/lib/format/date'
import { cn } from '~/lib/utils'

import { useSubmitRequest } from './_hooks/use-submit-request'
import { useUserAssignmentsInWorkspace } from './_hooks/use-user-assignments-in-workspace'

interface Props {
  workspaceId: string
  workspaceTimezone: string
  meId: string
  onSuccess: () => void
  onBack: () => void
}

const schema = z
  .object({
    swapSourceAssignmentId: z.uuid('Selecione seu turno'),
    swapTargetUserId: z.uuid('Selecione um colega'),
    swapTargetAssignmentId: z.uuid('Selecione o turno do colega'),
    reason: z
      .string()
      .trim()
      .min(1, 'Informe um motivo')
      .max(2000, 'Máximo 2000 caracteres'),
  })
  .refine((d) => d.swapSourceAssignmentId !== d.swapTargetAssignmentId, {
    message: 'Você não pode trocar pelo mesmo turno',
    path: ['swapTargetAssignmentId'],
  })

type Values = z.infer<typeof schema>

export function RequestSwapForm({
  workspaceId,
  workspaceTimezone,
  meId,
  onSuccess,
  onBack,
}: Props) {
  const myAssignmentsQuery = useMyAssignments(['ACCEPTED'])
  const membersQuery = useWorkspaceWithMembers(workspaceId)
  const mutation = useSubmitRequest()

  const myAssignments = useMemo(() => {
    return (myAssignmentsQuery.data ?? []).filter(
      (a) => a.shift.schedule.workspaceId === workspaceId,
    )
  }, [myAssignmentsQuery.data, workspaceId])

  const peers = useMemo(() => {
    return (membersQuery.data?.memberships ?? []).filter(
      (m) => m.user.id !== meId,
    )
  }, [membersQuery.data, meId])

  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      swapSourceAssignmentId: '',
      swapTargetUserId: '',
      swapTargetAssignmentId: '',
      reason: '',
    },
  })

  const targetUserId = watch('swapTargetUserId')
  const targetAssignmentsQuery = useUserAssignmentsInWorkspace(
    workspaceId,
    targetUserId || null,
    ['ACCEPTED'],
  )
  const targetAssignments = targetAssignmentsQuery.data ?? []

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({
        type: 'SWAP',
        workspaceId,
        swapSourceAssignmentId: values.swapSourceAssignmentId,
        swapTargetUserId: values.swapTargetUserId,
        swapTargetAssignmentId: values.swapTargetAssignmentId,
        reason: values.reason,
      })
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'SHIFT_OVERLAP_CONFLICT') {
        toast.error('Há conflito de horário entre os turnos.')
        return
      }
      if (code === 'INVALID_STATE_TRANSITION') {
        toast.error('Esses turnos não estão mais elegíveis.')
        return
      }
      if (code === 'USER_NOT_WORKSPACE_MEMBER') {
        toast.error('O colega não pertence ao workspace.')
        return
      }
      setError('root', { message: 'Não foi possível criar o pedido.' })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <Label>Seu turno</Label>
        <Controller
          control={control}
          name="swapSourceAssignmentId"
          render={({ field }) => (
            <Select
              value={field.value || ''}
              onValueChange={field.onChange}
              disabled={myAssignmentsQuery.isLoading}
            >
              <SelectTrigger
                className="h-12"
                aria-invalid={errors.swapSourceAssignmentId ? true : undefined}
              >
                <SelectValue placeholder="Selecione seu turno" />
              </SelectTrigger>
              <SelectContent>
                {myAssignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {formatShiftStartLabel(
                      new Date(a.shift.startAt),
                      workspaceTimezone,
                    )}
                    {' – '}
                    {formatShiftStartLabel(
                      new Date(a.shift.endAt),
                      workspaceTimezone,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.swapSourceAssignmentId && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.swapSourceAssignmentId.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Colega</Label>
        <Controller
          control={control}
          name="swapTargetUserId"
          render={({ field }) => (
            <Select
              value={field.value || ''}
              onValueChange={field.onChange}
              disabled={membersQuery.isLoading}
            >
              <SelectTrigger
                className="h-12"
                aria-invalid={errors.swapTargetUserId ? true : undefined}
              >
                <SelectValue placeholder="Selecione um colega" />
              </SelectTrigger>
              <SelectContent>
                {peers.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    {m.user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.swapTargetUserId && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.swapTargetUserId.message}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Turno do colega</Label>
        <Controller
          control={control}
          name="swapTargetAssignmentId"
          render={({ field }) => (
            <Select
              value={field.value || ''}
              onValueChange={field.onChange}
              disabled={!targetUserId || targetAssignmentsQuery.isLoading}
            >
              <SelectTrigger
                className="h-12"
                aria-invalid={errors.swapTargetAssignmentId ? true : undefined}
              >
                <SelectValue
                  placeholder={
                    targetUserId
                      ? 'Selecione o turno do colega'
                      : 'Escolha um colega primeiro'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {targetAssignments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {formatShiftStartLabel(
                      new Date(a.shift.startAt),
                      workspaceTimezone,
                    )}
                    {' – '}
                    {formatShiftStartLabel(
                      new Date(a.shift.endAt),
                      workspaceTimezone,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.swapTargetAssignmentId && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.swapTargetAssignmentId.message}
          </span>
        )}
        {targetUserId && targetAssignments.length === 0 && (
          <span className="text-muted-foreground text-[12px]">
            Esse colega não tem turnos aceitos disponíveis.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="swap-reason">Motivo</Label>
        <Textarea
          id="swap-reason"
          placeholder="Por que precisa trocar?"
          {...register('reason')}
          aria-invalid={errors.reason ? true : undefined}
        />
        {errors.reason && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.reason.message}
          </span>
        )}
      </div>

      {errors.root && <Type variant="danger">{errors.root.message}</Type>}

      <div className="flex justify-between gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          variant="solid"
          size="md"
          disabled={!isValid || isSubmitting}
          className={cn(isSubmitting && 'opacity-60')}
        >
          {isSubmitting ? 'Enviando…' : 'Solicitar troca'}
        </Button>
      </div>
    </form>
  )
}
