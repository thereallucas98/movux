'use client'

import { CheckCircle2, Sparkles, XSquare } from 'lucide-react'
import Link from 'next/link'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface ChecklistItem {
  label: string
  included: boolean
}

interface PricingTier {
  name: string
  price: string
  tagline: string
  items: ChecklistItem[]
  ctaLabel: string
  ctaHref: string
  highlight?: boolean
}

const TIERS: PricingTier[] = [
  {
    name: 'Cliente',
    price: 'Grátis',
    tagline: 'Peça fretes e mudanças — sempre grátis pra quem contrata.',
    items: [
      { label: 'Criação de frete ilimitada', included: true },
      { label: 'Preço sugerido automático por corredor', included: true },
      { label: 'Acompanhamento em tempo real do trajeto', included: true },
      { label: 'Avaliação depois de cada entrega', included: true },
    ],
    ctaLabel: 'Criar conta',
    ctaHref: '/register?role=CUSTOMER',
  },
  {
    name: 'Transportador Autônomo',
    price: 'Grátis por enquanto',
    tagline: 'Para quem dirige o próprio veículo.',
    items: [
      { label: 'Fila de propostas sem limite', included: true },
      { label: 'Verificação de documento incluída', included: true },
      { label: 'Rating público constrói reputação', included: true },
      { label: 'Prioridade na fila de propostas', included: false },
    ],
    ctaLabel: 'Cadastrar como transportador',
    ctaHref: '/register?role=CARRIER',
    highlight: true,
  },
  {
    name: 'Frota',
    price: 'Em breve',
    tagline: 'Para empresa com mais de um veículo.',
    items: [
      { label: 'Múltiplos veículos por conta', included: true },
      { label: 'Motoristas vinculados à empresa', included: true },
      { label: 'Plano com limite de propostas ativas', included: false },
      { label: 'Relatório financeiro consolidado', included: false },
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </div>

      <p className="text-muted-foreground mt-10 text-center text-sm">
        Ninguém é cobrado até que os planos pagos existam — itens com{' '}
        <XSquare
          className="text-muted-foreground/60 -mt-0.5 inline size-3.5"
          aria-hidden
        />{' '}
        ainda não têm data.
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

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      style={
        tier.highlight
          ? { boxShadow: '0px 6px 0px var(--brand-dark)' }
          : undefined
      }
      className={cn(
        'rounded-card bg-background relative flex flex-col gap-5 p-6',
        tier.highlight ? 'border-primary border-2' : 'border-border border',
      )}
    >
      {tier.highlight && (
        <span className="bg-primary text-primary-foreground absolute top-0 right-4 -translate-y-1/2 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
          Mais comum
        </span>
      )}

      <div>
        <p className="text-lg font-semibold">{tier.name}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{tier.price}</p>
        <p className="text-muted-foreground mt-2 text-sm">{tier.tagline}</p>
      </div>

      <ul className="flex flex-col gap-2 text-sm">
        {tier.items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            {item.included ? (
              <CheckCircle2
                className="text-primary size-4 shrink-0"
                aria-hidden
              />
            ) : (
              <XSquare
                className="text-muted-foreground/50 size-4 shrink-0"
                aria-hidden
              />
            )}
            <span
              className={item.included ? undefined : 'text-muted-foreground/70'}
            >
              {item.label}
            </span>
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
    </div>
  )
}
