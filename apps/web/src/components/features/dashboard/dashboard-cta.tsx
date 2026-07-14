import { Plus } from 'lucide-react'
import Link from 'next/link'

const COORD_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COORDENADOR'])

interface DashboardCtaProps {
  role: string
}

export function DashboardCta({ role }: DashboardCtaProps) {
  const isCoord = COORD_ROLES.has(role)
  const href = isCoord ? '/schedules' : '/shifts'
  const label = isCoord ? 'Abrir nova escala' : 'Ver turnos abertos'

  return (
    <div className="border-border flex items-center justify-center border-t px-6 py-5">
      <Link
        href={href}
        className="text-primary focus-visible:ring-ring inline-flex items-center gap-1 text-[14px] font-medium hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus className="size-5" aria-hidden />
        {label}
      </Link>
    </div>
  )
}
