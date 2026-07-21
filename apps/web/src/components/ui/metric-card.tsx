import type { ComponentType } from 'react'
import { cn } from '~/lib/utils'
import { Card, CardContent } from './card'

interface MetricCardProps {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconClassName,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full lg:size-12',
            iconClassName,
          )}
        >
          <Icon className="size-5 lg:size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs uppercase">
            {label}
          </p>
          <p className="text-foreground truncate text-lg font-bold lg:text-2xl">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
