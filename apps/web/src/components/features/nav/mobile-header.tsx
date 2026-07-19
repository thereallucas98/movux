'use client'

import { LogOut } from 'lucide-react'

import { IconButton } from '~/components/ui/icon-button'
import { Logo } from '~/components/ui/logo'
import { api } from '~/lib/api-client'
import { cn } from '~/lib/utils'

interface MobileHeaderProps {
  className?: string
}

export function MobileHeader({ className }: MobileHeaderProps) {
  async function handleLogout(): Promise<void> {
    await api.post('/api/auth/logout')
    window.location.href = '/login'
  }

  return (
    <header
      data-slot="mobile-header"
      className={cn(
        'border-border bg-background sticky top-0 z-50 flex items-center justify-between border-b px-4 pt-[env(safe-area-inset-top)] pb-3',
        className,
      )}
    >
      <Logo className="text-foreground" />
      <IconButton
        variant="outline"
        size="sm"
        aria-label="Sair"
        onClick={handleLogout}
      >
        <LogOut />
      </IconButton>
    </header>
  )
}
