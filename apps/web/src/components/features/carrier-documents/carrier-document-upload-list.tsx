'use client'

import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import { CARRIER_DOCUMENT_TYPES } from '~/server/schemas/carrier-document.schema'
import { useMyCarrierDocuments } from './_hooks/use-my-carrier-documents'
import { DocumentUploadCard } from './document-upload-card'

export function CarrierDocumentUploadList() {
  const { data: documents = [], isLoading, isError } = useMyCarrierDocuments()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <EmptyState
        title="Não foi possível carregar seus documentos"
        description="Tente recarregar a página."
      />
    )
  }

  return (
    <div className="space-y-4">
      {CARRIER_DOCUMENT_TYPES.map((type) => {
        const latest = documents.find((doc) => doc.type === type) ?? null
        return <DocumentUploadCard key={type} type={type} document={latest} />
      })}
    </div>
  )
}
