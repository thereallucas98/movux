'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { cn } from '~/lib/utils'

import { useChangePassword } from './_hooks/use-change-password'

const passwordSchema = z
  .object({
    currentPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'A nova senha deve ser diferente da atual.',
    path: ['newPassword'],
  })

type PasswordValues = z.infer<typeof passwordSchema>

export function PasswordForm() {
  const mutation = useChangePassword()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onSubmit(values: PasswordValues) {
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      toast.success('Senha alterada')
      reset()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WRONG_PASSWORD') {
        setError('currentPassword', { message: 'Senha atual incorreta' })
        return
      }
      setError('root', { message: 'Não foi possível alterar a senha.' })
    }
  }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-[18px] font-semibold">Segurança</h2>
        <p className="text-muted-foreground text-[14px]">
          Altere sua senha periodicamente para manter sua conta segura.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">Senha atual</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            {...register('currentPassword')}
            aria-invalid={errors.currentPassword ? true : undefined}
          />
          {errors.currentPassword && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.currentPassword.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            aria-invalid={errors.newPassword ? true : undefined}
          />
          {errors.newPassword && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.newPassword.message}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            aria-invalid={errors.confirmPassword ? true : undefined}
          />
          {errors.confirmPassword && (
            <span className="text-destructive text-[13px] font-medium">
              {errors.confirmPassword.message}
            </span>
          )}
        </div>

        {errors.root && <Type variant="danger">{errors.root.message}</Type>}

        <div className="flex flex-row items-center justify-between gap-2 pt-2">
          <Link
            href="/forgot-password"
            className="text-muted-foreground hover:text-foreground text-[13px] underline-offset-4 hover:underline"
          >
            Esqueci a senha
          </Link>
          <Button
            type="submit"
            variant="solid"
            size="md"
            disabled={!isValid || isSubmitting}
            className={cn(isSubmitting && 'opacity-60')}
          >
            {isSubmitting ? 'Alterando…' : 'Alterar senha'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
