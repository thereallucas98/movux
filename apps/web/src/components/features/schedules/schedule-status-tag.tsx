import { Tag, type TagProps } from '~/components/ui/tag'

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'

const STATUS_MAP: Record<
  ScheduleStatus,
  { label: string; category: TagProps['category'] }
> = {
  DRAFT: { label: 'Rascunho', category: 'gray' },
  PUBLISHED: { label: 'Publicada', category: 'blue' },
  CLOSED: { label: 'Encerrada', category: 'green' },
}

export function ScheduleStatusTag({ status }: { status: ScheduleStatus }) {
  const meta = STATUS_MAP[status] ?? {
    label: status,
    category: 'gray' as const,
  }
  return <Tag category={meta.category}>{meta.label}</Tag>
}
