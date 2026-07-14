import { Tag, type TagProps } from '~/components/ui/tag'

export type RequestType = 'SWAP' | 'OFFER' | 'TIME_OFF'

const MAP: Record<
  RequestType,
  { label: string; category: TagProps['category'] }
> = {
  SWAP: { label: 'Troca', category: 'blue' },
  OFFER: { label: 'Oferta', category: 'purple' },
  TIME_OFF: { label: 'Folga', category: 'pink' },
}

export function RequestTypeTag({ type }: { type: RequestType }) {
  const meta = MAP[type]
  return <Tag category={meta.category}>{meta.label}</Tag>
}
