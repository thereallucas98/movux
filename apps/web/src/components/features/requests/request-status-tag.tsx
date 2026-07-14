import { Tag, type TagProps } from '~/components/ui/tag'

export type RequestStatus =
  | 'PENDING_PEER'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

const MAP: Record<
  RequestStatus,
  { label: string; category: TagProps['category'] }
> = {
  PENDING_PEER: { label: 'Aguardando colega', category: 'yellow' },
  PENDING: { label: 'Aguardando aprovação', category: 'orange' },
  APPROVED: { label: 'Aprovado', category: 'green' },
  REJECTED: { label: 'Rejeitado', category: 'red' },
  CANCELLED: { label: 'Cancelado', category: 'gray' },
}

export function RequestStatusTag({ status }: { status: RequestStatus }) {
  const meta = MAP[status] ?? { label: status, category: 'gray' as const }
  return <Tag category={meta.category}>{meta.label}</Tag>
}
