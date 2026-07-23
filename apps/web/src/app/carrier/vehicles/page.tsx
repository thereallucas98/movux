import { VehicleList } from '~/components/features/vehicles/vehicle-list'

export default function CarrierVehiclesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Meus veículos</h1>
      <VehicleList />
    </div>
  )
}
