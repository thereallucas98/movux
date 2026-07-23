import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { CarrierPortfolioView } from '~/components/features/public-search/carrier-portfolio-view'

export const metadata: Metadata = {
  title: 'Perfil do transportador — Movux',
  description: 'Veja o perfil, avaliações e veículos deste transportador.',
}

export default async function CarrierPortfolioPage({
  params,
}: {
  params: Promise<{ carrierId: string }>
}) {
  const { carrierId } = await params
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10 sm:px-6">
      <Link
        href="/buscar-transportadores"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <CarrierPortfolioView userId={carrierId} />
    </div>
  )
}
