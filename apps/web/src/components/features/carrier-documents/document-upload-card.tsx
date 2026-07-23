'use client'

import { useState } from 'react'
import { CARRIER_DOCUMENT_TYPE_LABELS } from '~/components/features/admin/carrier-document-labels'
import { DocumentStatusBadge } from '~/components/features/admin/document-status-badge'
import { DocumentTypeIcon } from '~/components/features/admin/document-type-icon'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { FileDropzone } from '~/components/ui/file-dropzone'
import type { CarrierDocumentType } from '~/graphql/generated/types'
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_WHITELIST,
} from '~/server/schemas/carrier-document.schema'
import { useUploadCarrierDocument } from './_hooks/use-upload-carrier-document'
import type { CarrierDocumentDto } from './_hooks/use-my-carrier-documents'

interface Props {
  type: CarrierDocumentType
  document: CarrierDocumentDto | null
}

export function DocumentUploadCard({ type, document }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const upload = useUploadCarrierDocument()

  const canUpload = !document || document.status === 'REJECTED'

  function handleSubmit() {
    if (!file) return
    upload.mutate({ type, file }, { onSuccess: () => setFile(null) })
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <DocumentTypeIcon type={type} />
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-semibold">
              {CARRIER_DOCUMENT_TYPE_LABELS[type]}
            </p>
            {document && (
              <p className="text-muted-foreground text-sm">
                Enviado em{' '}
                {new Date(document.uploadedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          {document && <DocumentStatusBadge status={document.status} />}
        </div>

        {document?.status === 'REJECTED' && document.rejectionReason && (
          <p className="text-destructive text-sm">
            Motivo: {document.rejectionReason}
          </p>
        )}

        {canUpload && (
          <div className="space-y-2">
            <FileDropzone
              value={file}
              onChange={setFile}
              accept={DOCUMENT_MIME_WHITELIST.join(',')}
              acceptLabel="JPG, PNG ou PDF"
              maxSizeBytes={DOCUMENT_MAX_BYTES}
              disabled={upload.isPending}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!file || upload.isPending}
            >
              {upload.isPending ? 'Enviando...' : 'Enviar documento'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
