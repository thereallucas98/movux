'use client'

import { Check, ShieldQuestion, X } from 'lucide-react'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { IconButton } from '~/components/ui/icon-button'
import type { CarrierDocumentsQuery } from '~/graphql/generated/types'
import { CARRIER_DOCUMENT_TYPE_LABELS } from './carrier-document-labels'

type CarrierDocumentItem = NonNullable<
  NonNullable<CarrierDocumentsQuery['carrierDocuments']>['data']
>[number]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: CarrierDocumentItem | null
  onApprove: () => void
  onReject: () => void
  onExternalValidation: () => void
  isPending: boolean
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().split('?')[0].endsWith('.pdf')
}

// Achado #14 da QA momento-zero: "Ver arquivo" abria o documento numa aba
// nova (link puro) — agora abre num modal com o documento visível e as
// ações (Aprovar/Rejeitar/Checagem externa) como ícones, sem sair da tela.
export function DocumentViewerDialog({
  open,
  onOpenChange,
  document,
  onApprove,
  onReject,
  onExternalValidation,
  isPending,
}: Props) {
  if (!document) return null

  const fileUrl = document.fileUrl ?? ''
  const isPendingStatus = document.status === 'PENDING'

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        document.type
          ? CARRIER_DOCUMENT_TYPE_LABELS[document.type]
          : 'Documento'
      }
      footer={
        <div className="flex w-full justify-end gap-2">
          {isPendingStatus && (
            <>
              <IconButton
                aria-label="Aprovar"
                disabled={isPending}
                onClick={onApprove}
              >
                <Check />
              </IconButton>
              <IconButton
                aria-label="Rejeitar"
                variant="danger"
                disabled={isPending}
                onClick={onReject}
              >
                <X />
              </IconButton>
            </>
          )}
          <IconButton
            aria-label="Checagem externa"
            onClick={onExternalValidation}
          >
            <ShieldQuestion />
          </IconButton>
        </div>
      }
    >
      <div className="flex justify-center">
        {fileUrl && isPdfUrl(fileUrl) ? (
          <iframe
            src={fileUrl}
            title="Documento"
            className="h-[70vh] w-full rounded-md border"
          />
        ) : (
          <img
            src={fileUrl}
            alt="Documento enviado pelo transportador"
            className="max-h-[70vh] w-full rounded-md border object-contain"
          />
        )}
      </div>
    </AdaptiveDialog>
  )
}
