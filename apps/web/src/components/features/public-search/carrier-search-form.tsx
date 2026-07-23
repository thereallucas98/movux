'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import { Button } from '~/components/ui/button'
import { usePublicCities } from '~/graphql/hooks/use-public-cities'
import { useVehicleTaxonomy } from '~/graphql/hooks/use-vehicle-taxonomy'

interface CarrierSearchFormProps {
  onSearch: (filter: { cityId: string; vehicleCategoryId?: string }) => void
}

export function CarrierSearchForm({ onSearch }: CarrierSearchFormProps) {
  const { data: cities = [], isLoading: isLoadingCities } = usePublicCities()
  const { data: vehicleCategories = [], isLoading: isLoadingCategories } =
    useVehicleTaxonomy()
  const [cityId, setCityId] = useState<string>()
  const [vehicleCategoryId, setVehicleCategoryId] = useState<string>()

  return (
    <form
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (!cityId) return
        onSearch({ cityId, vehicleCategoryId })
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
          placeholder={
            isLoadingCities ? 'Carregando cidades…' : 'Selecione a cidade'
          }
        />
      </div>

      <div className="flex-1">
        <AdaptiveSelect
          label="Tipo de veículo (opcional)"
          options={vehicleCategories}
          getOptionValue={(category) => category?.id ?? ''}
          getOptionLabel={(category) => category?.name ?? ''}
          value={vehicleCategoryId}
          onValueChange={setVehicleCategoryId}
          placeholder={isLoadingCategories ? 'Carregando…' : 'Qualquer tipo'}
        />
      </div>

      <Button type="submit" size="md" disabled={!cityId} className="sm:w-auto">
        <Search className="size-4" />
        Buscar
      </Button>
    </form>
  )
}
