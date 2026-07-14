'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  LayoutDashboard,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import { cn } from '~/lib/utils'

type TabId = 'schedules' | 'requests' | 'notifications' | 'tracking'

interface TabDef {
  id: TabId
  label: string
  Icon: LucideIcon
  url: string
}

const TABS: readonly TabDef[] = [
  {
    id: 'schedules',
    label: 'Escalas',
    Icon: CalendarDays,
    url: 'movux.app/escalas',
  },
  {
    id: 'requests',
    label: 'Solicitações',
    Icon: Inbox,
    url: 'movux.app/solicitacoes',
  },
  {
    id: 'notifications',
    label: 'Notificações',
    Icon: BellRing,
    url: 'movux.app/notificacoes',
  },
  { id: 'tracking', label: 'Ponto', Icon: Timer, url: 'movux.app/ponto' },
] as const

export function LandingHeroPreview() {
  const [active, setActive] = useState<TabId>('schedules')
  const tab = TABS.find((t) => t.id === active) ?? TABS[0]

  return (
    <div className="border-border/60 bg-background relative mx-auto max-w-5xl overflow-hidden rounded-[24px] border shadow-2xl">
      {/* Top "browser" bar */}
      <div className="border-border/60 flex items-center gap-1.5 border-b bg-gray-100/80 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <span className="text-muted-foreground ml-3 text-xs">{tab.url}</span>
      </div>

      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <Sidebar active={active} />

        <div className="bg-background flex min-h-[420px] flex-col">
          {/* Tab strip — visible on all viewports so the demo is interactive */}
          <div className="border-border/60 flex items-center gap-1 overflow-x-auto border-b px-3 py-2">
            {TABS.map((t) => {
              const isOn = t.id === active
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    isOn
                      ? 'text-white'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                  style={isOn ? { background: 'var(--brand-base)' } : undefined}
                >
                  <t.Icon className="size-3.5" aria-hidden />
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="relative flex-1 overflow-hidden p-5 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {active === 'schedules' && <SchedulesPanel />}
                {active === 'requests' && <RequestsPanel />}
                {active === 'notifications' && <NotificationsPanel />}
                {active === 'tracking' && <TrackingPanel />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  active: TabId
}

function Sidebar({ active }: SidebarProps) {
  const items: ReadonlyArray<{
    label: string
    Icon: LucideIcon
    tabId?: TabId
    badge?: string
  }> = [
    { label: 'Dashboard', Icon: LayoutDashboard },
    { label: 'Escalas', Icon: CalendarDays, tabId: 'schedules' },
    { label: 'Turnos', Icon: Clock },
    { label: 'Solicitações', Icon: Inbox, tabId: 'requests' },
    {
      label: 'Notificações',
      Icon: BellRing,
      tabId: 'notifications',
      badge: '3',
    },
    { label: 'Ponto', Icon: Timer, tabId: 'tracking' },
  ]
  return (
    <aside className="border-border/60 bg-muted/30 hidden flex-col gap-1 border-r p-4 text-sm md:flex">
      <div className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
        Workspace
      </div>
      <div className="bg-background/80 mb-3 rounded-[8px] px-3 py-2 text-xs font-semibold">
        Hospital Acme — Centro
      </div>
      {items.map((item) => {
        const isActive = item.tabId !== undefined && item.tabId === active
        return (
          <div
            key={item.label}
            className={cn(
              'flex items-center justify-between rounded-[6px] px-3 py-2 text-sm',
              isActive && 'bg-background font-semibold shadow-sm',
            )}
          >
            <span className="flex items-center gap-2">
              <item.Icon
                className="size-4 shrink-0"
                style={isActive ? { color: 'var(--brand-base)' } : undefined}
              />
              {item.label}
            </span>
            {item.badge && (
              <span
                className="rounded-full px-1.5 text-[10px] leading-[18px] font-bold text-white"
                style={{ background: 'var(--brand-base)' }}
              >
                {item.badge}
              </span>
            )}
          </div>
        )
      })}
    </aside>
  )
}

/* ─────────────────────────── Schedules panel ─────────────────────────── */

function SchedulesPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Escala UTI — Maio 2026
          </h3>
          <p className="text-muted-foreground text-xs">
            01/05 → 15/05 · 6 turnos · 4 colaboradores
          </p>
        </div>
        <BrandTag>PUBLICADA</BrandTag>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            title: '02/05 · Diurno',
            tag: 'Atribuído',
            people: '2/2',
            tone: 'on' as const,
          },
          {
            title: '03/05 · Diurno',
            tag: 'Pendente',
            people: '1/2',
            tone: 'partial' as const,
          },
          {
            title: '04/05 · Cobertura',
            tag: 'Abertos p/ candidatos',
            people: '0/1',
            tone: 'open' as const,
          },
          {
            title: '05/05 · Diurno',
            tag: '2 candidatos na fila',
            people: '0/2',
            tone: 'open' as const,
          },
        ].map((row) => (
          <div
            key={row.title}
            className="border-border/70 bg-background flex items-center justify-between rounded-[10px] border p-3 text-sm"
          >
            <span className="text-foreground font-medium">{row.title}</span>
            <span className="flex items-center gap-2 text-xs">
              <StatusPill tone={row.tone}>{row.tag}</StatusPill>
              <span className="text-muted-foreground font-mono">
                {row.people}
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────── Requests panel ─────────────────────────── */

function RequestsPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Inbox de solicitações
          </h3>
          <p className="text-muted-foreground text-xs">
            3 pendentes · UTI Centro
          </p>
        </div>
        <BrandTag>3 PENDENTES</BrandTag>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          {
            who: 'Maria Silva',
            kind: 'Troca',
            detail: 'Pediu troca do plantão de 02/05 com João Santos.',
          },
          {
            who: 'Ana Costa',
            kind: 'Oferta',
            detail: 'Quer ceder a cobertura do dia 04/05.',
          },
          {
            who: 'João Santos',
            kind: 'Folga',
            detail: 'Solicitou folga 10–12/05 (com atestado).',
          },
        ].map((row) => (
          <li
            key={row.who}
            className="border-border/70 flex items-start gap-3 rounded-[10px] border p-3 text-sm"
          >
            <Avatar initials={initialsOf(row.who)} />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-foreground font-semibold">
                {row.who}
                <span
                  className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: 'rgba(31,111,67,0.12)',
                    color: 'var(--brand-dark)',
                  }}
                >
                  {row.kind}
                </span>
              </p>
              <p className="text-muted-foreground text-xs">{row.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ─────────────────────────── Notifications panel ─────────────────────────── */

function NotificationsPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Notificações
          </h3>
          <p className="text-muted-foreground text-xs">3 não lidas</p>
        </div>
        <BrandTag>EM TEMPO REAL</BrandTag>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          {
            who: 'Maria Silva',
            line: 'aceitou o turno de 02/05 (Diurno UTI 1).',
            unread: true,
          },
          {
            who: 'João Santos',
            line: 'rejeitou a atribuição de 02/05 — viajando.',
            unread: true,
          },
          {
            who: 'Ana Costa',
            line: 'candidatou-se ao plantão aberto 05/05.',
            unread: true,
          },
          {
            who: 'Sistema',
            line: 'Escala UTI — Maio 2026 foi publicada.',
            unread: false,
          },
        ].map((row) => (
          <li
            key={row.who + row.line}
            className="border-border/70 flex items-start gap-3 rounded-[10px] border p-3 text-sm"
          >
            <Avatar initials={initialsOf(row.who)} />
            <div className="flex flex-1 flex-col">
              <p className="text-foreground text-xs">
                <span className="font-semibold">{row.who}</span> {row.line}
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                há poucos minutos
              </p>
            </div>
            {row.unread && (
              <span
                aria-label="Não lida"
                className="mt-1 inline-block size-2 shrink-0 rounded-full"
                style={{ background: 'var(--brand-base)' }}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

/* ─────────────────────────── Tracking panel ─────────────────────────── */

function TrackingPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Folha de ponto — semana
          </h3>
          <p className="text-muted-foreground text-xs">
            4 colaboradores · 132h registradas
          </p>
        </div>
        <BrandTag>CSV PRONTO</BrandTag>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          {
            who: 'Maria Silva',
            shift: '02/05 · 08h–17h',
            delta: '+5min',
            ok: true,
          },
          {
            who: 'João Santos',
            shift: '02/05 · 20h–08h',
            delta: 'no horário',
            ok: true,
          },
          {
            who: 'Ana Costa',
            shift: '04/05 · 08h–20h',
            delta: 'aberto',
            ok: true,
          },
          {
            who: 'Lucas Andrade',
            shift: '06/05 · 08h–20h',
            delta: 'aguardando',
            ok: false,
          },
        ].map((row) => (
          <li
            key={row.who}
            className="border-border/70 flex items-center gap-3 rounded-[10px] border p-3 text-sm"
          >
            <Avatar initials={initialsOf(row.who)} />
            <div className="flex flex-1 flex-col">
              <p className="text-foreground text-xs font-semibold">{row.who}</p>
              <p className="text-muted-foreground text-[11px]">{row.shift}</p>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
              )}
              style={{
                background: row.ok ? 'rgba(31,111,67,0.12)' : 'var(--gray-200)',
                color: row.ok ? 'var(--brand-dark)' : 'var(--gray-700)',
              }}
            >
              {row.ok && <CheckCircle2 className="size-3" />}
              {row.delta}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ─────────────────────────── Helpers ─────────────────────────── */

interface BrandTagProps {
  children: React.ReactNode
}

function BrandTag({ children }: BrandTagProps) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        background: 'rgba(31, 111, 67, 0.12)',
        color: 'var(--brand-dark)',
      }}
    >
      {children}
    </span>
  )
}

interface StatusPillProps {
  tone: 'on' | 'partial' | 'open'
  children: React.ReactNode
}

function StatusPill({ tone, children }: StatusPillProps) {
  const map: Record<StatusPillProps['tone'], { bg: string; fg: string }> = {
    on: { bg: 'rgba(31,111,67,0.12)', fg: 'var(--brand-dark)' },
    partial: {
      bg: 'rgba(31,111,67,0.08)',
      fg: 'var(--gray-700)',
    },
    open: { bg: 'var(--gray-100)', fg: 'var(--gray-700)' },
  }
  const m = map[tone]
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
    >
      {children}
    </span>
  )
}

interface AvatarProps {
  initials: string
}

function Avatar({ initials }: AvatarProps) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ background: 'var(--brand-base)' }}
    >
      {initials}
    </span>
  )
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Re-exported so older landing imports keep working if any survive. */
export const _USERS_ICON: LucideIcon = Users
