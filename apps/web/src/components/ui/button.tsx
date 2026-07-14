import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '~/lib/utils'

/**
 * Button — Financy style guide §5.2 Label Button.
 *
 * Variants:
 *   - solid    (filled, primary CTA)
 *   - outline  (bordered, secondary CTA)
 *   - ghost    (transparent, tertiary action)
 *   - destructive (filled red, dangerous CTA)
 *   - link     (inline text)
 *
 * Sizes (per Figma):
 *   - md (default) → h-12 (48px), text-sm  — primary CTA size
 *   - sm           → h-9  (36px), text-xs  — compact, in-row actions
 *   - icon         → square h-10 (40px) for icon-only buttons
 *
 * Disabled is conveyed via the native `disabled` attribute; styling is
 * applied through the `disabled:` Tailwind variant on the base classes.
 */
export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        solid:
          'rounded-button bg-primary text-primary-foreground hover:bg-primary-hover',
        outline:
          'rounded-button border border-secondary-border bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'rounded-button text-foreground hover:bg-accent',
        destructive:
          'rounded-button bg-destructive text-destructive-foreground hover:opacity-90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        md: 'h-12 px-4 text-sm [&_svg]:size-4',
        sm: 'h-9 px-3 text-xs [&_svg]:size-3.5',
        icon: 'h-10 w-10 [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'solid',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
