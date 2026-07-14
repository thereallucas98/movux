'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import useMeasure from 'react-use-measure'

import { cn } from '~/lib/utils'

interface QA {
  q: string
  a: ReactNode
}

const FAQ: QA[] = [
  {
    q: 'A Movux funciona offline?',
    a: 'Não. Como o ponto usa geolocalização e a inbox de notificações puxa eventos em tempo real, todo o app exige conexão. Em troca, qualquer mudança aparece imediatamente para a equipe.',
  },
  {
    q: 'Posso ter vários setores no mesmo workspace?',
    a: 'Sim. Categorias (Setores) ficam dentro do workspace e cada escala fica vinculada a uma categoria. UTI e Pronto-Socorro convivem no mesmo Hospital sem misturar turnos ou atribuições.',
  },
  {
    q: 'Como os colaboradores entram no app?',
    a: 'O Admin convida por e-mail. Cada pessoa cria a senha no primeiro acesso e cai direto no workspace correto. Coordenadores podem alterar o papel depois (COORDENADOR / COLABORADOR).',
  },
  {
    q: 'Tem versão mobile nativa?',
    a: 'Hoje a Movux é uma web app responsiva — funciona perfeitamente no Safari iOS e Chrome Android. Versão instalável (PWA) e push real estão na fase 2.',
  },
  {
    q: 'Consigo exportar relatórios para o RH?',
    a: 'Sim. Time entries (ponto) saem em CSV pronto para importar no Excel ou no sistema de folha. A timeline de cada turno fica congelada no fechamento da escala.',
  },
  {
    q: 'Quanto custa?',
    a: 'A versão atual está aberta para teste gratuito sem cartão. Os planos pagos com limites de membros/escalas estão sendo finalizados — quando disponíveis você será avisado dentro do app.',
  },
]

export function LandingFAQ() {
  return (
    <section
      id="faq"
      className="border-border/60 bg-background border-t py-20 md:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        <div className="text-center">
          <p
            className="text-xs font-semibold tracking-wider uppercase"
            style={{ color: 'var(--brand-base)' }}
          >
            Perguntas frequentes
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Tudo que coordenadores costumam perguntar.
          </h2>
        </div>
        <div className="mt-12 flex flex-col">
          {FAQ.map((item, i) => (
            <Question key={item.q} qa={item} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  )
}

function Question({ qa, defaultOpen }: { qa: QA; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [ref, { height }] = useMeasure()

  return (
    <motion.div
      animate={open ? 'open' : 'closed'}
      className="border-border border-b"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/40 focus-visible:ring-ring flex w-full items-center justify-between gap-4 rounded-[8px] px-2 py-5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-expanded={open}
      >
        <motion.span
          variants={{
            open: { color: 'var(--brand-base)' },
            closed: { color: 'var(--gray-800)' },
          }}
          transition={{ duration: 0.2 }}
          className="text-base font-semibold md:text-lg"
        >
          {qa.q}
        </motion.span>
        <motion.span
          variants={{
            open: { rotate: 180 },
            closed: { rotate: 0 },
          }}
          transition={{ duration: 0.2 }}
          aria-hidden
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
            open ? 'text-white' : 'text-muted-foreground bg-muted',
          )}
          style={open ? { background: 'var(--brand-base)' } : undefined}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? height : 0,
          opacity: open ? 1 : 0,
          marginBottom: open ? 16 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div
          ref={ref}
          className="text-muted-foreground px-2 pt-1 text-sm leading-relaxed md:text-base"
        >
          {qa.a}
        </div>
      </motion.div>
    </motion.div>
  )
}
