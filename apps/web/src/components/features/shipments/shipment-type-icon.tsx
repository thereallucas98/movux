import { Home, MoreHorizontal, Package, Truck } from 'lucide-react'
import type { ComponentType } from 'react'
import type { ShipmentType } from '~/graphql/generated/types'
import { cn } from '~/lib/utils'

const TYPE_META: Record<
  ShipmentType,
  { icon: ComponentType<{ className?: string }>; classes: string }
> = {
  RESIDENTIAL_MOVING: { icon: Home, classes: 'bg-blue-light text-blue-dark' },
  COMMERCIAL_FREIGHT: {
    icon: Truck,
    classes: 'bg-purple-light text-purple-dark',
  },
  DELIVERY: { icon: Package, classes: 'bg-orange-light text-orange-dark' },
  OTHER: {
    icon: MoreHorizontal,
    classes: 'bg-pink-light text-pink-dark',
  },
}

export function ShipmentTypeIcon({
  type,
  className,
}: {
  type: ShipmentType
  className?: string
}) {
  const { icon: Icon, classes } = TYPE_META[type]
  return (
    <div
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full',
        classes,
        className,
      )}
    >
      <Icon className="size-5" />
    </div>
  )
}
