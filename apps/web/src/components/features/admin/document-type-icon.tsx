import {
  Building2,
  CreditCard,
  FileText,
  Home,
  IdCard,
  UserRound,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { CarrierDocumentType } from '~/graphql/generated/types'
import { cn } from '~/lib/utils'

const TYPE_META: Record<
  CarrierDocumentType,
  { icon: ComponentType<{ className?: string }>; classes: string }
> = {
  CPF: { icon: IdCard, classes: 'bg-blue-light text-blue-dark' },
  CNH_FRONT: { icon: CreditCard, classes: 'bg-purple-light text-purple-dark' },
  CNH_BACK: { icon: CreditCard, classes: 'bg-pink-light text-pink-dark' },
  ADDRESS_PROOF: { icon: Home, classes: 'bg-orange-light text-orange-dark' },
  SELFIE: { icon: UserRound, classes: 'bg-yellow-light text-yellow-dark' },
  CNPJ: { icon: Building2, classes: 'bg-green-light text-green-dark' },
  SOCIAL_CONTRACT: { icon: FileText, classes: 'bg-red-light text-red-dark' },
}

export function DocumentTypeIcon({
  type,
  className,
}: {
  type: CarrierDocumentType
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
