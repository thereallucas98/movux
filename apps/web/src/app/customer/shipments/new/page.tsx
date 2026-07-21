import { Suspense } from 'react'

import { CreateShipmentForm } from '~/components/features/shipments/create-shipment-form'

export default function NewShipmentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Novo frete</h1>
      <Suspense fallback={null}>
        <CreateShipmentForm />
      </Suspense>
    </div>
  )
}
