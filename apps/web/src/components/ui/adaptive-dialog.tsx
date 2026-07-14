'use client'

import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { useIsMobile } from '~/hooks/use-is-mobile'
import { useIsMobileOrTablet } from '~/hooks/use-is-mobile-or-tablet'

type Breakpoint = 'mobile' | 'mobileOrTablet'

interface AdaptiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /**
   * Which breakpoint drives the mobile/desktop swap.
   * - `'mobile'` (default): uses useIsMobile (≤720px)
   * - `'mobileOrTablet'`: uses useIsMobileOrTablet (≤1023px)
   */
  breakpoint?: Breakpoint
  /**
   * Optional Tailwind classes appended to the dialog content (desktop only).
   * Useful to widen the modal — e.g. `lg:max-w-2xl` for content with a 2-month
   * range calendar.
   */
  contentClassName?: string
}

export function AdaptiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  breakpoint = 'mobile',
  contentClassName,
}: AdaptiveDialogProps) {
  const isMobile = useIsMobile()
  const isMobileOrTablet = useIsMobileOrTablet()
  const useSheet = breakpoint === 'mobile' ? isMobile : isMobileOrTablet

  if (useSheet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="py-2">{children}</div>
          {footer && <SheetFooter>{footer}</SheetFooter>}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div>{children}</div>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
