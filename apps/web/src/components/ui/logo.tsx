import type { ComponentProps } from 'react'
import { cn } from '~/lib/utils'

interface LogoProps extends ComponentProps<'div'> {
  /** Reserved for parity with template callers; logo is text-only by default */
  iconOnly?: boolean
}

function Logo({ className, ...props }: LogoProps) {
  return (
    <div
      className={cn('text-xl font-extrabold tracking-tight', className)}
      {...props}
    >
      Movux
    </div>
  )
}

export { Logo }
