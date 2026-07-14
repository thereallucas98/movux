'use client'

import { ArrowLeftRight, CalendarOff, Megaphone } from 'lucide-react'
import { useState } from 'react'

import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'
import { cn } from '~/lib/utils'

import { RequestOfferForm } from './request-offer-form'
import { RequestSwapForm } from './request-swap-form'
import { RequestTimeOffForm } from './request-time-off-form'

interface Props {
  workspaceId: string
  workspaceTimezone: string
  meId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'pick' | 'swap' | 'offer' | 'time_off'

const TYPE_CARDS = [
  {
    key: 'swap' as const,
    label: 'Trocar turno',
    description: 'Trocar com um colega',
    Icon: ArrowLeftRight,
  },
  {
    key: 'offer' as const,
    label: 'Oferecer turno',
    description: 'Oferecer para a equipe',
    Icon: Megaphone,
  },
  {
    key: 'time_off' as const,
    label: 'Solicitar folga',
    description: 'Pedir folga com motivo',
    Icon: CalendarOff,
  },
]

export function NewRequestWizard({
  workspaceId,
  workspaceTimezone,
  meId,
  open,
  onOpenChange,
}: Props) {
  const [step, setStep] = useState<Step>('pick')

  function handleClose() {
    setStep('pick')
    onOpenChange(false)
  }

  function handleSuccess() {
    setStep('pick')
    onOpenChange(false)
  }

  function handleBack() {
    setStep('pick')
  }

  const description = step === 'pick' ? 'Escolha o tipo' : 'Passo 2 de 2'

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}
      title="Novo pedido"
      description={description}
      breakpoint="mobileOrTablet"
      contentClassName="md:max-w-[42rem] lg:max-w-[56rem]"
    >
      {step === 'pick' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TYPE_CARDS.map(({ key, label, description: desc, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStep(key)}
              className={cn(
                'border-border bg-background hover:bg-accent flex flex-col items-start gap-3 rounded-[12px] border p-4 text-left transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              )}
            >
              <div className="bg-muted flex size-10 items-center justify-center rounded-[8px]">
                <Icon className="text-foreground size-5" aria-hidden />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-foreground text-[14px] font-semibold">
                  {label}
                </span>
                <span className="text-muted-foreground text-[13px]">
                  {desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === 'swap' && (
        <RequestSwapForm
          workspaceId={workspaceId}
          workspaceTimezone={workspaceTimezone}
          meId={meId}
          onSuccess={handleSuccess}
          onBack={handleBack}
        />
      )}

      {step === 'offer' && (
        <RequestOfferForm
          workspaceId={workspaceId}
          workspaceTimezone={workspaceTimezone}
          onSuccess={handleSuccess}
          onBack={handleBack}
        />
      )}

      {step === 'time_off' && (
        <RequestTimeOffForm
          workspaceId={workspaceId}
          onSuccess={handleSuccess}
          onBack={handleBack}
        />
      )}
    </AdaptiveDialog>
  )
}
