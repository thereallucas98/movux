'use client'

import { motion } from 'framer-motion'
import { ChevronsLeft, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { useUnreadNotificationCount } from '~/components/features/notifications/_hooks/use-unread-count'
import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { IconButton } from '~/components/ui/icon-button'
import { Logo } from '~/components/ui/logo'
import { cn } from '~/lib/utils'

import { PRIMARY_NAV_ITEMS, type BadgeKind, type NavItem } from './nav-items'
import { useSidebarCollapse } from './use-sidebar-collapse'
import { WorkspaceSwitcher } from './workspace-switcher'

export interface SidebarMe {
  id: string
  fullName: string
  role: string
}

export interface SidebarWorkspace {
  id: string
  name: string
  tenantId: string
}

interface SidebarProps {
  me: SidebarMe
  workspaces: SidebarWorkspace[]
  currentWorkspace: SidebarWorkspace
  className?: string
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  COORDENADOR: 'Coordenador',
  COLABORADOR: 'Colaborador',
  ESTAGIARIO: 'Estagiário',
}

function initialsFor(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function useBadgeValue(kind: BadgeKind | undefined): number | undefined {
  // Hooks must run unconditionally; we still call them but ignore the result
  // when the kind is not the one we handle.
  const unread = useUnreadNotificationCount()
  if (kind === 'notifications-unread') return unread.data?.count
  return undefined
}

export function Sidebar({
  me,
  workspaces,
  currentWorkspace,
  className,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { collapsed, setCollapsed } = useSidebarCollapse()

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.replace('/login')
  }

  return (
    <motion.aside
      layout
      className={cn(
        'border-border bg-background relative flex min-h-dvh flex-col border-r p-3 md:w-16',
        collapsed ? 'lg:w-16 lg:p-3' : 'lg:w-64 lg:p-4',
        className,
      )}
      data-slot="sidebar"
      data-collapsed={collapsed}
      transition={{ type: 'spring', mass: 1, stiffness: 380, damping: 38 }}
    >
      <div className="mb-6 flex flex-col gap-3">
        <Logo
          className={cn(
            'text-foreground hidden',
            collapsed ? 'lg:hidden' : 'lg:block',
          )}
        />
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          collapsed={collapsed}
        />
      </div>

      <nav
        aria-label="Navegação principal"
        className="flex flex-1 flex-col gap-1"
      >
        {PRIMARY_NAV_ITEMS.map((item) => (
          <SidebarNavLink
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div
        className={cn(
          'border-border mt-4 flex items-center gap-3 border-t pt-4',
          collapsed && 'lg:flex-col',
        )}
      >
        <Link
          href="/profile"
          aria-label="Ver perfil"
          className="hover:bg-accent flex min-w-0 flex-1 items-center gap-3 rounded-sm transition-colors lg:px-1 lg:py-1"
        >
          <Avatar size="sm">
            <AvatarFallback>{initialsFor(me.fullName)}</AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'hidden min-w-0 flex-1',
              collapsed ? 'lg:hidden' : 'lg:block',
            )}
          >
            <p className="text-foreground truncate text-sm font-semibold">
              {me.fullName}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {ROLE_LABELS[me.role] ?? me.role}
            </p>
          </div>
        </Link>
        <IconButton
          variant="outline"
          size="sm"
          aria-label="Sair"
          onClick={handleLogout}
        >
          <LogOut />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={
          collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
        }
        aria-pressed={collapsed}
        className="border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground absolute -right-3 bottom-20 hidden size-7 cursor-pointer items-center justify-center rounded-full border shadow-sm transition-colors lg:flex"
      >
        <motion.span
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex"
        >
          <ChevronsLeft className="size-4" />
        </motion.span>
      </button>
    </motion.aside>
  )
}

interface SidebarNavLinkProps {
  item: NavItem
  isActive: boolean
  collapsed: boolean
}

function SidebarNavLink({ item, isActive, collapsed }: SidebarNavLinkProps) {
  const Icon = item.icon
  const badgeValue = useBadgeValue(item.badge)
  const showBadge = badgeValue !== undefined && badgeValue > 0
  const label =
    badgeValue !== undefined && badgeValue > 9 ? '9+' : String(badgeValue ?? '')

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        isActive ? 'bg-accent text-foreground' : 'text-muted-foreground',
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className="size-5 shrink-0" />
        {showBadge && (
          <span
            aria-hidden
            className={cn(
              'absolute -top-1 -right-1 inline-flex size-2 rounded-full bg-blue-600 text-white',
              collapsed ? 'lg:inline-flex' : 'lg:hidden',
            )}
          />
        )}
      </span>
      <span
        className={cn('hidden flex-1', collapsed ? 'lg:hidden' : 'lg:inline')}
      >
        {item.label}
      </span>
      {showBadge && (
        <span
          aria-label={`${badgeValue} não lidas`}
          className={cn(
            'hidden min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] leading-[18px] font-bold text-white',
            collapsed ? 'lg:hidden' : 'lg:inline-flex',
          )}
        >
          {label}
        </span>
      )}
    </Link>
  )
}
