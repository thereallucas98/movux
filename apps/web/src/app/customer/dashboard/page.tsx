import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { ShipmentsList } from '~/components/features/shipments/shipments-list'

export default function CustomerDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
        <Button asChild className="min-h-12 w-full sm:w-auto">
          <Link href="/customer/shipments/new">Criar frete</Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            Últimos fretes
          </h2>
          <Link
            href="/customer/shipments"
            className="text-primary text-sm font-medium hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <ShipmentsList limit={5} />
      </div>
    </div>
  )
}
