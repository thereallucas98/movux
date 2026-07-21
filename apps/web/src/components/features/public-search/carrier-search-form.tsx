'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import { Button } from '~/components/ui/button'
import { VEHICLE_TYPE_LABELS } from '~/components/features/shipments/shipment-labels'
import { usePublicCities } from '~/graphql/hooks/use-public-cities'
import type { VehicleType } from '~/graphql/generated/types'

// 'ANY' é "qualquer veículo serve" (preferência de frete), não um tipo real
// de veículo que um carrier possui — não faz sentido como opção de filtro aqui.
const VEHICLE_TYPE_OPTIONS = (
  Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[]
)
  .filter((type) => type !== 'ANY')
  .map((type) => ({ type, label: VEHICLE_TYPE_LABELS[type] }))

interface CarrierSearchFormProps {
  onSearch: (filter: { cityId: string; vehicleType?: VehicleType }) => void
}

export function CarrierSearchForm({ onSearch }: CarrierSearchFormProps) {
  const { data: cities = [], isLoading: isLoadingCities } = usePublicCities()
  const [cityId, setCityId] = useState<string>()
  const [vehicleType, setVehicleType] = useState<VehicleType>()

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (!cityId) return
        onSearch({ cityId, vehicleType })
      }}
    >
      <div className="flex-1">
        <AdaptiveSelect
          label="Cidade"
          options={cities}
          getOptionValue={(city) => city.id}
          getOptionLabel={(city) => `${city.name} — ${city.stateUf}`}
          value={cityId}
          onValueChange={setCityId}
          placeholder={isLoadingCities ? 'Carregando cidades…' : 'Selecione a cidade'}
        />
      </div>

      <div className="flex-1">
        <AdaptiveSelect
          label="Tipo de veículo (opcional)"
          options={VEHICLE_TYPE_OPTIONS}
          getOptionValue={(option) => option.type}
          getOptionLabel={(option) => option.label}
          value={vehicleType}
          onValueChange={(value) => setVehicleType(value as VehicleType)}
          placeholder="Qualquer tipo"
        />
      </div>

      <Button type="submit" size="md" disabled={!cityId} className="sm:w-auto">
        <Search className="size-4" />
        Buscar
      </Button>
    </form>
  )
}
