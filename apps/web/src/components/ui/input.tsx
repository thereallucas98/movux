import * as React from 'react'

import { cn } from '~/lib/utils'

/**
 * Input — Financy style guide §5.1.
 *
 * 6 states encoded via native attributes / props:
 *   - empty    → no value
 *   - active   → :focus-visible (border + ring)
 *   - filled   → has value (no styling diff vs empty)
 *   - error    → `error` prop OR `aria-invalid="true"` (border-destructive)
 *   - disabled → native `disabled`
 *   - select   → use `<Select>` from `~/components/ui/select`
 *
 * Mobile-first: `h-12` keeps the touch target ≥ 48px (CLAUDE.md).
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={error ? true : props['aria-invalid']}
        className={cn(
          'rounded-input bg-background text-input-foreground flex h-12 w-full border px-4 text-sm font-normal transition-colors',
          'placeholder:text-input-placeholder placeholder:font-normal',
          'border-input',
          'focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'disabled:bg-input-disabled-bg disabled:cursor-not-allowed disabled:opacity-60',
          'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
