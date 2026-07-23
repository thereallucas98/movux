import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  MapPin,
  Route,
  Search,
  Shield,
  Sparkles,
  Star,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '~/components/ui/button'
import { Logo } from '~/components/ui/logo'
import { getServerPrincipal } from '~/lib/get-server-principal'

import { LandingFAQ } from './_landing/landing-faq'
import { LandingHeroPreview } from './_landing/landing-hero-preview'
import { LandingPricing } from './_landing/landing-pricing'
import { LandingRolesAccordion } from './_landing/landing-roles-accordion'
import { LandingSpringCards } from './_landing/landing-spring-cards'
import { LandingStickyCards } from './_landing/landing-sticky-cards'
import { LandingTestimonials } from './_landing/landing-testimonials'
import { LandingTextParallax } from './_landing/landing-text-parallax'
import { MotionSection } from './_landing/motion-section'

const PARALLAX_BLOCKS = [
  {
    imgUrl:
      'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?q=80&w=2670&auto=format&fit=crop',
    subheading: 'Peça',
    heading: 'Do pedido à entrega, tudo no mesmo lugar.',
    title: 'Preço, fila de propostas e trajeto — sob o mesmo teto.',
    body: 'Pare de negociar frete por indicação, sem parâmetro de preço e sem nenhuma garantia. No Movux, você descreve o frete uma vez; transportadores verificados da região entram na fila e enviam propostas — cada etapa fica registrada.',
    ctaLabel: 'Ver como funciona',
    ctaHref: '#fluxo',
  },
  {
    imgUrl:
      'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=2670&auto=format&fit=crop',
    subheading: 'Confie',
    heading: 'Segurança em camadas, não uma promessa vazia.',
    title: 'Verificação de documento, check-in e avaliação mútua.',
    body: 'Quando alguém pergunta "quem levou minha carga e ela chegou como combinado?", o Movux responde em segundos. Documento verificado, check-in de segurança no trajeto e avaliação depois da entrega — tudo com prova.',
    ctaLabel: 'Ver os papéis',
    ctaHref: '#papeis',
  },
] as const

export default async function LandingPage() {
  const principal = await getServerPrincipal()

  if (principal) {
    switch (principal.role) {
      case 'ADMIN':
        redirect('/admin/dashboard')
        break
      case 'CARRIER':
        redirect('/carrier/dashboard')
        break
      default:
        redirect('/customer/dashboard')
    }
  }

  return (
    <div className="bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <LandingTestimonials />
      <TrustStrip />
      <MotionSection>
        <ProblemSection />
      </MotionSection>
      <LandingSpringCards />
      <LandingTextParallax blocks={PARALLAX_BLOCKS} />
      <MotionSection>
        <WorkflowSection />
      </MotionSection>
      <LandingStickyCards />
      <LandingRolesAccordion />
      <LandingPricing />
      <LandingFAQ />
      <MotionSection>
        <FinalCta />
      </MotionSection>
      <SiteFooter />
    </div>
  )
}

/* ─────────────────────────── HEADER ─────────────────────────── */

function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo iconOnly className="text-foreground" />
        </Link>

        <nav
          aria-label="Seções"
          className="text-muted-foreground hidden gap-7 text-sm font-medium md:flex"
        >
          <a
            href="#produto"
            className="hover:text-foreground transition-colors"
          >
            Produto
          </a>
          <a href="#fluxo" className="hover:text-foreground transition-colors">
            Como funciona
          </a>
          <a href="#papeis" className="hover:text-foreground transition-colors">
            Para quem
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-foreground hidden text-sm font-medium hover:underline md:inline"
          >
            Entrar
          </Link>
          <Button asChild size="md" variant="solid">
            <Link href="/register">Criar conta</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────── HERO ─────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradients — tokens da marca (brand-base/yellow-base), sem hex solto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--brand-base) 18%, transparent), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 30%, color-mix(in srgb, var(--yellow-base) 16%, transparent), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, color-mix(in srgb, var(--brand-base) 40%, transparent), transparent)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="border-border/80 text-muted-foreground inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles
              className="size-3.5"
              style={{ color: 'var(--brand-base)' }}
            />
            Segurança progressiva em cada frete
          </span>

          <h1 className="text-foreground mt-6 text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            Chama um{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--brand-base) 0%, var(--brand-dark) 100%)',
              }}
            >
              Movux
            </span>
            .
          </h1>

          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-base md:text-lg">
            Marketplace de fretes e mudanças com segurança progressiva — do
            primeiro contato até a entrega, com transportador verificado e preço
            justo.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="md"
              variant="solid"
              className="h-14 px-6 text-base"
            >
              <Link href="/buscar-transportadores" className="gap-2">
                Buscar transportadores
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="md"
              variant="outline"
              className="h-14 px-6 text-base"
            >
              <Link href="/register?role=CARRIER">Sou transportador</Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-5 text-xs">
            Sem taxa de cadastro · Cotação em minutos · Segurança em cada etapa
          </p>
        </div>

        {/* Mock preview card — interactive tabbed demo of the most-used routes */}
        <div className="mt-14 md:mt-20">
          <LandingHeroPreview />
        </div>
      </div>
    </section>
  )
}

/* HeroPreview moved to ./_landing/landing-hero-preview.tsx (interactive tabs). */

/* ─────────────────────────── TRUST STRIP ─────────────────────────── */

function TrustStrip() {
  const verticals: Array<{ Icon: LucideIcon; label: string }> = [
    { Icon: FileCheck2, label: 'Verificação de documento' },
    { Icon: Star, label: 'Avaliação mútua' },
    { Icon: Shield, label: 'Contato de segurança' },
    { Icon: Search, label: 'Checagem externa' },
  ]
  return (
    <section className="border-border/60 bg-muted/30 border-y py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 md:px-8">
        <p className="text-muted-foreground w-full text-center text-xs font-semibold tracking-wider uppercase md:w-auto">
          Segurança em camadas
        </p>
        {verticals.map(({ Icon, label }) => (
          <div
            key={label}
            className="text-muted-foreground flex items-center gap-2 text-sm font-medium"
          >
            <Icon className="size-4" />
            {label}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────── PROBLEM ─────────────────────────── */

function ProblemSection() {
  return (
    <section
      id="produto"
      className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28"
    >
      <div className="grid gap-12 md:grid-cols-2 md:items-center">
        <div>
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: 'var(--brand-base)' }}
          >
            O problema
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Contratar frete por indicação não dá nenhuma garantia.
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            Grupo de WhatsApp, indicação de vizinho, motorista sem nenhuma
            verificação — quem contrata um frete ou mudança hoje corre o risco
            de pagar preço arbitrário, sem rastreio do trajeto e sem nenhuma
            prova em caso de problema.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              'Preço combinado no olho, sem nenhum parâmetro.',
              'Nenhuma verificação de documento do motorista.',
              'Sem acompanhamento — só descobre que deu errado tarde demais.',
              'Se der problema, não tem nada registrado pra reclamar.',
            ].map((line) => (
              <li key={line} className="text-foreground flex items-start gap-3">
                <span
                  aria-hidden
                  className="bg-destructive/10 mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                >
                  <span className="bg-destructive block size-1.5 rounded-full" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-[28px] opacity-40 blur-2xl"
            style={{
              background:
                'linear-gradient(135deg, color-mix(in srgb, var(--brand-base) 30%, transparent), color-mix(in srgb, var(--yellow-base) 24%, transparent))',
            }}
          />
          <div className="border-border/70 bg-background space-y-3 rounded-[20px] border p-6 shadow-xl">
            <p
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: 'var(--brand-base)' }}
            >
              Com a Movux
            </p>
            <h3 className="text-foreground text-xl font-bold">
              Tudo com prova — preço, trajeto, segurança.
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                'Preço sugerido automático por corredor e tipo de frete.',
                'Fila de propostas — até 5 tentativas, prazo (SLA) calculado.',
                'Check-in de segurança na coleta e na entrega.',
                'Timeline auditável de cada evento do frete.',
                'Avaliação mútua depois da entrega.',
                'Notificação por e-mail em cada etapa.',
              ].map((line) => (
                <li
                  key={line}
                  className="text-foreground flex items-start gap-3"
                >
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0"
                    style={{ color: 'var(--brand-base)' }}
                  />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── WORKFLOW ─────────────────────────── */

function WorkflowSection() {
  const steps = [
    {
      n: '01',
      Icon: Truck,
      title: 'Peça seu frete',
      body: 'Descreva o que precisa mover, origem e destino — o preço sugerido sai na hora, calculado pelo motor de precificação.',
    },
    {
      n: '02',
      Icon: Users,
      title: 'Receba propostas',
      body: 'Transportadores verificados da região entram na fila e enviam propostas — você escolhe a melhor.',
    },
    {
      n: '03',
      Icon: Route,
      title: 'Acompanhe em trânsito',
      body: 'Check-in de segurança na coleta e a cada etapa do trajeto, até a entrega ser confirmada.',
    },
    {
      n: '04',
      Icon: Star,
      title: 'Avalie',
      body: 'Depois da entrega, cliente e transportador se avaliam — a nota alimenta o rating público de cada um.',
    },
  ]
  return (
    <section
      id="fluxo"
      className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: 'var(--brand-base)' }}
        >
          Como funciona
        </p>
        <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          Do pedido à entrega — em 4 passos.
        </h2>
        <p className="text-muted-foreground mt-4 text-base">
          Cada etapa do frete tem regra clara. Tudo o que acontece fica
          registrado.
        </p>
      </div>

      <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ n, Icon, title, body }) => (
          <li
            key={n}
            className="border-border/70 bg-background relative overflow-hidden rounded-[16px] border p-6"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-3xl font-extrabold"
                style={{ color: 'var(--brand-base)', opacity: 0.55 }}
              >
                {n}
              </span>
              <span
                className="inline-flex size-9 items-center justify-center rounded-[10px]"
                style={{
                  background:
                    'color-mix(in srgb, var(--brand-base) 12%, transparent)',
                  color: 'var(--brand-base)',
                }}
              >
                <Icon className="size-4" />
              </span>
            </div>
            <h3 className="text-foreground mt-4 text-base font-semibold">
              {title}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ─────────────────────────── FINAL CTA ─────────────────────────── */

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
      <div
        className="relative overflow-hidden rounded-[24px] px-6 py-14 text-center md:px-12 md:py-20"
        style={{
          background:
            'linear-gradient(135deg, var(--brand-base) 0%, var(--brand-dark) 100%)',
        }}
      >
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'rgba(255, 255, 255, 0.3)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-24 size-72 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              'color-mix(in srgb, var(--yellow-base) 60%, transparent)',
          }}
        />

        <div className="relative mx-auto max-w-2xl">
          <MapPin className="mx-auto size-7 text-white/80" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Peça seu frete em minutos. Sem burocracia.
          </h2>
          <p className="mt-4 text-base text-white/80">
            Busque transportadores verificados na sua cidade, veja avaliação
            real e crie sua conta só quando decidir contratar.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="md"
              variant="solid"
              className="text-foreground h-14 bg-white px-6 text-base hover:bg-white/90"
            >
              <Link href="/buscar-transportadores" className="gap-2">
                Buscar transportadores
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Link
              href="/login"
              className="text-sm font-medium text-white/90 hover:text-white"
            >
              Já tenho conta →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── FOOTER ─────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-border/60 border-t py-10">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs md:flex-row md:px-8">
        <div className="flex items-center gap-2">
          <Logo className="text-foreground text-sm" />
          <span>· Chama um Movux.</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <span>© 2026 Movux — feito no Brasil</span>
          <Link href="/login" className="hover:text-foreground">
            Entrar
          </Link>
          <Link href="/register" className="hover:text-foreground">
            Criar conta
          </Link>
        </div>
      </div>
    </footer>
  )
}
