'use client'

import { useQuery } from '@tanstack/react-query'
import type {
  CarrierDocumentType,
  VerificationStatus,
} from '~/graphql/generated/types'
import { api } from '~/lib/api-client'

export interface CarrierDocumentDto {
  id: string
  type: CarrierDocumentType
  fileUrl: string
  status: VerificationStatus
  rejectionReason: string | null
  uploadedAt: string
}

export function useMyCarrierDocuments() {
  return useQuery({
    queryKey: ['my-carrier-documents'],
    queryFn: () => api.get<CarrierDocumentDto[]>('/api/me/documents'),
  })
}
