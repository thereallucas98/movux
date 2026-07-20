'use client'

import { useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import type { CarrierDocumentsQuery } from '~/graphql/generated/types'
import { useApproveDocument } from '~/graphql/hooks/use-approve-document'
import { useRecordExternalValidation } from '~/graphql/hooks/use-record-external-validation'
import { useRejectDocument } from '~/graphql/hooks/use-reject-document'
import {
  CARRIER_DOCUMENT_TYPE_LABELS,
  externalValidationResultLabel,
} from './carrier-document-labels'
import { DocumentStatusBadge } from './document-status-badge'
import { ExternalValidationDialog } from './external-validation-dialog'
import { RejectDocumentDialog } from './reject-document-dialog'

type CarrierDocumentItem = NonNullable<
  NonNullable<CarrierDocumentsQuery['carrierDocuments']>['data']
>[number]

export function DocumentCard({ document }: { document: CarrierDocumentItem }) {
  const approve = useApproveDocument()
  const reject = useRejectDocument()
  const recordExternalValidation = useRecordExternalValidation()

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [externalValidationDialogOpen, setExternalValidationDialogOpen] =
    useState(false)

  const documentId = document.id
  if (!documentId) return null

  const isPending = document.status === 'PENDING'

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">
          {document.type ? CARRIER_DOCUMENT_TYPE_LABELS[document.type] : '—'}
        </CardTitle>
        {document.status && <DocumentStatusBadge status={document.status} />}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">{document.carrierName ?? '—'}</p>
        <p className="text-muted-foreground">{document.carrierEmail ?? '—'}</p>
        <a
          href={document.fileUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-block hover:underline"
        >
          Ver arquivo
        </a>
        {document.status === 'REJECTED' && document.rejectionReason && (
          <p className="text-destructive">Motivo: {document.rejectionReason}</p>
        )}
        {document.externalValidation && (
          <p className="text-muted-foreground">
            Checagem externa:{' '}
            {externalValidationResultLabel(
              document.externalValidation.result ?? '',
            )}
            {document.externalValidation.notes &&
              ` — ${document.externalValidation.notes}`}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {isPending && (
          <Button
            type="button"
            size="sm"
            onClick={() => approve.mutate(documentId)}
            disabled={approve.isPending}
          >
            Aprovar
          </Button>
        )}
        {isPending && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setRejectDialogOpen(true)}
          >
            Rejeitar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExternalValidationDialogOpen(true)}
        >
          Checagem externa
        </Button>
      </CardFooter>

      <RejectDocumentDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onSubmit={(rejectionReason) =>
          reject.mutate(
            { documentId, rejectionReason },
            { onSuccess: () => setRejectDialogOpen(false) },
          )
        }
        isPending={reject.isPending}
      />

      <ExternalValidationDialog
        open={externalValidationDialogOpen}
        onOpenChange={setExternalValidationDialogOpen}
        onSubmit={(values) =>
          recordExternalValidation.mutate(
            { documentId, input: values },
            { onSuccess: () => setExternalValidationDialogOpen(false) },
          )
        }
        isPending={recordExternalValidation.isPending}
      />
    </Card>
  )
}
