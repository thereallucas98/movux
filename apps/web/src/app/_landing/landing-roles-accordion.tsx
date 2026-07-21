'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Package,
  Shield,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'

import { cn } from '~/lib/utils'

type RoleId = 'CUSTOMER' | 'CARRIER' | 'ADMIN'

interface RoleStat {
  label: string
  value: string
}

interface Role {
  id: RoleId
  tag: string
  title: string
  description: string
  Icon: LucideIcon
  perks: readonly string[]
  /** Stats shown in the synced preview pane on the right. */
  stats: readonly RoleStat[]
}

const ROLES: readonly Role[] = [
  {
    id: 'CUSTOMER',
    tag: 'Cliente',
    title: 'Pedem o frete',
    description:
      'Descrevem o que precisam mover, recebem propostas de transportadores verificados, acompanham o trajeto em tempo real e avaliam depois da entrega.',
    Icon: Package,
    perks: [
      'Preço sugerido automático por corredor',
      'Fila de propostas — escolhe a melhor',
      'Check-in de segurança e avaliação após a entrega',
    ],
    stats: [
      { label: 'Tentativas por proposta', value: 'até 5' },
      { label: 'SLA calculado', value: 'automático' },
      { label: 'Avaliação', value: 'bidirecional' },
    ],
  },
  {
    id: 'CARRIER',
    tag: 'Transportador',
    title: 'Assumem o frete',
    description:
      'Entram na fila de propostas de fretes abertos na região, enviam proposta (ou contraproposta), fazem o check-in de segurança e recebem avaliação a cada entrega.',
    Icon: Truck,
    perks: [
      'Fila de fretes abertos por cidade e tipo',
      'Até 5 tentativas de proposta por frete',
      'Rating público constrói reputação',
    ],
    stats: [
      { label: 'Documentos verificados', value: 'CNH/CRLV/CPF' },
      { label: 'Fretes concluídos', value: 'histórico público' },
      { label: 'Autônomo ou frota', value: 'os dois' },
    ],
  },
  {
    id: 'ADMIN',
    tag: 'Admin',
    title: 'Garantem a confiança',
    description:
      'Aprovam ou rejeitam documento de transportador, rodam checagem externa, monitoram avaliação e sinalizam contas fora do padrão de segurança.',
    Icon: Shield,
    perks: [
      'Aprovação/rejeição de documento com motivo',
      'Checagem externa (estrutura pronta pra BigDataCorp/Serpro)',
      'Sinalização de carriers fora do padrão',
    ],
    stats: [
      { label: 'Tipos de documento', value: '7' },
      { label: 'Status de verificação', value: '3 estados' },
      { label: 'Dashboard de métricas', value: 'em tempo real' },
    ],
  },
] as const

export function LandingRolesAccordion() {
  const [open, setOpen] = useState<RoleId>(ROLES[0].id)
  const active: Role = ROLES.find((r) => r.id === open) ?? ROLES[0]

  return (
    <section
      id="papeis"
      className="border-border/60 bg-muted/20 border-y py-20 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: 'var(--brand-base)' }}
          >
            Para quem
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Três papéis, uma plataforma.
          </h2>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {ROLES.map((role) => (
              <RoleAccordion
                key={role.id}
                role={role}
                open={open}
                setOpen={setOpen}
              />
            ))}
          </div>

          <RolePreview role={active} />
        </div>
      </div>
    </section>
  )
}

interface RoleAccordionProps {
  role: Role
  open: RoleId
  setOpen: Dispatch<SetStateAction<RoleId>>
}

function RoleAccordion({ role, open, setOpen }: RoleAccordionProps) {
  const isOpen = open === role.id
  const RIcon = role.Icon

  return (
    <button
      type="button"
      onClick={() => setOpen(role.id)}
      aria-expanded={isOpen}
      className="group border-border bg-background relative cursor-pointer overflow-hidden rounded-[14px] border p-0.5 text-left"
    >
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 240 : 76 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-background relative z-20 flex flex-col justify-between rounded-[12px] p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: 'var(--brand-base)' }}
            >
              {role.tag}
            </span>
            <motion.span
              initial={false}
              animate={{
                color: isOpen ? 'var(--gray-800)' : 'var(--gray-700)',
              }}
              transition={{ duration: 0.2 }}
              className="text-foreground text-lg font-semibold"
            >
              {role.title}
            </motion.span>
          </div>
          <RIcon
            className="size-6 shrink-0"
            style={{ color: 'var(--brand-base)' }}
            aria-hidden
          />
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-3"
        >
          <p className="text-muted-foreground text-sm leading-relaxed">
            {role.description}
          </p>
          <span className="text-foreground inline-flex items-center gap-1 text-sm font-semibold">
            Saiba mais
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </motion.div>
      </motion.div>

      {/* Selected accent bar (left edge) */}
      <motion.span
        initial={false}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        aria-hidden
        className="absolute top-0 left-0 z-30 h-full w-1 rounded-l-[14px]"
        style={{ background: 'var(--brand-base)' }}
      />
    </button>
  )
}

interface RolePreviewProps {
  role: Role
}

function RolePreview({ role }: RolePreviewProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={role.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'relative flex flex-col gap-5 overflow-hidden rounded-[20px] border p-6 shadow-xl',
        )}
        style={{
          background:
            'linear-gradient(160deg, var(--brand-dark) 0%, var(--brand-base) 100%)',
          borderColor: 'var(--brand-dark)',
        }}
        aria-label={`Resumo: ${role.tag}`}
      >
        <div
          aria-hidden
          className="absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl"
          style={{ background: 'rgba(255, 255, 255, 0.4)' }}
        />

        <header className="relative flex items-center justify-between gap-3 text-white">
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider whitespace-nowrap uppercase">
            {role.tag}
          </span>
          <role.Icon className="size-5" aria-hidden />
        </header>

        <h3 className="relative text-xl leading-tight font-bold text-white">
          {role.title}
        </h3>

        <ul className="relative flex flex-col gap-2 text-sm text-white/90">
          {role.perks.map((p) => (
            <li key={p} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-white"
              />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <dl className="relative grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
          {role.stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="text-[10px] font-semibold tracking-wider text-white/60 uppercase">
                {s.label}
              </dt>
              <dd className="mt-0.5 text-sm font-bold text-white">{s.value}</dd>
            </div>
          ))}
        </dl>
      </motion.aside>
    </AnimatePresence>
  )
}
