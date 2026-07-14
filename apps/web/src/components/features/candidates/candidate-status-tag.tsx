import { Tag, type TagProps } from '~/components/ui/tag'

export type ShiftCandidateStatus =
  | 'QUEUED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'

const MAP: Record<
  ShiftCandidateStatus,
  { label: string; category: TagProps['category'] }
> = {
  QUEUED: { label: 'Na fila', category: 'yellow' },
  APPROVED: { label: 'Aprovado', category: 'green' },
  REJECTED: { label: 'Rejeitado', category: 'red' },
  WITHDRAWN: { label: 'Retirado', category: 'gray' },
}

export function CandidateStatusTag({
  status,
}: {
  status: ShiftCandidateStatus
}) {
  const meta = MAP[status] ?? { label: status, category: 'gray' as const }
  return <Tag category={meta.category}>{meta.label}</Tag>
}
