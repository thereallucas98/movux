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
    q: 'Como funciona a verificação de transportador?',
    a: 'Todo transportador envia CNH, CRLV, CPF (e contrato social, se for empresa) — o admin aprova ou rejeita cada documento com motivo. Só depois de aprovado o transportador aparece na fila de propostas de qualquer frete.',
  },
  {
    q: 'O que é segurança progressiva?',
    a: 'É a soma de camadas de confiança que acompanham o frete do início ao fim: documento verificado antes de operar, contato de segurança acompanhando o trajeto, check-in na coleta e na entrega, e avaliação mútua no final.',
  },
  {
    q: 'Posso ser transportador autônomo ou preciso de empresa?',
    a: 'Os dois. Um transportador autônomo cadastra o próprio veículo; uma empresa (frota) cadastra vários veículos e gerencia os motoristas vinculados a ela. A verificação de documento é a mesma nos dois casos.',
  },
  {
    q: 'Como é calculado o preço do frete?',
    a: 'Um motor de precificação sugere o valor com base no corredor (origem → destino), tipo de frete e tipo de veículo — você vê o valor sugerido antes mesmo de publicar. Transportadores ainda podem propor um valor diferente na fila de propostas.',
  },
  {
    q: 'O que acontece se o transportador não aparecer?',
    a: 'Cada proposta aceita tem um prazo (SLA) calculado automaticamente. Se o prazo expira sem confirmação, a proposta é liberada e o frete volta pra fila — sem ficar travado esperando alguém que sumiu.',
  },
  {
    q: 'Como funciona a avaliação?',
    a: 'Depois da entrega confirmada, cliente e transportador avaliam um ao outro com nota e tags pré-definidas. A nota alimenta o rating público de cada perfil — histórico que pesa na próxima contratação.',
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
            Tudo que clientes e transportadores costumam perguntar.
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
            open: { color: 'transparent' },
            closed: { color: 'var(--gray-800)' },
          }}
          transition={{ duration: 0.2 }}
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--brand-base), var(--brand-dark))',
          }}
          className="bg-clip-text text-left text-base font-semibold md:text-lg"
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
