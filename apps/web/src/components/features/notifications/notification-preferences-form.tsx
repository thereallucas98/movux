'use client'

import { useEffect, useMemo, useState } from 'react'

import type {
  NotificationChannel,
  NotificationType,
} from '~/generated/prisma/client'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { Switch } from '~/components/ui/switch'
import { cn } from '~/lib/utils'

import {
  type PreferenceItem,
  useMyNotificationPreferences,
} from './_hooks/use-my-notification-preferences'
import { useUpdateMyNotificationPreferences } from './_hooks/use-update-my-notification-preferences'
import { getMetaFor } from './notification-meta'

const CHANNELS: NotificationChannel[] = ['IN_APP', 'EMAIL', 'PUSH', 'WHATSAPP']
const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  IN_APP: 'No app',
  EMAIL: 'Email',
  PUSH: 'Push',
  WHATSAPP: 'WhatsApp',
}

const TYPES: NotificationType[] = [
  'SCHEDULE_PUBLISHED',
  'SCHEDULE_CLOSED',
  'SHIFT_CANCELLED',
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_ACCEPTED',
  'ASSIGNMENT_REJECTED',
  'TRANSFER_REQUESTED',
  'TRANSFER_APPROVED',
  'TRANSFER_REJECTED',
  'CANDIDATE_QUEUED',
  'CANDIDATE_APPROVED',
  'CANDIDATE_REJECTED',
  'CANDIDATE_WITHDRAWN',
  'REQUEST_SUBMITTED',
  'REQUEST_RESOLVED',
  'REQUEST_PEER_DECISION',
]

function key(t: NotificationType, c: NotificationChannel): string {
  return `${t}:${c}`
}

function toMap(items: PreferenceItem[]): Map<string, boolean> {
  return new Map(items.map((i) => [key(i.type, i.channel), i.enabled]))
}

function diff(
  initial: Map<string, boolean>,
  draft: Map<string, boolean>,
): PreferenceItem[] {
  const updates: PreferenceItem[] = []
  for (const [k, v] of draft) {
    if (initial.get(k) !== v) {
      const [t, c] = k.split(':') as [NotificationType, NotificationChannel]
      updates.push({ type: t, channel: c, enabled: v })
    }
  }
  return updates
}

export function NotificationPreferencesForm() {
  const query = useMyNotificationPreferences()
  const mutation = useUpdateMyNotificationPreferences()

  const [draft, setDraft] = useState<Map<string, boolean>>(new Map())
  const initial = useMemo<Map<string, boolean>>(
    () => (query.data ? toMap(query.data) : new Map()),
    [query.data],
  )

  useEffect(() => {
    if (query.data) setDraft(toMap(query.data))
  }, [query.data])

  const dirty = useMemo(() => diff(initial, draft), [initial, draft])

  function toggle(t: NotificationType, c: NotificationChannel, next: boolean) {
    setDraft((prev) => {
      const m = new Map(prev)
      m.set(key(t, c), next)
      return m
    })
  }

  function reset() {
    setDraft(new Map(initial))
  }

  function save() {
    if (dirty.length === 0) return
    mutation.mutate({ updates: dirty })
  }

  if (query.isLoading) {
    return (
      <Card className="flex flex-col gap-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-72 w-full" />
      </Card>
    )
  }

  if (query.isError) {
    return (
      <Card className="flex flex-col gap-2 p-6">
        <p className="text-foreground text-[15px] font-medium">
          Não foi possível carregar suas preferências.
        </p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-foreground text-[18px] font-semibold">
          Preferências por evento
        </h2>
        <p className="text-muted-foreground text-[13px]">
          Email, Push e WhatsApp serão entregues a partir da Fase 2 — você pode
          definir suas preferências agora.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[14px]">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-2 py-2 font-medium">
                Evento
              </th>
              {CHANNELS.map((c) => (
                <th
                  key={c}
                  className="text-muted-foreground px-2 py-2 text-center font-medium"
                >
                  {CHANNEL_LABEL[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map((t) => {
              const meta = getMetaFor(t)
              return (
                <tr key={t} className="border-border border-b last:border-b-0">
                  <td className="px-2 py-2 text-[13px]">{meta.label}</td>
                  {CHANNELS.map((c) => {
                    const enabled = draft.get(key(t, c)) ?? false
                    return (
                      <td key={c} className="px-2 py-2 text-center">
                        <Switch
                          checked={enabled}
                          onCheckedChange={(v) => toggle(t, c, v)}
                          aria-label={`${meta.label} via ${CHANNEL_LABEL[c]}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div
        className={cn(
          'border-border bg-background sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t px-4 py-3 md:static md:mx-0 md:border-0 md:p-0',
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={reset}
          disabled={dirty.length === 0 || mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="solid"
          size="md"
          onClick={save}
          disabled={dirty.length === 0 || mutation.isPending}
        >
          {mutation.isPending
            ? 'Salvando…'
            : `Salvar mudanças${dirty.length > 0 ? ` (${dirty.length})` : ''}`}
        </Button>
      </div>
    </Card>
  )
}
