import { Badge, type BadgeProps } from '~/components/ui/badge'
import type { ProposalStatus } from '~/graphql/generated/types'

const STATUS_META: Record<
  ProposalStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  ACTIVE: { label: 'Em negociação', variant: 'default' },
  ACCEPTED: { label: 'Aceita', variant: 'success' },
  REJECTED: { label: 'Recusada', variant: 'destructive' },
  WITHDRAWN: { label: 'Retirada', variant: 'outline' },
  EXPIRED: { label: 'Expirada', variant: 'outline' },
}

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
