'use client'

import { useState } from 'react'
import { AdaptiveSelect } from '~/components/ui/adaptive-select'
import { EmptyState } from '~/components/ui/empty-state'
import { Skeleton } from '~/components/ui/skeleton'
import type { VerificationStatus } from '~/graphql/generated/types'
import { useCarrierDocuments } from '~/graphql/hooks/use-carrier-documents'
import { DocumentCard } from './document-card'

const STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'REJECTED', label: 'Rejeitados' },
]

export function DocumentList({ limit }: { limit?: number } = {}) {
  const [status, setStatus] = useState<VerificationStatus | undefined>(
    'PENDING',
  )

  const { data, isLoading, isError } = useCarrierDocuments({
    status,
    ...(limit ? { limit } : {}),
  })
  const documents = data?.data ?? []

  return (
    <div className="space-y-4">
      <AdaptiveSelect
        options={STATUS_OPTIONS}
        getOptionValue={(o) => o.value}
        getOptionLabel={(o) => o.label}
        value={status}
        onValueChange={setStatus}
        placeholder="Todos os status"
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          title="Não foi possível carregar os documentos"
          description="Tente recarregar a página."
        />
      )}

      {!isLoading && !isError && documents.length === 0 && (
        <EmptyState
          title="Nenhum documento"
          description="Não há documentos com esse filtro no momento."
        />
      )}

      {!isLoading && !isError && documents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map(
            (doc) => doc.id && <DocumentCard key={doc.id} document={doc} />,
          )}
        </div>
      )}
    </div>
  )
}
