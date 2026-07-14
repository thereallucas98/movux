import { Tag, type TagProps } from '~/components/ui/tag'

export type CompositionStatus = 'MATCH' | 'MISMATCH' | 'UNKNOWN'

const MAP: Record<
  CompositionStatus,
  { label: string; category: TagProps['category'] }
> = {
  MATCH: { label: 'Combina', category: 'green' },
  MISMATCH: { label: 'Não combina', category: 'orange' },
  UNKNOWN: { label: 'Sem dados', category: 'gray' },
}

export function CompositionMatchTag({ status }: { status: CompositionStatus }) {
  const meta = MAP[status]
  return <Tag category={meta.category}>{meta.label}</Tag>
}
