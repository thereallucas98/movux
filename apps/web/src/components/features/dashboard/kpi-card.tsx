import type { ReactNode } from 'react'

interface KpiCardProps {
  icon: ReactNode
  label: string
  value: string
}

export function KpiCard({ icon, label, value }: KpiCardProps) {
  return (
    <div
      data-slot="kpi-card"
      className="border-border bg-background flex flex-col gap-4 rounded-[12px] border p-6"
    >
      <div className="text-muted-foreground flex items-center gap-3">
        <span className="size-5">{icon}</span>
        <span className="text-[12px] leading-[16px] font-medium tracking-[0.6px] uppercase">
          {label}
        </span>
      </div>
      <p className="text-foreground text-[28px] leading-[32px] font-bold">
        {value}
      </p>
    </div>
  )
}
