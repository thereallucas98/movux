import type { ReactNode } from 'react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '~/components/ui/empty'
import { cn } from '~/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  /** Action buttons or links rendered below the description */
  children?: ReactNode
  className?: string
}

/**
 * Simple empty state for "no results" sections.
 *
 * @example
 * <EmptyState title="Nenhum item encontrado" description="Tente ajustar os filtros.">
 *   <Button onClick={clearFilters}>Limpar filtros</Button>
 * </EmptyState>
 */
export function EmptyState({
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn('bg-muted/40', className)}>
      <EmptyHeader>
        <EmptyTitle className="text-lg font-semibold sm:text-xl">
          {title}
        </EmptyTitle>

        {description && (
          <EmptyDescription className="text-muted-foreground text-sm sm:text-base">
            {description}
          </EmptyDescription>
        )}
      </EmptyHeader>

      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}
