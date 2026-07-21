# S8-T6 — Plan

## 1. Ícone por tipo — `components/features/admin/document-type-icon.tsx` (novo)

```tsx
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
```

## 2. Aplicar no card — `components/features/admin/document-card.tsx` (modificado)

Header ganha o ícone ao lado do título (mesma posição do `ShipmentTypeIcon` nos cards de frete):
```tsx
<CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
  <div className="flex items-center gap-3">
    {document.type && <DocumentTypeIcon type={document.type} />}
    <CardTitle className="text-base">
      {document.type ? CARRIER_DOCUMENT_TYPE_LABELS[document.type] : '—'}
    </CardTitle>
  </div>
  {document.status && <DocumentStatusBadge status={document.status} />}
</CardHeader>
```
Nenhuma outra mudança no arquivo — ações, dialogs e mutations ficam exatamente como estão.

---

## Ordem de execução (sub-steps)

1. `document-type-icon.tsx` (sem dependência)
2. `document-card.tsx` — adiciona o ícone no header (depende de 1)
3. Lint/typecheck escopo isolado + QA manual (verificações, dashboard, responsivo 375px/desktop, confirmar nenhuma regressão nas ações)

## Test Strategy (detalhe)

**UI**: renderizar `/admin/verifications` com documentos reais (idealmente cobrindo os 7 tipos, ou pelo menos os que existirem nos dados de teste), conferir ícone+cor por tipo, `/admin/dashboard` reflete automaticamente, responsivo 375px/desktop, clicar em "Aprovar"/"Rejeitar"/"Checagem externa"/"Ver arquivo" pra confirmar que nada quebrou.
