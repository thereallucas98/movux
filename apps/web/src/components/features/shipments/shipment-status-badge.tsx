import { Badge, type BadgeProps } from '~/components/ui/badge'
import type { ShipmentStatus } from '~/graphql/generated/types'

const STATUS_META: Record<
  ShipmentStatus,
  { label: string; variant: BadgeProps['variant'] }
> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  OPEN: { label: 'Aberto', variant: 'default' },
  PROPOSALS_RECEIVED: { label: 'Recebendo propostas', variant: 'default' },
  CARRIER_SELECTED: { label: 'Transportador selecionado', variant: 'default' },
  COLLECTED: { label: 'Coletado', variant: 'warning' },
  IN_TRANSIT: { label: 'Em trânsito', variant: 'warning' },
  DELIVERED: { label: 'Entregue', variant: 'success' },
  REVIEWED: { label: 'Avaliado', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  EXPIRED: { label: 'Expirado', variant: 'outline' },
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
