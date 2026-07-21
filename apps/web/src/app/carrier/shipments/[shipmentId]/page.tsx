import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { CarrierShipmentDetailView } from '~/components/features/shipments/carrier-shipment-detail-view'

export default async function CarrierShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>
}) {
  const { shipmentId } = await params

  return (
    <div className="space-y-4">
      <Link
        href="/carrier/shipments"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <CarrierShipmentDetailView shipmentId={shipmentId} />
    </div>
  )
}
