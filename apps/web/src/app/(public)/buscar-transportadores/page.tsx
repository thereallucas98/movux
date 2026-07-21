import type { Metadata } from 'next'

import { CarrierSearchPage } from '~/components/features/public-search/carrier-search-page'

export const metadata: Metadata = {
  title: 'Buscar transportadores — Movux',
  description:
    'Encontre transportadores verificados na sua cidade, sem precisar de conta.',
}

export default function BuscarTransportadoresPage() {
  return <CarrierSearchPage />
}
