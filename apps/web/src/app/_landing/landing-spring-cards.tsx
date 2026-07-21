'use client'

import { motion, MotionConfig } from 'framer-motion'
import {
  ArrowUpRight,
  FileCheck2,
  Mail,
  ShieldCheck,
  Star,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '~/lib/utils'

interface SpringCardData {
  Icon: LucideIcon
  title: string
  body: string
}

/** Single brand palette: alternates between white surface and brand-tinted
 * surface; no other hues are introduced. */
type CardTone = 'white' | 'mint' | 'brand'

const CARDS: ReadonlyArray<SpringCardData & { tone: CardTone }> = [
  {
    Icon: Truck,
    title: 'Preço Justo Automático',
    body: 'Motor de precificação calcula o valor sugerido por corredor, tipo de frete e veículo — sem negociação no escuro.',
    tone: 'white',
  },
  {
    Icon: Users,
    title: 'Fila de Propostas',
    body: 'Transportadores da região entram na fila e enviam até 5 tentativas de proposta, com prazo (SLA) calculado automaticamente.',
    tone: 'mint',
  },
  {
    Icon: ShieldCheck,
    title: 'Segurança em Trânsito',
    body: 'Check-in de segurança na coleta e na entrega, com contato de confiança acompanhando o trajeto.',
    tone: 'brand',
  },
  {
    Icon: FileCheck2,
    title: 'Verificação de Documento',
    body: 'CNH, CRLV e CPF conferidos pelo admin antes do transportador operar na plataforma.',
    tone: 'white',
  },
  {
    Icon: Star,
    title: 'Avaliação Bidirecional',
    body: 'Cliente e transportador se avaliam depois da entrega — a nota alimenta o rating público de cada um.',
    tone: 'mint',
  },
  {
    Icon: Mail,
    title: 'Notificação por E-mail',
    body: 'Cada mudança de status do frete — nova proposta, aceite, chegada — vira e-mail automático.',
    tone: 'brand',
  },
] as const

interface ToneStyle {
  surface: string
  fg: string
  iconBg: string
  iconFg: string
  arrowFg: string
  bodyFg: string
  ring: string
  shadow: string
}

const TONE_STYLES: Record<CardTone, ToneStyle> = {
  white: {
    surface: 'var(--neutral-white)',
    fg: 'var(--brand-dark)',
    iconBg: 'color-mix(in srgb, var(--brand-base) 10%, transparent)',
    iconFg: 'var(--brand-base)',
    arrowFg: 'var(--brand-base)',
    bodyFg: 'var(--gray-700)',
    ring: 'color-mix(in srgb, var(--brand-base) 18%, transparent)',
    shadow:
      '0 1px 2px color-mix(in srgb, var(--brand-base) 4%, transparent), 0 8px 24px -8px color-mix(in srgb, var(--brand-base) 10%, transparent)',
  },
  mint: {
    surface: 'color-mix(in srgb, var(--brand-base) 6%, transparent)',
    fg: 'var(--brand-dark)',
    iconBg: 'var(--neutral-white)',
    iconFg: 'var(--brand-base)',
    arrowFg: 'var(--brand-dark)',
    bodyFg: 'var(--gray-700)',
    ring: 'color-mix(in srgb, var(--brand-base) 22%, transparent)',
    shadow:
      '0 1px 2px color-mix(in srgb, var(--brand-base) 6%, transparent), 0 12px 28px -10px color-mix(in srgb, var(--brand-base) 18%, transparent)',
  },
  brand: {
    surface: 'var(--brand-base)',
    fg: 'var(--neutral-white)',
    iconBg: 'rgba(255, 255, 255, 0.18)',
    iconFg: 'var(--neutral-white)',
    arrowFg: 'var(--neutral-white)',
    bodyFg: 'rgba(255, 255, 255, 0.85)',
    ring: 'rgba(255, 255, 255, 0.35)',
    shadow:
      '0 4px 12px color-mix(in srgb, var(--brand-dark) 18%, transparent), 0 16px 36px -12px color-mix(in srgb, var(--brand-dark) 35%, transparent)',
  },
}

export function LandingSpringCards() {
  return (
    <section
      id="produto-cards"
      className="border-border/60 bg-background border-y py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: 'var(--brand-base)' }}
          >
            O que vem dentro
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Seis diferenciais que trabalham juntos.
          </h2>
          <p className="text-muted-foreground mt-4 text-base">
            Não é só um chat com motorista. É a operação inteira do frete —
            integrada e rastreável.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <SpringCard key={c.title} card={c} />
          ))}
        </div>
      </div>
    </section>
  )
}

interface SpringCardProps {
  card: SpringCardData & { tone: CardTone }
}

function SpringCard({ card }: SpringCardProps) {
  const t: ToneStyle = TONE_STYLES[card.tone]
  const Icon = card.Icon

  return (
    <MotionConfig transition={{ type: 'spring', bounce: 0.35, duration: 0.55 }}>
      <motion.article
        whileHover="hovered"
        initial="rest"
        animate="rest"
        className={cn(
          'group relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden rounded-[24px] p-6',
        )}
        style={{
          background: t.surface,
          color: t.fg,
          boxShadow: t.shadow,
          // Border ring uses outline so it doesn't fight the motion transform
          outline: `1px solid ${t.ring}`,
          outlineOffset: '-1px',
        }}
      >
        <motion.div
          variants={{ hovered: { y: -4 }, rest: { y: 0 } }}
          className="flex items-center justify-between"
        >
          <span
            aria-hidden
            className="inline-flex size-12 items-center justify-center rounded-[16px]"
            style={{ background: t.iconBg, color: t.iconFg }}
          >
            <Icon className="size-5" />
          </span>
          <motion.span
            variants={{
              hovered: { opacity: 1, x: 0 },
              rest: { opacity: 0, x: -6 },
            }}
            transition={{ duration: 0.25 }}
            className="inline-flex"
            aria-hidden
          >
            <ArrowUpRight className="size-5" style={{ color: t.arrowFg }} />
          </motion.span>
        </motion.div>

        <div className="mt-6 flex flex-col gap-2">
          <h3
            className="text-xl font-bold tracking-tight"
            style={{ color: t.fg }}
          >
            {card.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: t.bodyFg }}>
            {card.body}
          </p>
        </div>

        {/* Glow pulse on hover */}
        <motion.span
          aria-hidden
          variants={{ hovered: { opacity: 1 }, rest: { opacity: 0 } }}
          transition={{ duration: 0.4 }}
          className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full blur-3xl"
          style={{
            background:
              card.tone === 'brand'
                ? 'rgba(255, 255, 255, 0.20)'
                : 'color-mix(in srgb, var(--brand-base) 12%, transparent)',
          }}
        />
      </motion.article>
    </MotionConfig>
  )
}
