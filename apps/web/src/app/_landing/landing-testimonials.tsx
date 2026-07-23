'use client'

import { motion } from 'framer-motion'

interface Testimonial {
  id: number
  img: string
  name: string
  role: string
  info: string
}

export function LandingTestimonials() {
  return (
    <div style={{ background: 'var(--brand-dark)' }} className="py-12">
      <div className="mb-8 px-4">
        <h3 className="text-center text-4xl font-semibold text-white">
          Quem já chamou um Movux.
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-white/70">
          Clientes que já mudaram de casa ou despacharam um frete, e
          transportadores que já rodam com a gente.
        </p>
      </div>
      <div className="relative overflow-x-hidden p-4">
        <div
          className="absolute inset-y-0 left-0 z-10 w-24"
          style={{
            background:
              'linear-gradient(to right, var(--brand-dark), transparent)',
          }}
        />

        <div className="mb-4 flex items-center">
          <TestimonialList list={TESTIMONIALS.top} duration={125} />
          <TestimonialList list={TESTIMONIALS.top} duration={125} />
          <TestimonialList list={TESTIMONIALS.top} duration={125} />
        </div>
        <div className="mb-4 flex items-center">
          <TestimonialList list={TESTIMONIALS.middle} duration={75} reverse />
          <TestimonialList list={TESTIMONIALS.middle} duration={75} reverse />
          <TestimonialList list={TESTIMONIALS.middle} duration={75} reverse />
        </div>
        <div className="flex items-center">
          <TestimonialList list={TESTIMONIALS.bottom} duration={275} />
          <TestimonialList list={TESTIMONIALS.bottom} duration={275} />
          <TestimonialList list={TESTIMONIALS.bottom} duration={275} />
        </div>

        <div
          className="absolute inset-y-0 right-0 z-10 w-24"
          style={{
            background:
              'linear-gradient(to left, var(--brand-dark), transparent)',
          }}
        />
      </div>
    </div>
  )
}

function TestimonialList({
  list,
  reverse = false,
  duration = 50,
}: {
  list: readonly Testimonial[]
  reverse?: boolean
  duration?: number
}) {
  return (
    <motion.div
      initial={{ translateX: reverse ? '-100%' : '0%' }}
      animate={{ translateX: reverse ? '0%' : '-100%' }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      className="flex gap-4 px-2"
    >
      {list.map((t) => (
        <div
          key={t.id}
          className="relative grid w-[420px] shrink-0 grid-cols-[7rem_1fr] overflow-hidden rounded-lg"
        >
          <img src={t.img} alt="" className="h-full w-full object-cover" />
          <div className="bg-background p-4">
            <span className="text-foreground mb-1 block text-base font-semibold">
              {t.name}
            </span>
            <span
              className="mb-2 block text-xs font-medium"
              style={{ color: 'var(--brand-base)' }}
            >
              {t.role}
            </span>
            <span className="text-muted-foreground block text-sm">
              {t.info}
            </span>
          </div>
        </div>
      ))}
    </motion.div>
  )
}

const TESTIMONIALS: Record<
  'top' | 'middle' | 'bottom',
  readonly Testimonial[]
> = {
  top: [
    {
      id: 1,
      img: 'https://images.unsplash.com/photo-1493135637657-c2411b3497ad?q=80&w=400&auto=format&fit=crop',
      name: 'Mariana Costa',
      role: 'Cliente · Mudança residencial',
      info: 'O transportador chegou no horário combinado, embalou tudo com cuidado e ainda avisou em cada etapa pelo app.',
    },
    {
      id: 2,
      img: 'https://images.unsplash.com/photo-1608535002897-27b2aa592456?q=80&w=400&auto=format&fit=crop',
      name: 'Felipe Andrade',
      role: 'Cliente · Frete comercial',
      info: 'Precisava mover o estoque da loja num fim de semana. A fila de propostas trouxe 3 transportadores em menos de uma hora.',
    },
    {
      id: 3,
      img: 'https://images.unsplash.com/photo-1600725935160-f67ee4f6084a?q=80&w=400&auto=format&fit=crop',
      name: 'Renata Lima',
      role: 'Cliente · Mudança residencial',
      info: 'Achei que ia ser um estresse mudar de apartamento, mas o check-in de segurança me deixou tranquila o tempo todo.',
    },
    {
      id: 4,
      img: 'https://images.unsplash.com/photo-1614018453562-77f6180ce036?q=80&w=400&auto=format&fit=crop',
      name: 'Otávio Barros',
      role: 'Cliente · Entrega',
      info: 'Preço justo, sem susto na hora de pagar. O valor sugerido bateu certinho com o que foi cobrado.',
    },
  ],
  middle: [
    {
      id: 1,
      img: 'https://images.unsplash.com/photo-1543499459-d1460946bdc6?q=80&w=400&auto=format&fit=crop',
      name: 'Carlos Mendes',
      role: 'Transportador autônomo',
      info: 'Antes eu dependia de indicação. Hoje entro na fila e recebo pedido direto — sem intermediário levando comissão escondida.',
    },
    {
      id: 2,
      img: 'https://images.unsplash.com/photo-1559487316-597b9fae4158?q=80&w=400&auto=format&fit=crop',
      name: 'Fernanda Lima',
      role: 'Transportadora',
      info: 'O prazo calculado automaticamente me ajuda a não perder proposta por demora. Já fechei 12 fretes em 2 meses.',
    },
    {
      id: 3,
      img: 'https://images.unsplash.com/photo-1624137527136-66e631bdaa0e?q=80&w=400&auto=format&fit=crop',
      name: 'Roberto Alves',
      role: 'Transportador',
      info: 'A avaliação pública dos meus fretes virou meu portfólio. Cliente novo já confia antes de eu chegar.',
    },
    {
      id: 4,
      img: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=400&auto=format&fit=crop',
      name: 'Ana Torres',
      role: 'Transportadora · Frota',
      info: 'Cadastrei os veículos da empresa e cada motorista assume seu próprio frete pela fila de propostas.',
    },
  ],
  bottom: [
    {
      id: 1,
      img: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?q=80&w=400&auto=format&fit=crop',
      name: 'João Pedro Silva',
      role: 'Cliente',
      info: 'Já usei pra duas mudanças na cidade. Nas duas vezes o transportador tinha nota alta e cumpriu tudo certinho.',
    },
    {
      id: 2,
      img: 'https://images.unsplash.com/photo-1614018453562-77f6180ce036?q=80&w=400&auto=format&fit=crop',
      name: 'Camila Rocha',
      role: 'Cliente',
      info: 'O que mais gostei foi acompanhar o trajeto em tempo real — nada de ficar esperando sem saber onde está minha carga.',
    },
    {
      id: 3,
      img: 'https://images.unsplash.com/photo-1608535002897-27b2aa592456?q=80&w=400&auto=format&fit=crop',
      name: 'Diego Martins',
      role: 'Transportador',
      info: 'Verificação de documento deu trabalho no começo, mas hoje é o que faz cliente confiar em mim sem me conhecer.',
    },
    {
      id: 4,
      img: 'https://images.unsplash.com/photo-1493135637657-c2411b3497ad?q=80&w=400&auto=format&fit=crop',
      name: 'Patrícia Nunes',
      role: 'Cliente',
      info: 'Recebi 4 propostas em 20 minutos. Escolhi pelo preço e pela nota do transportador — decisão fácil.',
    },
  ],
} as const
