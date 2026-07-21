# S8-T7 — Plan

## 1. Repos — métodos de agregação novos

### `shipment.repository.ts` (modificado)
```ts
const ACTIVE_SHIPMENT_STATUSES: ShipmentStatus[] = [
  'OPEN', 'PROPOSALS_RECEIVED', 'CARRIER_SELECTED', 'COLLECTED', 'IN_TRANSIT',
]

// na interface
countActiveByCustomer(customerId: string): Promise<number>
sumFinalPriceByCustomer(customerId: string, statuses: ShipmentStatus[]): Promise<number>
countActiveByCarrier(carrierId: string): Promise<number>
sumFinalPriceByCarrier(carrierId: string, statuses: ShipmentStatus[]): Promise<number>

// na implementação
async countActiveByCustomer(customerId) {
  return prisma.shipment.count({
    where: { customerId, status: { in: ACTIVE_SHIPMENT_STATUSES } },
  })
},
async sumFinalPriceByCustomer(customerId, statuses) {
  const result = await prisma.shipment.aggregate({
    where: { customerId, status: { in: statuses } },
    _sum: { finalPriceInCents: true },
  })
  return result._sum.finalPriceInCents ?? 0
},
async countActiveByCarrier(carrierId) {
  return prisma.shipment.count({
    where: {
      status: { in: ACTIVE_SHIPMENT_STATUSES },
      proposals: { some: { carrierId, status: 'ACCEPTED' } },
    },
  })
},
async sumFinalPriceByCarrier(carrierId, statuses) {
  const result = await prisma.shipment.aggregate({
    where: {
      status: { in: statuses },
      proposals: { some: { carrierId, status: 'ACCEPTED' } },
    },
    _sum: { finalPriceInCents: true },
  })
  return result._sum.finalPriceInCents ?? 0
},
```

### `customer-profile.repository.ts` (modificado)
```ts
// interface
findMetricsByUserId(userId: string): Promise<{ avgRating: number | null; totalShipments: number } | null>

// implementação
async findMetricsByUserId(userId) {
  const profile = await prisma.customerProfile.findUnique({
    where: { userId },
    select: { avgRating: true, totalShipments: true },
  })
  if (!profile) return null
  return {
    avgRating: profile.avgRating ? Number(profile.avgRating) : null,
    totalShipments: profile.totalShipments,
  }
},
```

### `carrier-profile.repository.ts` (modificado)
```ts
// interface
findMetricsByUserId(userId: string): Promise<{ avgRating: number | null; totalShipments: number } | null>
countFlagged(): Promise<number>
countActive(): Promise<number>
countByVerificationStatus(status: VerificationStatus): Promise<number>

// implementação
async findMetricsByUserId(userId) {
  const profile = await prisma.carrierProfile.findUnique({
    where: { userId },
    select: { avgRating: true, totalShipments: true },
  })
  if (!profile) return null
  return {
    avgRating: profile.avgRating ? Number(profile.avgRating) : null,
    totalShipments: profile.totalShipments,
  }
},
async countFlagged() {
  return prisma.carrierProfile.count({ where: { isFlagged: true } })
},
async countActive() {
  return prisma.carrierProfile.count({ where: { isActive: true } })
},
async countByVerificationStatus(status) {
  return prisma.carrierProfile.count({ where: { verificationStatus: status } })
},
```

### `carrier-document.repository.ts` (modificado)
```ts
// interface
countByStatus(status: VerificationStatus): Promise<number>

// implementação
async countByStatus(status) {
  return prisma.carrierDocument.count({ where: { status } })
},
```

## 2. Use-cases novos — `server/use-cases/dashboard/`

```ts
// get-customer-dashboard-metrics.use-case.ts
export interface CustomerDashboardMetrics {
  activeShipments: number
  totalShipments: number
  totalSpentInCents: number
  avgRating: number | null
}
export type GetCustomerDashboardMetricsResult =
  | { success: true; metrics: CustomerDashboardMetrics }
  | { success: false; code: 'NOT_FOUND' }

export async function getCustomerDashboardMetrics(repos, userId) {
  const customerProfile = await repos.customerProfileRepo.findByUserId(userId)
  if (!customerProfile) return { success: false, code: 'NOT_FOUND' as const }

  const [profileMetrics, activeShipments, totalSpentInCents] = await Promise.all([
    repos.customerProfileRepo.findMetricsByUserId(userId),
    repos.shipmentRepo.countActiveByCustomer(customerProfile.id),
    repos.shipmentRepo.sumFinalPriceByCustomer(customerProfile.id, ['DELIVERED', 'REVIEWED']),
  ])

  return {
    success: true,
    metrics: {
      activeShipments,
      totalShipments: profileMetrics?.totalShipments ?? 0,
      totalSpentInCents,
      avgRating: profileMetrics?.avgRating ?? null,
    },
  }
}
```

```ts
// get-carrier-dashboard-metrics.use-case.ts — mesmo shape, mas countActiveByCarrier/sumFinalPriceByCarrier
// recebem userId direto (Proposal.carrierId referencia User.id, sem indireção de profile —
// mesmo padrão já confirmado no S8-T5 pra myQueueEntry/myProposal)
export interface CarrierDashboardMetrics {
  activeShipments: number
  totalShipments: number
  totalEarnedInCents: number
  avgRating: number | null
}
export type GetCarrierDashboardMetricsResult =
  | { success: true; metrics: CarrierDashboardMetrics }
  | { success: false; code: 'NOT_FOUND' }

export async function getCarrierDashboardMetrics(repos, userId) {
  const profileMetrics = await repos.carrierProfileRepo.findMetricsByUserId(userId)
  if (!profileMetrics) return { success: false, code: 'NOT_FOUND' as const }

  const [activeShipments, totalEarnedInCents] = await Promise.all([
    repos.shipmentRepo.countActiveByCarrier(userId),
    repos.shipmentRepo.sumFinalPriceByCarrier(userId, ['DELIVERED', 'REVIEWED']),
  ])

  return {
    success: true,
    metrics: { activeShipments, totalShipments: profileMetrics.totalShipments, totalEarnedInCents, avgRating: profileMetrics.avgRating },
  }
}
```

```ts
// get-admin-dashboard-metrics.use-case.ts — sem lookup de owner, não pode falhar
// (mesmo padrão de browseOpenShipments: só `success: true`)
export interface AdminDashboardMetrics {
  pendingDocuments: number
  flaggedCarriers: number
  verifiedCarriers: number
  activeCarriers: number
}
export interface GetAdminDashboardMetricsResult {
  success: true
  metrics: AdminDashboardMetrics
}

export async function getAdminDashboardMetrics(repos) {
  const [pendingDocuments, flaggedCarriers, verifiedCarriers, activeCarriers] = await Promise.all([
    repos.carrierDocumentRepo.countByStatus('PENDING'),
    repos.carrierProfileRepo.countFlagged(),
    repos.carrierProfileRepo.countByVerificationStatus('APPROVED'),
    repos.carrierProfileRepo.countActive(),
  ])
  return { success: true, metrics: { pendingDocuments, flaggedCarriers, verifiedCarriers, activeCarriers } }
}
```

Exportar os 3 (+ tipos de resultado) em `server/use-cases/index.ts`.

## 3. GraphQL — `server/graphql/queries/dashboard-metrics.query.ts` (novo)

3 `simpleObject` (um por role) + 3 `queryField`, cada um checando role (mesmo padrão de `browseShipments`):
```ts
export const CustomerDashboardMetricsType = builder.simpleObject('CustomerDashboardMetrics', {
  fields: (t) => ({
    activeShipments: t.int(),
    totalShipments: t.int(),
    totalSpentInCents: t.int(),
    avgRating: t.float({ nullable: true }),
  }),
})
// ... CarrierDashboardMetricsType, AdminDashboardMetricsType (shape análogo)

builder.queryField('customerDashboardMetrics', (t) =>
  t.field({
    type: CustomerDashboardMetricsType,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')
      const result = await getCustomerDashboardMetrics(
        { customerProfileRepo: ctx.repos.customerProfileRepo, shipmentRepo: ctx.repos.shipmentRepo },
        ctx.principal.userId,
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.metrics
    },
  }),
)
// carrierDashboardMetrics (role CARRIER) e adminDashboardMetrics (role ADMIN) seguem o mesmo padrão
```

## 4. Codegen

3 arquivos `.graphql` novos em `graphql/operations/dashboard/` (`customer-dashboard-metrics.graphql`, `carrier-dashboard-metrics.graphql`, `admin-dashboard-metrics.graphql`) + `pnpm codegen`.

## 5. Hooks — `graphql/hooks/use-{customer,carrier,admin}-dashboard-metrics.ts` (novos)

Mesmo padrão do `use-shipment.ts`/`use-shipment-for-carrier.ts` (S8-T4/S8-T5), já com `meta: { silent: false }` (comportamento default — aqui não há um `EmptyState` de erro dedicado no card, então o toast global é apropriado se a query falhar).

## 6. `MetricCard` — `components/ui/metric-card.tsx` (novo)

```tsx
import type { ComponentType } from 'react'
import { Card, CardContent } from './card'
import { cn } from '~/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
}

export function MetricCard({ label, value, icon: Icon, iconClassName }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', iconClassName)}>
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs uppercase">{label}</p>
          <p className="text-foreground truncate text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```
`value` é sempre string — formatação (preço, "—" pra nota nula, número puro) acontece no caller, não no componente (mantém o `MetricCard` burro/reutilizável).

## 7. Aplicar nos 3 dashboards

Grid `grid-cols-2 gap-4 lg:grid-cols-4` acima do conteúdo existente, um componente client novo por role que busca a métrica e monta os 4 `MetricCard` (mesmo padrão self-fetching do `ShipmentDetailView`):

- `components/features/dashboard/customer-metrics.tsx` — `Truck`/azul (ativos), `Package`/roxo (total), `Wallet`/verde (gasto, `formatPriceInCents`), `Star`/amarelo (avaliação, `avgRating?.toFixed(1) ?? '—'`)
- `components/features/dashboard/carrier-metrics.tsx` — mesmos 4 ícones/cores, "ganho" em vez de "gasto"
- `components/features/dashboard/admin-metrics.tsx` — `FileClock`/laranja (docs pendentes), `ShieldAlert`/vermelho (sinalizados), `ShieldCheck`/verde (verificados), `UserCheck`/azul (ativos)

Cada página (`customer/dashboard/page.tsx` etc.) importa o componente de métricas correspondente e renderiza acima do conteúdo já existente.

---

## Ordem de execução (sub-steps)

1. `shipment.repository.ts` — 4 métodos novos
2. `customer-profile.repository.ts` — `findMetricsByUserId`
3. `carrier-profile.repository.ts` — 4 métodos novos
4. `carrier-document.repository.ts` — `countByStatus`
5. 3 use-cases em `use-cases/dashboard/` (depende de 1-4) + export em `use-cases/index.ts`
6. `dashboard-metrics.query.ts` (depende de 5)
7. 3 arquivos `.graphql` + `pnpm codegen` (depende de 6)
8. 3 hooks client (depende de 7)
9. `metric-card.tsx` (sem dependência)
10. 3 componentes `*-metrics.tsx` (depende de 8, 9)
11. 3 páginas de dashboard modificadas (depende de 10)
12. Lint/typecheck escopo isolado + QA manual (números reais, zero-state, responsivo 375px/2-col e desktop/4-col, isolamento entre roles)

## Test Strategy (detalhe)

**Backend**: testar as 3 queries via GraphiQL/navegador — customer/carrier com fretes reais (conferir números batem com o que a lista já mostra) e sem fretes (zero-state, avgRating null → "—"); admin com e sem documentos pendentes/carriers sinalizados.

**UI**: os 3 dashboards com dado real, responsivo 375px (grid 2 colunas) e desktop (grid 4 colunas), formatação de preço e "—" pra avaliação nula, confirmar que a query certa é usada por cada role (customer não pode chamar `carrierDashboardMetrics` etc. — checagem de role no resolver).
