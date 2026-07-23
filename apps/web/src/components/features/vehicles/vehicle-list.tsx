'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { useDeactivateVehicle } from '~/graphql/hooks/use-deactivate-vehicle'
import { useMyVehicles } from '~/graphql/hooks/use-my-vehicles'
import type { MyVehiclesQuery } from '~/graphql/generated/types'
import { MAX_ACTIVE_VEHICLES_PER_CARRIER } from '~/server/use-cases/vehicles/create-vehicle.use-case'
import { DeactivateVehicleDialog } from './deactivate-vehicle-dialog'
import { VehicleForm } from './vehicle-form'

type VehicleItem = NonNullable<MyVehiclesQuery['myVehicles']>[number]

export function VehicleList() {
  const { data: vehicles = [], isLoading, isError } = useMyVehicles()
  const deactivateVehicle = useDeactivateVehicle()
  const [formOpen, setFormOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null)
  const [vehicleToDeactivate, setVehicleToDeactivate] = useState<string | null>(
    null,
  )

  function openCreateForm() {
    setEditingVehicle(null)
    setFormOpen(true)
  }

  function openEditForm(vehicle: VehicleItem) {
    setEditingVehicle(vehicle)
    setFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar seus veículos"
        description="Tente recarregar a página."
      />
    )
  }

  const limitReached = vehicles.length >= MAX_ACTIVE_VEHICLES_PER_CARRIER

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-end gap-1">
        <Button size="md" onClick={openCreateForm} disabled={limitReached}>
          <Plus className="size-4" />
          Cadastrar veículo
        </Button>
        {limitReached && (
          <p className="text-muted-foreground text-sm">
            Máximo de {MAX_ACTIVE_VEHICLES_PER_CARRIER} veículos ativos —
            desative um pra cadastrar outro.
          </p>
        )}
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          title="Nenhum veículo cadastrado"
          description="Cadastre seu veículo pra aparecer nos fretes compatíveis."
        >
          <Button size="md" onClick={openCreateForm}>
            Cadastrar veículo
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            if (!vehicle?.id) return null
            const vehicleId = vehicle.id
            return (
              <Card key={vehicleId}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="text-foreground font-semibold">
                      {vehicle.model?.brand?.name} {vehicle.model?.name} ·{' '}
                      {vehicle.year}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Placa {vehicle.plate}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {vehicle.spec?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditForm(vehicle)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setVehicleToDeactivate(vehicleId)}
                    >
                      Desativar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <VehicleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editingVehicle}
      />

      <DeactivateVehicleDialog
        open={vehicleToDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setVehicleToDeactivate(null)
        }}
        isPending={deactivateVehicle.isPending}
        onConfirm={() => {
          if (!vehicleToDeactivate) return
          deactivateVehicle.mutate(vehicleToDeactivate, {
            onSuccess: () => setVehicleToDeactivate(null),
          })
        }}
      />
    </div>
  )
}
