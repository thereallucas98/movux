import { Tag, type TagProps } from '~/components/ui/tag'

export type AssignmentStatus =
  | 'PENDING_ACCEPT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'TRANSFERRED'
  | 'PENDING_CLOSURE'
  | 'COMPLETED'

const MAP: Record<
  AssignmentStatus,
  { label: string; category: TagProps['category'] }
> = {
  PENDING_ACCEPT: { label: 'Pendente', category: 'yellow' },
  ACCEPTED: { label: 'Aceito', category: 'green' },
  REJECTED: { label: 'Rejeitado', category: 'red' },
  EXPIRED: { label: 'Expirado', category: 'gray' },
  CANCELLED: { label: 'Cancelado', category: 'gray' },
  TRANSFERRED: { label: 'Transferido', category: 'blue' },
  PENDING_CLOSURE: { label: 'Aguardando fechamento', category: 'orange' },
  COMPLETED: { label: 'Concluído', category: 'green' },
}

export function AssignmentStatusTag({ status }: { status: AssignmentStatus }) {
  const meta = MAP[status] ?? { label: status, category: 'gray' as const }
  return <Tag category={meta.category}>{meta.label}</Tag>
}
