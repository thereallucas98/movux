'use client'

import { Toggle } from '~/components/ui/toggle'
import type { ReviewerRole } from '~/graphql/generated/types'
import { useReviewTagOptions } from '~/graphql/hooks/use-review-tag-options'
import { cn } from '~/lib/utils'

interface Props {
  targetRole: ReviewerRole
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

// Achado #10 da QA momento-zero — tags de complemento pra avaliação, além da
// nota em estrelas. `targetRole` é o papel de quem está SENDO avaliado (não
// de quem avalia): customer avaliando carrier busca tags CARRIER, e vice-versa.
export function ReviewTagPicker({
  targetRole,
  value,
  onChange,
  disabled = false,
}: Props) {
  const { data: tags = [], isLoading } = useReviewTagOptions(targetRole)

  function toggleTag(tagId: string) {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId))
    } else {
      onChange([...value, tagId])
    }
  }

  if (isLoading || tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        if (!tag?.id) return null
        const pressed = value.includes(tag.id)
        return (
          <Toggle
            key={tag.id}
            type="button"
            variant="outline"
            size="sm"
            pressed={pressed}
            onPressedChange={() => toggleTag(tag.id ?? '')}
            disabled={disabled}
            className={cn(
              pressed && 'bg-primary text-primary-foreground hover:bg-primary',
            )}
          >
            {tag.label}
          </Toggle>
        )
      })}
    </div>
  )
}
