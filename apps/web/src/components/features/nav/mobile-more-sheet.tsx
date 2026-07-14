'use client'

import { AnimatePresence, motion, type Variants } from 'framer-motion'
import {
  Building2,
  Inbox,
  LogOut,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { cn } from '~/lib/utils'

import type { SidebarWorkspace } from './sidebar'
import { WorkspaceSwitcher } from './workspace-switcher'

interface MobileMoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: SidebarWorkspace[]
  currentWorkspace: SidebarWorkspace
}

interface NavLinkRow {
  Icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'danger'
}

const OVERLAY_BG: string =
  'linear-gradient(135deg, var(--brand-base) 0%, var(--brand-dark) 100%)'

const UNDERLAY_VARIANTS: Variants = {
  open: {
    width: '100vw',
    height: '100dvh',
    transition: { type: 'spring', mass: 2, stiffness: 360, damping: 40 },
  },
  closed: {
    width: 0,
    height: 0,
    transition: {
      delay: 0.4,
      type: 'spring',
      mass: 2,
      stiffness: 360,
      damping: 40,
    },
  },
}

export function MobileMoreSheet({
  open,
  onOpenChange,
  workspaces,
  currentWorkspace,
}: MobileMoreSheetProps) {
  const router = useRouter()
  const [showWorkspaceList, setShowWorkspaceList] = useState<boolean>(false)

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    onOpenChange(false)
    router.replace('/login')
  }

  function handleClose(): void {
    setShowWorkspaceList(false)
    onOpenChange(false)
  }

  const rows: NavLinkRow[] = [
    {
      Icon: Inbox,
      label: 'Solicitações',
      href: '/requests',
      onClick: handleClose,
    },
    {
      Icon: Settings,
      label: 'Configurações',
      href: '/settings',
      onClick: handleClose,
    },
    {
      Icon: Building2,
      label: 'Trocar workspace',
      onClick: () => setShowWorkspaceList(true),
    },
    {
      Icon: LogOut,
      label: 'Sair',
      variant: 'danger',
      onClick: handleLogout,
    },
  ]

  return (
    <>
      {/* Brand-gradient underlay that springs from 0 → full viewport */}
      <motion.div
        initial={false}
        animate={open ? 'open' : 'closed'}
        variants={UNDERLAY_VARIANTS}
        aria-hidden
        style={{ background: OVERLAY_BG, top: 0, left: 0 }}
        className="fixed z-30 overflow-hidden"
      />

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.25 } }}
            exit={{ opacity: 0 }}
            aria-label="Menu mobile"
            className="fixed inset-0 z-40 flex h-dvh w-full flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            {showWorkspaceList ? (
              <WorkspacePane
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                onClose={handleClose}
                onBack={() => setShowWorkspaceList(false)}
              />
            ) : (
              <LinksPane rows={rows} onClose={handleClose} />
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}

interface LinksPaneProps {
  rows: NavLinkRow[]
  onClose: () => void
}

function LinksPane({ rows, onClose }: LinksPaneProps) {
  return (
    <>
      {/* Top header: workspace name + close visual handled by external trigger */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: { delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        }}
        exit={{ opacity: 0, y: -12 }}
        className="px-6 pt-6"
      >
        <p className="text-sm font-semibold tracking-wider text-white/70 uppercase">
          Menu
        </p>
        <p className="mt-1 text-2xl font-bold text-white">Tá na Movux.</p>
      </motion.div>

      <div className="flex flex-1 flex-col justify-center gap-3 px-6">
        {rows.map((row, idx) => (
          <MobileNavLink
            key={row.label}
            row={row}
            idx={idx}
            onClose={onClose}
          />
        ))}
      </div>
    </>
  )
}

interface MobileNavLinkProps {
  row: NavLinkRow
  idx: number
  onClose: () => void
}

function MobileNavLink({ row, idx, onClose }: MobileNavLinkProps) {
  const Icon = row.Icon
  const isDanger = row.variant === 'danger'
  const className = cn(
    'group flex cursor-pointer items-center gap-4 rounded-[14px] px-4 py-4 text-3xl font-bold tracking-tight transition-colors md:text-4xl',
    isDanger
      ? 'text-white/80 hover:bg-white/10 hover:text-white'
      : 'text-white/85 hover:bg-white/15 hover:text-white',
  )

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'flex size-12 items-center justify-center rounded-full bg-white/15',
          'transition-colors group-hover:bg-white/25',
        )}
      >
        <Icon className="size-6" />
      </span>
      <span>{row.label}.</span>
    </>
  )

  const animationProps = {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        delay: 0.5 + idx * 0.08,
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
    exit: { opacity: 0, x: -20 },
  }

  if (row.href) {
    return (
      <motion.div {...animationProps}>
        <Link
          href={row.href}
          onClick={() => {
            row.onClick?.()
            onClose()
          }}
          className={className}
        >
          {content}
        </Link>
      </motion.div>
    )
  }
  return (
    <motion.button
      type="button"
      onClick={() => row.onClick?.()}
      className={className}
      {...animationProps}
    >
      {content}
    </motion.button>
  )
}

interface WorkspacePaneProps {
  workspaces: SidebarWorkspace[]
  currentWorkspace: SidebarWorkspace
  onClose: () => void
  onBack: () => void
}

function WorkspacePane({
  workspaces,
  currentWorkspace,
  onClose,
  onBack,
}: WorkspacePaneProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="flex flex-1 flex-col gap-4 px-6 pt-8"
    >
      <button
        type="button"
        onClick={onBack}
        className="cursor-pointer self-start text-sm font-semibold text-white/70 hover:text-white"
      >
        ← Voltar
      </button>
      <h2 className="text-3xl font-bold text-white">Trocar workspace</h2>
      <div className="bg-background/95 mt-3 rounded-[16px] p-3">
        <WorkspaceSwitcher
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          variant="list"
          onSelected={onClose}
        />
      </div>
    </motion.div>
  )
}
