import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

/**
 * Input class — Figma node 3107:3489 spec.
 *   - 48px tall, 16px text, gray-300 border, 8px radius
 *   - White bg, gray-400 placeholder
 *   - Brand-base focus border + ring
 *   - Pads 13px horizontal; if used with a leading icon, callers add `pl-11`.
 */
export const authInputCls = cn(
  'border-input bg-background text-foreground rounded-input flex h-12 w-full border px-[13px] text-[16px] font-normal',
  'placeholder:text-muted-foreground placeholder:font-normal',
  'focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none',
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30',
  'disabled:bg-input-disabled-bg disabled:cursor-not-allowed disabled:opacity-60',
)

interface AuthFieldProps {
  label: string
  error?: string
  /** Helper text below the input (e.g. "A senha deve ter no mínimo 8 caracteres"). Hidden when an error is shown. */
  hint?: string
  children: ReactNode
}

export function AuthField({ label, error, hint, children }: AuthFieldProps) {
  return (
    <div data-slot="auth-field" className="flex flex-col gap-2">
      <label className="text-foreground text-[14px] leading-[20px] font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-destructive text-[13px] font-medium">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-[12px] leading-[16px]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
