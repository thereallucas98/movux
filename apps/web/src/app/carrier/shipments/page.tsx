import { BrowseShipmentsList } from '~/components/features/shipments/browse-shipments-list'

export default function CarrierShipmentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Fretes abertos</h1>
      <BrowseShipmentsList />
    </div>
  )
}
