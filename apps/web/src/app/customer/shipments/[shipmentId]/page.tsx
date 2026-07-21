import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ShipmentDetailView } from '~/components/features/shipments/shipment-detail-view'

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>
}) {
  const { shipmentId } = await params

  return (
    <div className="space-y-4">
      <Link
        href="/customer/shipments"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" /> Voltar
      </Link>
      <ShipmentDetailView shipmentId={shipmentId} />
    </div>
  )
}
