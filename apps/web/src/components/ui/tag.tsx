import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '~/lib/utils'

/**
 * Tag — Financy style guide §5.6.
 *
 * 8 categorical variants. Each pairs a light background with a dark
 * foreground for readability on light surfaces. Use Tag for status
 * pills, role chips, and category markers.
 */
export const tagVariants = cva(
  'inline-flex items-center gap-1 rounded-badge px-2.5 py-0.5 text-xs font-semibold leading-none whitespace-nowrap',
  {
    variants: {
      category: {
        gray: 'bg-gray-200 text-gray-700',
        blue: 'bg-blue-light text-blue-dark',
        purple: 'bg-purple-light text-purple-dark',
        pink: 'bg-pink-light text-pink-dark',
        red: 'bg-red-light text-red-dark',
        orange: 'bg-orange-light text-orange-dark',
        yellow: 'bg-yellow-light text-yellow-dark',
        green: 'bg-green-light text-green-dark',
      },
    },
    defaultVariants: {
      category: 'gray',
    },
  },
)

export interface TagProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, category, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(tagVariants({ category }), className)}
      {...props}
    />
  ),
)
Tag.displayName = 'Tag'

export { Tag }
