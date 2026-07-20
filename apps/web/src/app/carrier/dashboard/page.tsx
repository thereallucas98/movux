import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { BrowseShipmentsList } from '~/components/features/shipments/browse-shipments-list'
import { MyProposalsList } from '~/components/features/proposals/my-proposals-list'

export default function CarrierDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
        <Button asChild className="min-h-12 w-full sm:w-auto">
          <Link href="/carrier/shipments">Buscar fretes</Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            Fretes disponíveis
          </h2>
          <Link
            href="/carrier/shipments"
            className="text-primary text-sm font-medium hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <BrowseShipmentsList limit={3} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            Minhas propostas
          </h2>
          <Link
            href="/carrier/proposals"
            className="text-primary text-sm font-medium hover:underline"
          >
            Ver todas
          </Link>
        </div>
        <MyProposalsList limit={3} />
      </div>
    </div>
  )
}
