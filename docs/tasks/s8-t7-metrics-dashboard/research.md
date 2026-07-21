# S8-T7 — Research

**Date**: 2026-07-21
**Status**: Complete

---

## Decision Log

| Decisão | Escolha | Motivo |
|---|---|---|
| Definição de "fretes ativos" | `status IN (OPEN, PROPOSALS_RECEIVED, CARRIER_SELECTED, COLLECTED, IN_TRANSIT)` | Frete submetido e ainda não finalizado nem cancelado — exclui `DRAFT` (não submetido), `DELIVERED`/`REVIEWED` (concluído), `CANCELLED`/`EXPIRED` (terminal sem sucesso). Mesmo espírito do `FILTERABLE_STATUSES` do S8-T4, sem incluir estados que não fazem sentido como "em andamento" |
| Definição de "total gasto" (customer) / "total ganho" (carrier) | Soma de `finalPriceInCents` onde `status IN (DELIVERED, REVIEWED)` | Só conta frete que de fato foi pago/concluído — `finalPriceInCents` só é setado em `markCarrierSelected` (preço fechado), mas o dinheiro só "conta" como gasto/ganho real após entrega confirmada |
| Como achar o carrier vencedor de um frete | Filtro de relação Prisma: `proposals: { some: { carrierId, status: 'ACCEPTED' } }` | `Shipment` não tem `carrierId` direto (ver Exploration); Prisma suporta filtro por relação nativamente em `count`/`aggregate`, sem SQL raw; índice `@@index([carrierId, status])` já existe em `Proposal` |
| `avgRating` nulo (sem review ainda) | Use-case retorna `null` (não `0`); `MetricCard` recebe `value: number \| string`, renderiza "—" quando o caller passar `null`/`undefined` | Evita mentir "nota 0" pra quem nunca foi avaliado — 0 é uma nota real (péssima), null é "ainda sem dado" |
| Métodos novos de repository — nomes | Ver tabela abaixo | Segue a convenção de nomes já usada (`findByIdForOwner`, `listOpenForBrowse` etc.) — verbo + o que retorna + escopo |
| Onde ficam os use-cases novos | `server/use-cases/dashboard/` (pasta nova) | Não pertence a nenhum domínio existente (`shipments/`, `proposals/`, `admin/`) — é uma leitura agregada *sobre* vários domínios, mesma lógica de pasta própria já usada pra outras leituras transversais |
| `MetricCard` — localização | `components/ui/metric-card.tsx` (não em `features/`) | Componente genérico e reutilizável entre os 3 roles, sem lógica de negócio — mesmo critério que já coloca `Card`/`Badge`/`EmptyState` em `ui/`, diferente de `ShipmentTypeIcon`/`DocumentTypeIcon` (esses são específicos de domínio, ficam em `features/`) |
| Ícone/cor por métrica | Ícone fixo por métrica (não por dado dinâmico como nos `TypeIcon`) — ex.: `Truck`/azul pra "fretes ativos", `Wallet`/verde pra "total gasto/ganho", `Star`/amarelo pra avaliação | Cada card é uma métrica fixa conhecida em build-time (diferente do `ShipmentTypeIcon`, que mapeia um enum vindo do backend) — não precisa de `Record` dinâmico, só props diretas por instância do `MetricCard` |

### Métodos novos de repository

| Repository | Método | Retorno |
|---|---|---|
| `CustomerProfileRepository` | `findMetricsByUserId(userId)` | `{ avgRating: number \| null; totalShipments: number } \| null` |
| `CarrierProfileRepository` | `findMetricsByUserId(userId)` | `{ avgRating: number \| null; totalShipments: number } \| null` |
| `CarrierProfileRepository` | `countFlagged()` | `number` |
| `CarrierProfileRepository` | `countActive()` | `number` |
| `CarrierProfileRepository` | `countByVerificationStatus(status)` | `number` |
| `CarrierDocumentRepository` | `countByStatus(status)` | `number` |
| `ShipmentRepository` | `countActiveByCustomer(customerId)` | `number` |
| `ShipmentRepository` | `sumFinalPriceByCustomer(customerId, statuses)` | `number` (centavos) |
| `ShipmentRepository` | `countActiveByCarrier(carrierId)` | `number` |
| `ShipmentRepository` | `sumFinalPriceByCarrier(carrierId, statuses)` | `number` (centavos) |

## Arquitetura (sem mudança em relação ao brief)

3 use-cases (1 por role) chamando `Promise.all` dos métodos de repo acima, cada um atrás de uma query GraphQL própria com checagem de role (mesmo padrão de `browseShipments`/`shipmentForCarrier`). Sem migration, sem mutation, sem lib nova.

Nenhuma decisão pendente — pronto pra Plan.
