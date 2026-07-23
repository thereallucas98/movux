# S10-T1 — Exploration

**Date**: 2026-07-22
**Status**: Complete

---

## Correção crítica ao brief: `PricingTemplate` também tem `vehicleType`, mas o pricing engine hardcoda `'ANY'` e nunca lê o valor real do frete

O brief listou "alteração de precificação" como fora de escopo assumindo que `VehicleType` só aparecia em `Vehicle`/`Shipment`. Uma varredura completa por `VehicleType` no schema mostrou um terceiro uso não mapeado:

```prisma
// schema.prisma:527-544
model PricingTemplate {
  ...
  shipmentType         ShipmentType @map("shipment_type")
  vehicleType          VehicleType  @map("vehicle_type")
  ...
  @@unique([originClusterId, destinationClusterId, shipmentType, vehicleType])
}
```

`vehicleType` faz parte da **chave composta única** da tabela de precificação. Isso poderia significar que remover/substituir `VehicleType` do schema quebra o motor de preço — só que, ao ler `pricing.repository.ts:39-47`, o lookup de preço **hardcoda `vehicleType: 'ANY'` literalmente**, sem nunca receber o `vehicleTypeRequired` real do frete:

```ts
// pricing.repository.ts:39-47
async findSnapshotForCorridor(originClusterId, destinationClusterId, shipmentType) {
  const template = await prisma.pricingTemplate.findUnique({
    where: {
      originClusterId_destinationClusterId_shipmentType_vehicleType: {
        originClusterId, destinationClusterId, shipmentType,
        vehicleType: 'ANY', // <- sempre 'ANY', nunca input.vehicleTypeRequired
      },
    },
    ...
  })
}
```

Confirmado em `create-shipment.use-case.ts:113-117`: a chamada a `findSnapshotForCorridor` nem recebe `input.vehicleTypeRequired` como argumento — a assinatura da função não aceita esse parâmetro. `vehicleTypeRequired` é gravado no `Shipment` (linha 139) só depois do cálculo de preço, sem influenciar o preço em nada.

**Consequência pra abordagem técnica:** o enum `VehicleType` **não pode ser deletado do schema** (o campo `PricingTemplate.vehicleType` e a constraint composta continuam existindo e sendo usados, sempre com `'ANY'`), mas isso não bloqueia migrar `Vehicle.type`/`Shipment.vehicleTypeRequired` pra uma taxonomia nova — nenhum dos dois pontos tem qualquer acoplamento real com o valor de pricing hoje. Isso de-risca bastante a decisão de research.md: dá pra manter o enum `VehicleType` vivo (só usado por `PricingTemplate`, sempre `'ANY'`) e adicionar a taxonomia nova como estrutura separada, sem precisar tocar no pricing engine — exatamente como o brief já pretendia deixar fora de escopo, só que agora com a certeza de que é seguro fazer isso sem quebrar nada.

---

## Levantamento completo de consumidores de `VehicleType` (fora de `generated/`)

Grep exaustivo por `VehicleType` em `src/` e `prisma/` (excluindo `src/generated/prisma/*` e `src/graphql/generated/types.ts`, que são build outputs regenerados por `pnpm codegen`/`prisma generate`):

| Arquivo | Papel |
|---|---|
| `prisma/schema.prisma:52-58` | Definição do enum |
| `prisma/schema.prisma:418-436` (`Vehicle.type`) | Campo do veículo — **migra** |
| `prisma/schema.prisma:615-619` (`Shipment.vehicleTypeRequired`) | Campo do frete — **migra** |
| `prisma/schema.prisma:527-544` (`PricingTemplate.vehicleType`) | Chave de pricing — **fica como está** (sempre `'ANY'`, ver acima) |
| `src/server/repositories/vehicle.repository.ts` | Só leitura (`findActiveTypeByOwnerId`) — **migra/expande** |
| `src/server/repositories/shipment.repository.ts` | Campo passthrough de create/select — **migra** |
| `src/server/use-cases/shipments/create-shipment.use-case.ts` | Input/grava no draft — **migra** |
| `src/server/use-cases/carriers/search-public-carriers.use-case.ts:57-59` | Filtro de igualdade exata — **migra** |
| `src/server/graphql/enums/shipment.enum.ts` (`VehicleTypeEnum`) | Enum Pothos — **novo enum/tipo GraphQL substitui, ou convive** |
| `src/server/graphql/mutations/shipments.mutation.ts:29,61` | Único mutation que usa o enum — **migra** |
| `src/server/graphql/types/shipment.type.ts` | Campo de saída do tipo `Shipment` — **migra** |
| `src/server/graphql/types/browse-shipment.type.ts` | Campo de saída do tipo `BrowseShipment` (listagem carrier) — **migra** |
| `src/graphql/hooks/use-public-carrier-search.ts` | Tipo TS re-exportado do codegen — **migra automaticamente com o schema** |
| `src/server/graphql/queries/public-carrier-search.query.ts` | Filtro de busca pública — **migra** |
| `src/components/features/shipments/create-shipment-form.tsx` | Select de exigência no form do cliente — **migra** |
| `src/components/features/shipments/shipment-labels.ts:14` (`VEHICLE_TYPE_LABELS`) | Mapa de rótulos PT-BR do enum antigo — **substitui/expande pro novo modelo** |
| `src/components/features/public-search/carrier-search-form.tsx` | Filtro da busca pública (form) — **migra** |
| `src/components/features/public-search/carrier-search-page.tsx` | Página que monta o form acima — **migra (indireto)** |
| `src/components/features/public-search/carrier-search-results.tsx` | Exibe o tipo de veículo no card de resultado — **migra** |

Nenhum arquivo fora dessa lista referencia `VehicleType` — a superfície de migração está fechada (17 arquivos fonte, fora dos 2 pontos gerados por build).

---

## `Vehicle.plate` confirmado sem constraint de unicidade

```prisma
// schema.prisma:418-436
model Vehicle {
  id           String      @id @default(uuid())
  ...
  plate        String   // sem @unique, sem @@unique([plate]) na tabela toda
  ...
}
```

Comportamento atual (mesmo sem nenhum cadastro real ainda, via seed) permite placas duplicadas. Fica confirmado como edge case real do FR2 (cadastro de veículo) — decisão de adicionar `@unique` ou não fica pro `research.md`, mas o comportamento-base hoje é "permite duplicata".

---

## Nenhum precedente direto de "CRUD de registro próprio do carrier" — mais próximo é upload de documento (append-only, não editável)

Vasculhado `src/server/use-cases/carrier-documents/*` como candidato a precedente — mas o fluxo de `CarrierDocument` é diferente do que FR2 precisa:

```ts
// upload-carrier-document.use-case.ts — cria, nunca edita/desativa
export async function uploadCarrierDocument(repos, userId, type, file) {
  const document = await repos.carrierDocumentRepo.create({ carrierId: userId, type, fileUrl })
  return { success: true, document }
}
```

Não existe update nem soft-delete de `CarrierDocument` pelo próprio carrier (só `approveCarrierDocument`/`rejectCarrierDocument`, exclusivos de admin). O CRUD de veículo (criar, editar, desativar pelo próprio dono) não tem precedente 1:1 no repo — mas o padrão de autorização já é bem estabelecido em toda a base: qualquer mutation "dono mexe no próprio recurso" resolve via `ctx.principal.userId` comparado contra o `ownerId`/`userId` do recurso (mesmo padrão de `resolveSafetyParticipant`, `customerProfileRepo.findByUserId(userId)`, etc.) — não precisa de nada novo em `packages/auth` (CASL não é usado de forma granular por recurso hoje; todo resolver checa `ctx.principal.role` diretamente, confirmado em `shipment-lifecycle.query.ts` e replicável aqui).

---

## RBAC — sem gate especial necessário

`packages/auth/src/roles.ts` só define o enum de role (`CUSTOMER | CARRIER | ADMIN`) e listas simples (`MODERATOR_ROLES`, `PUBLIC_REGISTRABLE_ROLES`) — não há definição CASL granular por tipo de recurso. Todo controle de acesso a mutation/query hoje é `if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')` inline no resolver (confirmado em `shipment-lifecycle.query.ts`, replicado em todo o domínio de shipment/proposal). As novas mutations de veículo seguem o mesmo padrão, sem necessidade de tocar `packages/auth`.

---

## Riscos confirmados / atualizados

- **Risco do brief resolvido/reduzido**: migração de `PricingTemplate.vehicleType` não é necessária — o pricing engine nunca leu o valor real, só grava `'ANY'` fixo. O enum antigo pode continuar existindo no schema só pra esse propósito, sem forçar uma migração de dados de pricing.
- **Risco confirmado**: `Vehicle.plate` sem unicidade é comportamento real hoje, não suposição — decisão de `research.md`.
- **Risco novo**: nenhum precedente de autorização "dono edita/desativa próprio recurso" existe ainda no domínio de shipment/carrier (mais perto: `workspace-memberships` do domínio Turnora órfão, D-006 — não deve ser copiado, é código morto). O padrão a seguir é o de resolução de participante já usado em `resolveSafetyParticipant`/`customerProfileRepo`, adaptado pra `ownerId` de `Vehicle`.
- Riscos do brief (migração de dados sem perder histórico, escopo não inflar pra `Company`/frota) seguem válidos, sem mudança.

---

## Next Steps

Seguir para `research.md` — decidir a forma exata da taxonomia (quantos níveis de tabela, nomes dos models, se `Vehicle`/`Shipment` referenciam por FK direta ou join many-to-many, estratégia de migração dos dados existentes de `Vehicle.type`/`Shipment.vehicleTypeRequired`, e se `plate` ganha `@unique` nesta rodada).
