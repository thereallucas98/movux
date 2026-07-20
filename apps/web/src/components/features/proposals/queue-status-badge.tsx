import { Badge, type BadgeProps } from '~/components/ui/badge'
import type { QueueEntryStatus } from '~/graphql/generated/types'

const STATUS_META: Record<
  QueueEntryStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  WAITING: { label: 'Na fila', variant: 'secondary' },
  CALLED: { label: 'Chamado', variant: 'default' },
  ACTIVE: { label: 'Proposta enviada', variant: 'default' },
  EXHAUSTED: { label: 'Vaga encerrada', variant: 'outline' },
  WITHDRAWN: { label: 'Você saiu', variant: 'outline' },
}

export function QueueStatusBadge({ status }: { status: QueueEntryStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
