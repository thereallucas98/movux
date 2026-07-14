'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { NotificationPreferencesForm } from '~/components/features/notifications/notification-preferences-form'
import { Card } from '~/components/ui/card'
import { Label } from '~/components/ui/label'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'

import { useMe } from './_hooks/use-me'
import { useUpdateMe } from './_hooks/use-update-me'

export function NotificationsForm() {
  const meQuery = useMe()
  const updateMutation = useUpdateMe()
  const queryClient = useQueryClient()

  function handleToggle(next: boolean) {
    updateMutation.mutate(
      { whatsappOptIn: next },
      {
        onSuccess: () => {
          toast.success(
            next
              ? 'Notificações por WhatsApp ativadas'
              : 'Notificações por WhatsApp desativadas',
          )
        },
        onError: () => {
          toast.error('Não foi possível atualizar.')
          queryClient.invalidateQueries({ queryKey: ['me'] })
        },
      },
    )
  }

  if (meQuery.isLoading) {
    return (
      <Card className="flex flex-col gap-4 p-6">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-12 w-full" />
      </Card>
    )
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <Card className="flex flex-col gap-2 p-6">
        <h2 className="text-foreground text-[18px] font-semibold">
          Notificações
        </h2>
        <p className="text-muted-foreground text-[14px]">
          Não foi possível carregar suas preferências.
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-foreground text-[18px] font-semibold">
            Marketing e onboarding
          </h2>
          <p className="text-muted-foreground text-[14px]">
            Mensagens promocionais e de onboarding. Independente das
            preferências por evento abaixo.
          </p>
        </header>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <Label htmlFor="whatsapp-opt-in">
              Receber comunicações por WhatsApp
            </Label>
            <span className="text-muted-foreground text-[12px]">
              Outros canais chegarão em breve.
            </span>
          </div>
          <Switch
            id="whatsapp-opt-in"
            checked={meQuery.data.whatsappOptIn}
            onCheckedChange={handleToggle}
            disabled={updateMutation.isPending}
          />
        </div>
      </Card>

      <NotificationPreferencesForm />
    </div>
  )
}
