import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '~/lib/utils'

/**
 * Icon Button — Financy style guide §5.3.
 *
 * Variants: outline | danger.
 * Sizes:    md (32×32) | sm (28×28).
 *
 * Always pass `aria-label` (CLAUDE.md icon-only rule).
 */
export const iconButtonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        outline:
          'border border-input bg-background text-foreground hover:bg-accent',
        danger:
          'border border-destructive/30 bg-background text-destructive hover:bg-destructive/10',
      },
      size: {
        md: 'h-12 w-12 [&_svg]:size-4',
        sm: 'h-9 w-9 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'md',
    },
  },
)

export interface IconButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean
  'aria-label': string
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
IconButton.displayName = 'IconButton'

export { IconButton }
