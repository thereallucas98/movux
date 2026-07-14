import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { Tag } from '~/components/ui/tag'
import { categoryVisual } from '~/lib/format/category-visual'
import { cn } from '~/lib/utils'
import {
  assignmentRepository,
  categoryRepository,
  shiftRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'
import { getCategoryBreakdown } from '~/server/use-cases'

interface CategoriesBreakdownProps {
  workspaceId: string
  fromAt: Date
  toAt: Date
  principal: { userId: string; role: string }
  className?: string
}

export async function CategoriesBreakdown({
  workspaceId,
  fromAt,
  toAt,
  principal,
  className,
}: CategoriesBreakdownProps) {
  const result = await getCategoryBreakdown(
    workspaceRepository,
    workspaceMembershipRepository,
    categoryRepository,
    shiftRepository,
    assignmentRepository,
    principal,
    { workspaceId, fromAt, toAt, limit: 5 },
  )

  return (
    <section
      aria-labelledby="categories-heading"
      className={cn(
        'border-border bg-background flex flex-col overflow-hidden rounded-[12px] border',
        className,
      )}
    >
      <header className="border-border flex items-center justify-between border-b px-6 py-5">
        <h2
          id="categories-heading"
          className="text-muted-foreground text-[12px] leading-[16px] font-medium tracking-[0.6px] uppercase"
        >
          Setores
        </h2>
        <Link
          href="/settings"
          className="text-primary inline-flex items-center gap-1 text-[14px] font-medium hover:underline"
        >
          Gerenciar
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </header>

      {!result.success || result.data.length === 0 ? (
        <Empty />
      ) : (
        <ul className="flex flex-col gap-5 p-6">
          {result.data.map((row) => {
            const visual = categoryVisual(row.categoryId)
            return (
              <li key={row.categoryId} className="flex items-center gap-2">
                <Tag category={visual.palette}>{row.categoryName}</Tag>
                <span className="text-muted-foreground flex-1 text-right text-[14px]">
                  {row.shiftCount} turnos
                </span>
                <span className="text-foreground w-[88px] text-right text-[14px] font-semibold">
                  {row.filled}/{row.total}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Empty() {
  return (
    <p className="text-muted-foreground py-10 text-center text-[14px]">
      Workspace ainda não tem setores
    </p>
  )
}
