import { ShipmentsList } from '~/components/features/shipments/shipments-list'

export default function CustomerShipmentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Meus fretes</h1>
      <ShipmentsList />
    </div>
  )
}
