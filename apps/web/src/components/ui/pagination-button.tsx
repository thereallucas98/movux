import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '~/lib/utils'

/**
 * Pagination Button — Financy style guide §5.5.
 *
 * Distinct from the existing shadcn `Pagination` composite (which uses
 * <a> with `buttonVariants`). This is the atomic 32×32 page-number cell:
 *   - default  → border + text-foreground
 *   - hover    → bg-accent
 *   - active   → bg-primary text-primary-foreground (current page)
 *   - disabled → opacity-50 (handled via :disabled)
 *
 * Use `aria-current="page"` on the active cell instead of toggling
 * `active` manually whenever possible.
 */
export const paginationButtonVariants = cva(
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5',
  {
    variants: {
      state: {
        default:
          'border border-input bg-background text-foreground hover:bg-accent aria-[current=page]:bg-primary aria-[current=page]:border-primary aria-[current=page]:text-primary-foreground',
        active:
          'bg-primary border border-primary text-primary-foreground hover:bg-primary-hover',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  },
)

export interface PaginationButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof paginationButtonVariants> {}

const PaginationButton = React.forwardRef<
  HTMLButtonElement,
  PaginationButtonProps
>(({ className, state, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(paginationButtonVariants({ state }), className)}
    {...props}
  />
))
PaginationButton.displayName = 'PaginationButton'

export { PaginationButton }
