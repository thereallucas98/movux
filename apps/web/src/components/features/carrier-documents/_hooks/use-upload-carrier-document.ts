'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CarrierDocumentType } from '~/graphql/generated/types'
import { ApiError } from '~/lib/api-error'
import type { CarrierDocumentDto } from './use-my-carrier-documents'

interface UploadCarrierDocumentInput {
  type: CarrierDocumentType
  file: File
}

async function uploadCarrierDocument(
  input: UploadCarrierDocumentInput,
): Promise<CarrierDocumentDto> {
  const formData = new FormData()
  formData.append('type', input.type)
  formData.append('file', input.file)

  const res = await fetch('/api/me/documents', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  if (!res.ok) throw await ApiError.fromResponse(res)
  return res.json() as Promise<CarrierDocumentDto>
}

export function useUploadCarrierDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadCarrierDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-carrier-documents'] })
    },
    meta: { successMessage: 'Documento enviado com sucesso' },
  })
}
