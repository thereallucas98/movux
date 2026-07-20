import { Badge, type BadgeProps } from '~/components/ui/badge'
import type { VerificationStatus } from '~/graphql/generated/types'

const STATUS_META: Record<
  VerificationStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  PENDING: { label: 'Pendente', variant: 'secondary' },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  REJECTED: { label: 'Rejeitado', variant: 'destructive' },
  SUSPENDED: { label: 'Suspenso', variant: 'outline' },
}

export function DocumentStatusBadge({
  status,
}: {
  status: VerificationStatus
}) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
