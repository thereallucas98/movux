import { Tag, type TagProps } from '~/components/ui/tag'

export type ShiftAssignmentMode = 'DIRECT_ASSIGN' | 'OPEN_FOR_APPLY'

const MODE_MAP: Record<
  ShiftAssignmentMode,
  { label: string; category: TagProps['category'] }
> = {
  DIRECT_ASSIGN: { label: 'Atribuição direta', category: 'blue' },
  OPEN_FOR_APPLY: { label: 'Aberto para inscrição', category: 'orange' },
}

export function ShiftAssignmentModeTag({
  mode,
}: {
  mode: ShiftAssignmentMode
}) {
  const meta = MODE_MAP[mode] ?? {
    label: mode,
    category: 'gray' as const,
  }
  return <Tag category={meta.category}>{meta.label}</Tag>
}
