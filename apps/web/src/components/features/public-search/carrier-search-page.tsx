'use client'

import { useState } from 'react'

import type { VehicleType } from '~/graphql/generated/types'
import { CarrierSearchForm } from './carrier-search-form'
import { CarrierSearchResults } from './carrier-search-results'

interface SearchFilter {
  cityId: string
  vehicleType?: VehicleType
}

export function CarrierSearchPage() {
  const [filter, setFilter] = useState<SearchFilter | null>(null)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-foreground text-h2 font-bold">
          Encontre transportadores verificados na sua cidade
        </h1>
        <p className="text-muted-foreground">
          Sem cadastro. Veja avaliação e volume de fretes antes de decidir.
        </p>
      </header>

      <CarrierSearchForm onSearch={setFilter} />

      {filter && (
        <CarrierSearchResults
          cityId={filter.cityId}
          vehicleType={filter.vehicleType}
        />
      )}
    </div>
  )
}
