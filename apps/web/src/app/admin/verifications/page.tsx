import { DocumentList } from '~/components/features/admin/document-list'

export default function AdminVerificationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Verificações</h1>
      <DocumentList />
    </div>
  )
}
