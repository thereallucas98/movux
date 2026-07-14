'use client'

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { BellRing, Clock, Repeat, Users, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'

import { cn } from '~/lib/utils'

interface StickyCardData {
  id: number
  Icon: LucideIcon
  title: string
  description: string
}

const CARDS: readonly StickyCardData[] = [
  {
    id: 1,
    Icon: Users,
    title: 'A pessoa certa no turno certo',
    description:
      'Atribuição direta ou fila aberta. O sistema bloqueia overlap, fecha vagas duplicadas e respeita o decision window de cada colaborador.',
  },
  {
    id: 2,
    Icon: Repeat,
    title: 'Trocas com aprovação rastreável',
    description:
      'Troca entre colegas, oferta pra coordenador encontrar substituto, folga com anexo. Cada decisão fica gravada no audit log do turno.',
  },
  {
    id: 3,
    Icon: Clock,
    title: 'Ponto que respeita a tolerância',
    description:
      'Clock-in/out com geolocalização e janela de tolerância configurável. CSV pronto pro RH no fechamento da escala.',
  },
  {
    id: 4,
    Icon: BellRing,
    title: 'Notificação em tempo real',
    description:
      'Inbox no app com 16 tipos de evento. Coordenadores recebem cada decisão, colaboradores recebem cada atribuição.',
  },
] as const

const CARD_HEIGHT = 560

export function LandingStickyCards() {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  return (
    <section ref={ref} className="relative" aria-label="Recursos principais">
      {CARDS.map((card, idx) => (
        <StickyCard
          key={card.id}
          card={card}
          position={idx + 1}
          total={CARDS.length}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </section>
  )
}

interface StickyCardProps {
  card: StickyCardData
  position: number
  total: number
  scrollYProgress: MotionValue<number>
}

function StickyCard({
  card,
  position,
  total,
  scrollYProgress,
}: StickyCardProps) {
  const scaleFromPct = (position - 1) / total
  // Last card stays in place; preceding cards translate up to reveal the next.
  const yTransform = useTransform(
    scrollYProgress,
    [scaleFromPct, 1],
    [0, -CARD_HEIGHT],
  )
  const isOdd = position % 2 === 1
  const isLast = position === total

  return (
    <motion.div
      data-position={position}
      data-tone={isOdd ? 'dark' : 'light'}
      style={{
        height: CARD_HEIGHT,
        y: isLast ? undefined : yTransform,
        background: isOdd ? 'var(--brand-dark)' : 'var(--gray-100)',
      }}
      className={cn(
        'sticky top-0 flex w-full origin-top flex-col items-center justify-center px-6 py-12 md:px-12',
        isOdd ? 'text-white' : 'text-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex size-14 items-center justify-center rounded-[16px]',
          isOdd ? 'bg-white/15 text-white' : 'bg-white shadow-sm',
        )}
        style={!isOdd ? { color: 'var(--brand-base)' } : undefined}
      >
        <card.Icon className="size-7" />
      </span>
      <h3 className="mt-6 max-w-2xl text-center text-3xl font-bold tracking-tight md:text-5xl">
        {card.title}
      </h3>
      <p
        className={cn(
          'mt-5 max-w-xl text-center text-base md:text-lg',
          isOdd ? 'text-white/80' : 'text-muted-foreground',
        )}
      >
        {card.description}
      </p>
      <span
        className={cn(
          'mt-8 text-xs font-semibold tracking-wider uppercase',
          isOdd ? 'text-white/60' : 'text-muted-foreground',
        )}
      >
        {position} de {total}
      </span>
    </motion.div>
  )
}

/** Re-exported so a parent that wants to layout further sticky stacks knows
 * how tall this section is in pixels. */
export const STICKY_CARD_HEIGHT: number = CARD_HEIGHT
