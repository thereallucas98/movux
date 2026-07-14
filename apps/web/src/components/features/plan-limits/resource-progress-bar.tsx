import { Progress } from '~/components/ui/progress'
import { cn } from '~/lib/utils'

export interface ResourceProgressBarProps {
  label: string
  current: number
  limit: number | null
  percent: number | null
  exhausted?: boolean
  className?: string
}

export function ResourceProgressBar({
  label,
  current,
  limit,
  percent,
  exhausted = false,
  className,
}: ResourceProgressBarProps) {
  if (limit === null) {
    return (
      <div className={cn('flex items-center justify-between gap-3', className)}>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs tracking-wide uppercase">
          Ilimitado
        </span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            'tabular-nums',
            exhausted
              ? 'text-destructive font-semibold'
              : 'text-muted-foreground',
          )}
        >
          {current} / {limit}
          {percent !== null && (
            <span className="text-muted-foreground ml-1">({percent}%)</span>
          )}
        </span>
      </div>
      <Progress value={percent ?? 0} />
    </div>
  )
}
