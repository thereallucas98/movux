import { CarrierDocumentUploadList } from '~/components/features/carrier-documents/carrier-document-upload-list'

export default function CarrierDocumentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Meus documentos</h1>
      <CarrierDocumentUploadList />
    </div>
  )
}
