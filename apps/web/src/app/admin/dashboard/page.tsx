import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { DocumentList } from '~/components/features/admin/document-list'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-foreground text-2xl font-bold">Dashboard</h1>
        <Button asChild className="min-h-12 w-full sm:w-auto">
          <Link href="/admin/verifications">Ver verificações</Link>
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground text-lg font-semibold">
            Documentos pendentes
          </h2>
          <Link
            href="/admin/verifications"
            className="text-primary text-sm font-medium hover:underline"
          >
            Ver todos
          </Link>
        </div>
        <DocumentList limit={3} />
      </div>
    </div>
  )
}
