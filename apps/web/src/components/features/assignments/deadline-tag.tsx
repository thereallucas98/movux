'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Tag, type TagProps } from '~/components/ui/tag'

interface Props {
  deadline: Date | string
}

function deadlineMeta(deadline: Date): {
  label: string
  category: TagProps['category']
} {
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()
  if (diffMs < 0) return { label: 'Expirado', category: 'red' }
  const relative = formatDistanceToNow(deadline, {
    addSuffix: true,
    locale: ptBR,
  })
  const hoursLeft = diffMs / (1000 * 60 * 60)
  if (hoursLeft < 24) return { label: relative, category: 'red' }
  return { label: relative, category: 'gray' }
}

export function DeadlineTag({ deadline }: Props) {
  const date = typeof deadline === 'string' ? new Date(deadline) : deadline
  const meta = deadlineMeta(date)
  return <Tag category={meta.category}>{meta.label}</Tag>
}
