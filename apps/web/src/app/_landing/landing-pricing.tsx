'use client'

import { Check, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

interface Feature {
  label: string
  /** When true, renders an "em breve" pill — feature is on the Phase 2 roadmap. */
  comingSoon?: boolean
}

interface PricingTier {
  name: string
  price: string
  period?: string
  tagline: string
  features: Feature[]
  ctaLabel: string
  ctaHref: string
  highlight?: boolean
}

const TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: 'R$ 0',
    tagline: 'Para clínica ou academia pequena começar sem fricção.',
    features: [
      { label: '1 workspace · 20 membros' },
      { label: '5 setores e 5 especialidades' },
      { label: '200 plantões / mês · 40 solicitações / mês' },
      { label: 'Login com email/senha' },
      { label: 'Login com Google', comingSoon: true },
      { label: 'Sync 2-vias com Google Calendar', comingSoon: true },
      { label: 'Notificações in-app + email', comingSoon: true },
      { label: 'Audit log + timeline + CSV export' },
      { label: 'Anexo de até 2 MB' },
    ],
    ctaLabel: 'Começar grátis',
    ctaHref: '/register',
  },
  {
    name: 'Small Team',
    price: 'R$ 39',
    period: '/mês',
    tagline: 'Para o negócio crescendo, com até 3 unidades.',
    features: [
      { label: 'Tudo do Free, mais:' },
      { label: '3 workspaces · 60 membros / workspace' },
      { label: '15 setores e 15 especialidades' },
      { label: '1.000 plantões / mês · 200 solicitações / mês' },
      { label: 'Geolocalização no ponto', comingSoon: true },
      { label: 'Anexo de até 5 MB' },
      { label: 'Suporte por email' },
    ],
    ctaLabel: 'Começar Small Team',
    ctaHref: '/register?plan=SMALL_TEAM',
    highlight: true,
  },
  {
    name: 'Business',
    price: 'R$ 79',
    period: '/mês',
    tagline: 'Para rede com até 10 unidades.',
    features: [
      { label: 'Tudo do Small Team, mais:' },
      { label: '10 workspaces · 200 membros / workspace' },
      { label: '50 setores e 50 especialidades' },
      { label: '4.000 plantões / mês · 1.000 solicitações / mês' },
      { label: 'Notificações WhatsApp + bot interativo', comingSoon: true },
      { label: 'Anexo de até 25 MB' },
      { label: 'Suporte por email prioritário' },
    ],
    ctaLabel: 'Começar Business',
    ctaHref: '/register?plan=BUSINESS',
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
          Comece grátis. Cresça sem surpresa.
        </h2>
        <p className="text-muted-foreground max-w-2xl text-base">
          Free cobre uma operação pequena por mês inteiro sem bater no limite.
          Quando o time crescer, o próximo plano custa menos que um cafezinho
          por dia.
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
        Sem cartão de crédito no Free. Você pode mudar de plano a qualquer
        momento — quando reduz, ganha 14 dias para se ajustar. Itens marcados
        como{' '}
        <span className="border-warning/40 bg-warning-light text-yellow-dark inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium">
          <Clock className="h-3 w-3" aria-hidden /> em breve
        </span>{' '}
        chegam nas próximas semanas.
      </p>

      <p className="text-muted-foreground mt-3 text-center text-xs">
        Hospital ou rede com requisitos enterprise (SSO, MTE 671, folha de
        pagamento)?{' '}
        <Link
          href="mailto:vendas@movux.com.br?subject=Plano%20enterprise"
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
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">{tier.name}</h3>
          {tier.highlight && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              Mais popular
            </span>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight">
          {tier.price}
          {tier.period && (
            <span className="text-muted-foreground ml-1 text-sm font-normal">
              {tier.period}
            </span>
          )}
        </p>
        <p className="text-muted-foreground text-sm">{tier.tagline}</p>
      </header>

      <ul className="flex flex-col gap-2 text-sm">
        {tier.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2">
            <Check
              className="text-primary mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <span className="flex-1">
              {f.label}
              {f.comingSoon && (
                <span className="border-warning/40 bg-warning-light text-yellow-dark ml-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 align-middle text-[10px] font-medium tracking-wide uppercase">
                  <Clock className="h-2.5 w-2.5" aria-hidden /> em breve
                </span>
              )}
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
    </article>
  )
}
