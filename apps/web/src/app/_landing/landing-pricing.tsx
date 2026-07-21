'use client'

import { Check, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface Feature {
  label: string
  /** When true, renders an "em breve" pill — planos pagos ainda não existem (Sprint 7). */
  comingSoon?: boolean
}

interface PricingTier {
  name: string
  price: string
  tagline: string
  features: Feature[]
  ctaLabel: string
  ctaHref: string
  highlight?: boolean
}

const TIERS: PricingTier[] = [
  {
    name: 'Cliente',
    price: 'Grátis',
    tagline: 'Peça fretes e mudanças — sempre grátis pra quem contrata.',
    features: [
      { label: 'Criação de frete ilimitada' },
      { label: 'Preço sugerido automático por corredor' },
      { label: 'Acompanhamento em tempo real do trajeto' },
      { label: 'Avaliação depois de cada entrega' },
    ],
    ctaLabel: 'Criar conta',
    ctaHref: '/register?role=CUSTOMER',
  },
  {
    name: 'Transportador Autônomo',
    price: 'Grátis por enquanto',
    tagline: 'Para quem dirige o próprio veículo.',
    features: [
      { label: 'Fila de propostas sem limite' },
      { label: 'Verificação de documento incluída' },
      { label: 'Rating público constrói reputação' },
      { label: 'Prioridade na fila de propostas', comingSoon: true },
    ],
    ctaLabel: 'Cadastrar como transportador',
    ctaHref: '/register?role=CARRIER',
    highlight: true,
  },
  {
    name: 'Frota',
    price: 'Em breve',
    tagline: 'Para empresa com mais de um veículo.',
    features: [
      { label: 'Múltiplos veículos por conta' },
      { label: 'Motoristas vinculados à empresa' },
      { label: 'Plano com limite de propostas ativas', comingSoon: true },
      { label: 'Relatório financeiro consolidado', comingSoon: true },
    ],
    ctaLabel: 'Cadastrar empresa',
    ctaHref: '/register?role=CARRIER',
  },
]

export function LandingPricing() {
  return (
    <section
      id="precos"
      className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28"
    >
      <header className="mb-12 flex flex-col items-center gap-3 text-center">
        <span className="text-primary inline-flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
          <Sparkles className="h-4 w-4" aria-hidden /> Planos
        </span>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Toda a plataforma é gratuita, por enquanto.
        </h2>
        <p className="text-muted-foreground max-w-2xl text-base">
          Cliente sempre paga só o frete combinado com o transportador —
          nunca uma taxa de plataforma. Planos pagos por volume pra
          transportador chegam numa próxima rodada.
        </p>
      </header>

      {/* Desktop grid */}
      <div className="hidden gap-4 md:grid md:grid-cols-3 lg:gap-6">
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </div>

      {/* Mobile carousel */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
        {TIERS.map((tier) => (
          <PricingCard
            key={tier.name}
            tier={tier}
            className="shrink-0 basis-[300px] snap-center"
          />
        ))}
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        Ninguém é cobrado até que os planos pagos existam. Itens marcados
        como{' '}
        <span className="border-warning/40 bg-warning-light text-yellow-dark inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap">
          <Clock className="h-3 w-3" aria-hidden /> em breve
        </span>{' '}
        ainda não têm data — só usamos essa página pra deixar claro que o
        modelo de negócio não é surpresa.
      </p>

      <p className="text-muted-foreground mt-3 text-center text-xs">
        Frota grande ou operação logística com requisitos específicos?{' '}
        <Link
          href="mailto:vendas@movux.com.br?subject=Frota%20grande"
          className="text-primary underline-offset-4 hover:underline"
        >
          Fale com a gente
        </Link>
        .
      </p>
    </section>
  )
}

function PricingCard({
  tier,
  className,
}: {
  tier: PricingTier
  className?: string
}) {
  return (
    <article
      className={cn(
        'border-border bg-card flex flex-col gap-5 rounded-xl border p-6',
        tier.highlight && 'border-primary ring-primary/30 shadow-lg ring-2',
        className,
      )}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">{tier.name}</h3>
          {tier.highlight && (
            <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap">
              Mais comum
            </span>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight">{tier.price}</p>
        <p className="text-muted-foreground text-sm">{tier.tagline}</p>
      </header>

      <ul className="flex flex-col gap-2 text-sm">
        {tier.features.map((f) => (
          <li key={f.label} className="flex flex-col gap-1">
            <span className="flex items-start gap-2">
              <Check
                className="text-primary mt-0.5 h-4 w-4 shrink-0"
                aria-hidden
              />
              <span className="flex-1">{f.label}</span>
            </span>
            {f.comingSoon && (
              <span className="border-warning/40 bg-warning-light text-yellow-dark ml-6 inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase">
                <Clock className="h-2.5 w-2.5" aria-hidden /> em breve
              </span>
            )}
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={tier.highlight ? 'solid' : 'outline'}
        size="md"
        className="mt-auto w-full"
      >
        <Link href={tier.ctaHref}>{tier.ctaLabel}</Link>
      </Button>
    </article>
  )
}
