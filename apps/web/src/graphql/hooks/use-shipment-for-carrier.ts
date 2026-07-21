'use client'

import { useQuery } from '@tanstack/react-query'

import {
  ShipmentForCarrierDocument,
  type ShipmentForCarrierQuery,
  type ShipmentForCarrierQueryVariables,
} from '~/graphql/generated/types'
import { graphqlClient } from '~/lib/graphql-client'

export function useShipmentForCarrier(id: string) {
  return useQuery({
    queryKey: ['shipment-for-carrier', id],
    queryFn: async () => {
      const result = await graphqlClient.request<
        ShipmentForCarrierQuery,
        ShipmentForCarrierQueryVariables
      >(ShipmentForCarrierDocument, { id })
      return result.shipmentForCarrier ?? null
    },
    enabled: Boolean(id),
    // Componente trata o próprio estado de erro (EmptyState) — mesmo
    // aprendizado do use-shipment.ts (S8-T4): sem isso, o toast global
    // vaza a resposta GraphQL crua.
    meta: { silent: true },
  })
}
