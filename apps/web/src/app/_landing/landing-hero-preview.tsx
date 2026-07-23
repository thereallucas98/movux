'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  Inbox,
  LayoutDashboard,
  Package,
  Route,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'

import { cn } from '~/lib/utils'

type TabId = 'shipments' | 'proposals' | 'transit' | 'reviews'

interface TabDef {
  id: TabId
  label: string
  Icon: LucideIcon
  url: string
}

const TABS: readonly TabDef[] = [
  {
    id: 'shipments',
    label: 'Fretes',
    Icon: Package,
    url: 'movux.app/fretes',
  },
  {
    id: 'proposals',
    label: 'Propostas',
    Icon: Inbox,
    url: 'movux.app/propostas',
  },
  {
    id: 'transit',
    label: 'Em trânsito',
    Icon: Route,
    url: 'movux.app/transito',
  },
  {
    id: 'reviews',
    label: 'Avaliações',
    Icon: Star,
    url: 'movux.app/avaliacoes',
  },
] as const

export function LandingHeroPreview() {
  const [active, setActive] = useState<TabId>('shipments')
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
                {active === 'shipments' && <ShipmentsPanel />}
                {active === 'proposals' && <ProposalsPanel />}
                {active === 'transit' && <TransitPanel />}
                {active === 'reviews' && <ReviewsPanel />}
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
    { label: 'Fretes', Icon: Package, tabId: 'shipments' },
    { label: 'Propostas', Icon: Inbox, tabId: 'proposals', badge: '3' },
    { label: 'Em trânsito', Icon: Route, tabId: 'transit' },
    { label: 'Avaliações', Icon: Star, tabId: 'reviews' },
  ]
  return (
    <aside className="border-border/60 bg-muted/30 hidden flex-col gap-1 border-r p-4 text-sm md:flex">
      <div className="text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase">
        Cliente
      </div>
      <div className="bg-background/80 mb-3 rounded-[8px] px-3 py-2 text-xs font-semibold">
        João Pessoa — Mudança residencial
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

/* ─────────────────────────── Shipments panel ─────────────────────────── */

function ShipmentsPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">Meus fretes</h3>
          <p className="text-muted-foreground text-xs">
            3 ativos · João Pessoa
          </p>
        </div>
        <BrandTag>3 EM ANDAMENTO</BrandTag>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            title: 'Centro → Manaíra',
            tag: 'Em trânsito',
            price: 'R$ 420,00',
            tone: 'on' as const,
          },
          {
            title: 'Bairro dos Estados',
            tag: 'Aguardando propostas',
            price: 'R$ 180,00 sug.',
            tone: 'partial' as const,
          },
          {
            title: 'Torre → Cabo Branco',
            tag: 'Coletado',
            price: 'R$ 65,00',
            tone: 'on' as const,
          },
          {
            title: 'Bessa',
            tag: 'Entregue',
            price: 'R$ 510,00',
            tone: 'done' as const,
          },
        ].map((row) => (
          <div
            key={row.title}
            className="border-border/70 bg-background flex flex-col gap-2 rounded-[10px] border p-3 text-sm"
          >
            <span className="text-foreground font-medium">{row.title}</span>
            <span className="flex items-center justify-between gap-2 text-xs">
              <StatusPill tone={row.tone}>{row.tag}</StatusPill>
              <span className="text-muted-foreground shrink-0 font-mono">
                {row.price}
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────── Proposals panel ─────────────────────────── */

function ProposalsPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Propostas recebidas
          </h3>
          <p className="text-muted-foreground text-xs">
            3 pendentes · Mudança residencial
          </p>
        </div>
        <BrandTag>3 PENDENTES</BrandTag>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          {
            who: 'Carlos Mendes',
            kind: 'Proposta',
            detail: 'Enviou proposta de R$ 400,00 — caminhão médio.',
          },
          {
            who: 'Fernanda Lima',
            kind: 'Contraproposta',
            detail: 'Contrapropôs R$ 380,00 após seu ajuste.',
          },
          {
            who: 'Roberto Alves',
            kind: 'Proposta',
            detail: 'Enviou proposta de R$ 450,00 — inclui embalagem.',
          },
        ].map((row) => (
          <li
            key={row.who}
            className="border-border/70 flex items-start gap-3 rounded-[10px] border p-3 text-sm"
          >
            <Avatar initials={initialsOf(row.who)} />
            <div className="flex flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-foreground font-semibold">{row.who}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase"
                  style={{
                    background:
                      'color-mix(in srgb, var(--brand-base) 12%, transparent)',
                    color: 'var(--brand-dark)',
                  }}
                >
                  {row.kind}
                </span>
              </span>
              <p className="text-muted-foreground text-xs">{row.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ─────────────────────────── Transit panel ─────────────────────────── */

function TransitPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">
            Frete #1234 — Em trânsito
          </h3>
          <p className="text-muted-foreground text-xs">
            Check-in de segurança confirmado
          </p>
        </div>
        <BrandTag>EM TEMPO REAL</BrandTag>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          {
            who: 'Sistema',
            line: 'Check-in de coleta confirmado por você e pelo transportador.',
            unread: false,
          },
          {
            who: 'Carlos Mendes',
            line: 'atualizou o status para Em trânsito.',
            unread: true,
          },
          {
            who: 'Sistema',
            line: 'Estimativa de entrega: hoje, até 18h.',
            unread: true,
          },
          {
            who: 'Sistema',
            line: 'Frete #1198 foi entregue e confirmado.',
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

/* ─────────────────────────── Reviews panel ─────────────────────────── */

function ReviewsPanel() {
  return (
    <>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-foreground text-lg font-semibold">Avaliações</h3>
          <p className="text-muted-foreground text-xs">
            4 fretes concluídos · nota média 4.8
          </p>
        </div>
        <BrandTag>1 PENDENTE</BrandTag>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          {
            who: 'Carlos Mendes',
            shift: 'Mudança residencial · 02/05',
            delta: '★★★★★',
            ok: true,
          },
          {
            who: 'Fernanda Lima',
            shift: 'Frete comercial · 28/04',
            delta: '★★★★☆',
            ok: true,
          },
          {
            who: 'Roberto Alves',
            shift: 'Entrega · 25/04',
            delta: 'aguardando avaliação',
            ok: false,
          },
          {
            who: 'Ana Torres',
            shift: 'Mudança residencial · 20/04',
            delta: '★★★★★',
            ok: true,
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
                background: row.ok
                  ? 'color-mix(in srgb, var(--brand-base) 12%, transparent)'
                  : 'var(--gray-200)',
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
      className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{
        background: 'color-mix(in srgb, var(--brand-base) 12%, transparent)',
        color: 'var(--brand-dark)',
      }}
    >
      {children}
    </span>
  )
}

interface StatusPillProps {
  tone: 'on' | 'partial' | 'done'
  children: React.ReactNode
}

function StatusPill({ tone, children }: StatusPillProps) {
  const map: Record<StatusPillProps['tone'], { bg: string; fg: string }> = {
    on: {
      bg: 'color-mix(in srgb, var(--brand-base) 12%, transparent)',
      fg: 'var(--brand-dark)',
    },
    partial: {
      bg: 'color-mix(in srgb, var(--yellow-base) 20%, transparent)',
      fg: 'var(--brand-dark)',
    },
    done: {
      bg: 'color-mix(in srgb, var(--gray-700) 10%, transparent)',
      fg: 'var(--gray-700)',
    },
  }
  const m = map[tone]
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
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
