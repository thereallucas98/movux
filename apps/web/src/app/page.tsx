import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  HeartPulse,
  Hospital,
  MapPin,
  Shield,
  Sparkles,
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
import { LandingTextParallax } from './_landing/landing-text-parallax'
import { MotionSection } from './_landing/motion-section'

const PARALLAX_BLOCKS = [
  {
    // Equipe hospitalar coordenando — encaixa em qualquer setor de plantão
    imgUrl:
      'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?q=80&w=2670&auto=format&fit=crop',
    subheading: 'Coordene',
    heading: 'Tudo no mesmo lugar.',
    title: 'Escala, decisão, ponto e prova — sob o mesmo teto.',
    body: 'Pare de cruzar planilha, grupo de WhatsApp e e-mail pra fechar plantão. Coordenadores publicam a escala uma vez; cada movimento da equipe (aceite, recusa, troca, candidatura, ponto) gera linha gravada no audit log do turno.',
    ctaLabel: 'Ver como funciona',
    ctaHref: '#fluxo',
  },
  {
    // Profissional consultando agenda — fits hospital, clínica e academia
    imgUrl:
      'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?q=80&w=2670&auto=format&fit=crop',
    subheading: 'Confie',
    heading: 'Cada decisão tem prova.',
    title: 'Audit log e timeline pública por turno.',
    body: 'Quando alguém pergunta "quem aceitou esse plantão e em que horário?", a Movux responde em segundos. A linha do tempo congelada no fechamento da escala vira documento pronto pro RH ou pra qualquer disputa trabalhista.',
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
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-[8px] text-white"
            style={{ background: 'var(--brand-base)' }}
          >
            <HeartPulse className="size-4" />
          </span>
          <Logo className="text-foreground" />
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
            <Link href="/register">Comece grátis</Link>
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
      {/* Background gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(31, 111, 67, 0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 30%, rgba(37, 99, 235, 0.10), transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{
          background:
            'linear-gradient(to right, transparent, rgba(31, 111, 67, 0.4), transparent)',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="border-border/80 text-muted-foreground inline-flex items-center gap-2 rounded-full border bg-white/60 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles
              className="size-3.5"
              style={{ color: 'var(--brand-base)' }}
            />
            Escalas para hospitais, clínicas e academias
          </span>

          <h1 className="text-foreground mt-6 text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
            Tá na{' '}
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
            A plataforma que coloca a pessoa certa no turno certo — com respeito
            ao tempo pessoal, à responsabilidade profissional e às regras
            trabalhistas brasileiras.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="md"
              variant="solid"
              className="h-14 px-6 text-base"
            >
              <Link href="/register" className="gap-2">
                Criar workspace grátis
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="md"
              variant="outline"
              className="h-14 px-6 text-base"
            >
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>

          <p className="text-muted-foreground mt-5 text-xs">
            Sem cartão de crédito · Pronto em minutos · Português brasileiro
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
    { Icon: Hospital, label: 'Hospitais' },
    { Icon: HeartPulse, label: 'Clínicas' },
    { Icon: Users, label: 'Academias' },
    { Icon: Shield, label: 'Conformidade CLT' },
  ]
  return (
    <section className="border-border/60 bg-muted/30 border-y py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 md:px-8">
        <p className="text-muted-foreground w-full text-center text-xs font-semibold tracking-wider uppercase md:w-auto">
          Feito para
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
            Planilha + WhatsApp não dá conta de plantão.
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed">
            Coordenadores perdem horas costurando trocas, conferindo se ninguém
            está em folga, contando carga horária semanal — enquanto
            colaboradores descobrem o turno por mensagem solta no grupo, sem
            confirmar recebimento e sem rastreabilidade.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              'Atribuições que ninguém confirma — turno chega sem cobertura.',
              'Trocas decididas no zap sem aprovação do coordenador.',
              'Ponto registrado fora da tolerância sem ninguém perceber.',
              'Auditoria pós-incidente vira arqueologia digital.',
            ].map((line) => (
              <li key={line} className="text-foreground flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(220, 38, 38, 0.12)' }}
                >
                  <span className="block size-1.5 rounded-full bg-red-600" />
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
                'linear-gradient(135deg, rgba(31, 111, 67, 0.30), rgba(37, 99, 235, 0.20))',
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
              Tudo no mesmo lugar — escala, decisão, ponto, prova.
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                'Escalas com ciclo Rascunho → Publicada → Fechada.',
                'Atribuição direta OU fila aberta para candidatos.',
                'Aceite, rejeição e transferência rastreáveis.',
                'Ponto com geolocalização e tolerância configurável.',
                'Linha do tempo auditável por turno.',
                'Notificações por evento, no app.',
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
      Icon: FileCheck2,
      title: 'Rascunho',
      body: 'Coordenador monta a escala, define turnos, atribui composição esperada por especialidade.',
    },
    {
      n: '02',
      Icon: CalendarCheck,
      title: 'Publicada',
      body: 'Membros recebem notificação. Atribuições viram pendentes — aceite ou recuse no prazo.',
    },
    {
      n: '03',
      Icon: GitBranch,
      title: 'Em operação',
      body: 'Trocas, ofertas, folgas e candidatos rodam vivos. Ponto bate dentro da tolerância.',
    },
    {
      n: '04',
      Icon: Shield,
      title: 'Fechada',
      body: 'Coord fecha o período. Timeline congelada. Auditoria pronta para o RH.',
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
          Do rascunho ao fechamento — sem fricção.
        </h2>
        <p className="text-muted-foreground mt-4 text-base">
          Cada estado da escala tem regras claras. Tudo o que acontece fica
          gravado.
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
                  background: 'rgba(31, 111, 67, 0.12)',
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
          style={{ background: 'rgba(37, 99, 235, 0.5)' }}
        />

        <div className="relative mx-auto max-w-2xl">
          <MapPin className="mx-auto size-7 text-white/80" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Comece em minutos. Sem cartão.
          </h2>
          <p className="mt-4 text-base text-white/80">
            Crie seu primeiro workspace, importe sua equipe e tenha a próxima
            escala publicada antes do fim do dia.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="md"
              variant="solid"
              className="text-foreground h-14 bg-white px-6 text-base hover:bg-white/90"
            >
              <Link href="/register" className="gap-2">
                Criar workspace grátis
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
          <span>· Tá na Movux.</span>
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
