'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  HeartPulse,
  ListChecks,
  Shield,
  type LucideIcon,
} from 'lucide-react'
import { useState, type Dispatch, type SetStateAction } from 'react'

import { cn } from '~/lib/utils'

type RoleId = 'ADMIN' | 'COORDENADOR' | 'COLABORADOR'

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
    id: 'ADMIN',
    tag: 'Admin',
    title: 'Donos do workspace',
    description:
      'Configuram a operação inteira: convidam membros, definem categorias e especialidades, ajustam tolerâncias de ponto e acessam todos os relatórios.',
    Icon: Shield,
    perks: [
      'Convite de membros e definição de papéis',
      'Categorias, especialidades e regras do workspace',
      'Acesso total a relatórios e auditoria',
    ],
    stats: [
      { label: 'Workspaces', value: '∞' },
      { label: 'Categorias', value: '∞' },
      { label: 'Tolerância CLT', value: 'configurável' },
    ],
  },
  {
    id: 'COORDENADOR',
    tag: 'Coordenador',
    title: 'Comandam o setor',
    description:
      'Montam, publicam e fecham escalas. Aprovam ou rejeitam trocas, ofertas e folgas. Recebem notificação no app de cada decisão da equipe.',
    Icon: ListChecks,
    perks: [
      'Ciclo completo Rascunho → Publicada → Fechada',
      'Inbox unificada de trocas, ofertas e folgas',
      'Notificações em tempo real de cada decisão',
    ],
    stats: [
      { label: 'Tipos de evento', value: '16' },
      { label: 'Tempo até decisão', value: '< 1 min' },
      { label: 'Audit log', value: 'imutável' },
    ],
  },
  {
    id: 'COLABORADOR',
    tag: 'Colaborador',
    title: 'Vivem o turno',
    description:
      'Aceitam ou recusam atribuições no prazo. Pedem troca, oferta ou folga com 1 toque. Batem ponto com geolocalização. Tudo no mesmo app.',
    Icon: HeartPulse,
    perks: [
      'Aceite/recusa com janela de decisão clara',
      'Pedidos de troca, oferta ou folga em 1 toque',
      'Ponto com geolocalização e tolerância',
    ],
    stats: [
      { label: 'Toques pra aceitar', value: '1' },
      { label: 'Geolocalização', value: 'sim' },
      { label: 'Histórico pessoal', value: 'completo' },
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
            Três papéis, mesmo workspace.
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
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase">
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
