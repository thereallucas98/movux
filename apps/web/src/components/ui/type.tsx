import { cva, type VariantProps } from 'class-variance-authority'
import { Check, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '~/lib/utils'

/**
 * Type — Financy style guide §5.7 (semantic feedback line).
 *
 * Inline status text used below inputs for validation feedback or in
 * toasts. Two variants:
 *   - success → green with Check icon
 *   - danger  → red with X icon
 */
export const typeVariants = cva(
  'inline-flex items-center gap-1.5 text-sm font-medium leading-none',
  {
    variants: {
      variant: {
        success: 'text-success',
        danger: 'text-destructive',
      },
    },
    defaultVariants: {
      variant: 'success',
    },
  },
)

export interface TypeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof typeVariants> {
  icon?: React.ReactNode
}

const Type = React.forwardRef<HTMLSpanElement, TypeProps>(
  ({ className, variant, icon, children, ...props }, ref) => {
    const defaultIcon = variant === 'danger' ? <X /> : <Check />
    return (
      <span
        ref={ref}
        className={cn(typeVariants({ variant }), className)}
        {...props}
      >
        <span className="[&_svg]:size-3.5 [&_svg]:shrink-0">
          {icon ?? defaultIcon}
        </span>
        <span>{children}</span>
      </span>
    )
  },
)
Type.displayName = 'Type'

export { Type }
