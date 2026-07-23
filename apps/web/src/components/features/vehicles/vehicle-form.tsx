'use client'

import { useEffect, useState } from 'react'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { YearInput } from '~/components/ui/masked-input'
import { useCreateVehicle } from '~/graphql/hooks/use-create-vehicle'
import { useUpdateVehicle } from '~/graphql/hooks/use-update-vehicle'
import { useVehicleBrands } from '~/graphql/hooks/use-vehicle-brands'
import { useVehicleModels } from '~/graphql/hooks/use-vehicle-models'
import { useVehicleTaxonomy } from '~/graphql/hooks/use-vehicle-taxonomy'
import type { MyVehiclesQuery } from '~/graphql/generated/types'

type VehicleItem = NonNullable<MyVehiclesQuery['myVehicles']>[number]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: VehicleItem | null
}

/**
 * Criação e edição de veículo — mesmo form, diferenciado por `vehicle`
 * presente. Duas cascatas ortogonais (S10-T1): Categoria → Especificação
 * (capacidade de carga, taxonomia própria) e Marca → Modelo (identidade
 * real do veículo, catálogo importado da FIPE — evita texto livre
 * inconsistente, ver docs/tasks/s10-t1-fleet-taxonomy/research.md).
 */
export function VehicleForm({ open, onOpenChange, vehicle }: Props) {
  const { data: categories = [] } = useVehicleTaxonomy()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()

  const [plate, setPlate] = useState('')
  const [year, setYear] = useState('')
  const [categoryId, setCategoryId] = useState<string>()
  const [specId, setSpecId] = useState<string>()
  const [brandId, setBrandId] = useState<string>()
  const [modelId, setModelId] = useState<string>()

  const { data: brands = [], isLoading: isLoadingBrands } =
    useVehicleBrands(categoryId)
  const { data: models = [], isLoading: isLoadingModels } =
    useVehicleModels(brandId)

  useEffect(() => {
    if (!open) return
    setPlate(vehicle?.plate ?? '')
    setYear(vehicle?.year ? String(vehicle.year) : '')
    const currentCategory = categories.find((c) =>
      c?.specs?.some((s) => s?.id === vehicle?.spec?.id),
    )
    setCategoryId(currentCategory?.id ?? undefined)
    setSpecId(vehicle?.spec?.id ?? undefined)
    setBrandId(vehicle?.model?.brand?.id ?? undefined)
    setModelId(vehicle?.model?.id ?? undefined)
  }, [open, vehicle, categories])

  const specsForCategory =
    categories.find((c) => c?.id === categoryId)?.specs ?? []

  const isPending = createVehicle.isPending || updateVehicle.isPending
  const isValid =
    plate.trim() !== '' && year.trim() !== '' && !!specId && !!modelId

  async function handleSubmit() {
    if (!specId || !modelId) return
    const input = { plate, modelId, year: Number(year), specId }

    try {
      if (vehicle?.id) {
        await updateVehicle.mutateAsync({ vehicleId: vehicle.id, input })
      } else {
        await createVehicle.mutateAsync(input)
      }
      onOpenChange(false)
    } catch {
      // erro já exibido via toast (MutationCache) — mensagem específica
      // mapeada nos hooks use-create-vehicle/use-update-vehicle
    }
  }

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={vehicle ? 'Editar veículo' : 'Cadastrar veículo'}
      breakpoint="mobile"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="md"
            onClick={handleSubmit}
            disabled={isPending || !isValid}
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="vehicle-plate">Placa</Label>
            <Input
              id="vehicle-plate"
              className="min-h-12"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <Label htmlFor="vehicle-year">Ano</Label>
            <YearInput
              id="vehicle-year"
              className="min-h-12"
              value={year}
              onChange={setYear}
            />
          </div>
        </div>

        <div>
          <Label>Categoria</Label>
          <AdaptiveSelect
            options={categories}
            getOptionValue={(c) => c?.id ?? ''}
            getOptionLabel={(c) => c?.name ?? ''}
            value={categoryId}
            onValueChange={(value) => {
              setCategoryId(value)
              setSpecId(undefined)
              setBrandId(undefined)
              setModelId(undefined)
            }}
            placeholder="Selecione a categoria"
          />
        </div>

        {categoryId && (
          <div>
            <Label>Especificação</Label>
            <AdaptiveSelect
              options={specsForCategory}
              getOptionValue={(s) => s?.id ?? ''}
              getOptionLabel={(s) =>
                s
                  ? `${s.name} (até ${s.maxWeightKg}kg / ${s.maxVolumeM3}m³)`
                  : ''
              }
              value={specId}
              onValueChange={setSpecId}
              placeholder="Selecione a especificação"
            />
          </div>
        )}

        {categoryId && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Marca</Label>
              <AdaptiveSelect
                options={brands}
                getOptionValue={(b) => b?.id ?? ''}
                getOptionLabel={(b) => b?.name ?? ''}
                value={brandId}
                onValueChange={(value) => {
                  setBrandId(value)
                  setModelId(undefined)
                }}
                placeholder={
                  isLoadingBrands ? 'Carregando…' : 'Selecione a marca'
                }
              />
            </div>
            {brandId && (
              <div>
                <Label>Modelo</Label>
                <AdaptiveSelect
                  options={models}
                  getOptionValue={(m) => m?.id ?? ''}
                  getOptionLabel={(m) => m?.name ?? ''}
                  value={modelId}
                  onValueChange={setModelId}
                  placeholder={
                    isLoadingModels ? 'Carregando…' : 'Selecione o modelo'
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AdaptiveDialog>
  )
}
