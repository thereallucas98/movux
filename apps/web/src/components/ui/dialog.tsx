'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'
import { cn } from '~/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
      className,
    )}
    onPointerDown={(e) => {
      const target = e.target as HTMLElement
      if (
        target.closest('[data-radix-popover-content]') ||
        target.closest('[data-slot="calendar"]') ||
        target.closest('[role="gridcell"]')
      ) {
        e.preventDefault()
      }
    }}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const hasCustomMaxWidth = className?.includes('max-w-')

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Base
          'border-border bg-background fixed z-50 grid gap-4 border p-6 pb-6 shadow-lg duration-200',
          // Desktop: centred modal
          'lg:data-[state=closed]:zoom-out-95 lg:data-[state=open]:zoom-in-95',
          'lg:data-[state=closed]:slide-out-to-left-1/2 lg:data-[state=closed]:slide-out-to-top-[48%]',
          'lg:data-[state=open]:slide-in-from-left-1/2 lg:data-[state=open]:slide-in-from-top-[48%]',
          'lg:rounded-card lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
          !hasCustomMaxWidth && 'lg:w-[90vw] lg:max-w-md',
          // Mobile / tablet: bottom sheet
          'max-lg:data-[state=open]:animate-in max-lg:data-[state=closed]:animate-out',
          'max-lg:data-[state=closed]:slide-out-to-bottom max-lg:data-[state=open]:slide-in-from-bottom',
          'max-lg:top-auto max-lg:bottom-0 max-lg:left-0 max-lg:w-full max-lg:max-w-none',
          'max-lg:max-h-[90vh] max-lg:translate-x-0 max-lg:translate-y-0',
          'max-lg:rounded-t-card max-lg:overflow-y-auto',
          'max-lg:border-t max-lg:border-r-0 max-lg:border-b-0 max-lg:border-l-0',
          'max-md:px-4',
          className,
        )}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (
            target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('[data-radix-popover-content]') ||
            target.closest('[role="gridcell"]') ||
            target.closest('[data-slot="calendar"]')
          ) {
            e.preventDefault()
          }
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
    {...props}
  />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      className,
    )}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-foreground text-lg leading-none font-bold tracking-tight',
      className,
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
