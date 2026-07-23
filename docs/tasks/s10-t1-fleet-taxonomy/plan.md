# S10-T1 — Plan

## 1. Schema — `prisma/schema.prisma` (modificado)

```prisma
model VehicleCategory {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true) @map("is_active")

  specs     VehicleSpec[]
  shipments Shipment[]

  @@map("vehicleCategory")
}

model VehicleSpec {
  id          String   @id @default(uuid())
  categoryId  String   @map("category_id")
  name        String
  maxWeightKg Decimal  @map("max_weight_kg") @db.Decimal(8, 2)
  maxVolumeM3 Decimal  @map("max_volume_m3") @db.Decimal(8, 2)
  isActive    Boolean  @default(true) @map("is_active")

  category VehicleCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  vehicles Vehicle[]

  @@unique([categoryId, name])
  @@map("vehicleSpec")
}
```

`Vehicle` (modificado): remove `type VehicleType`, adiciona `specId String` (obrigatório) + `spec VehicleSpec @relation(...)`; adiciona `@unique` em `plate`.

`Shipment` (modificado): remove `vehicleTypeRequired VehicleType`, adiciona `requiredCategoryId String?` (opcional — substitui o sentinela `'ANY'` por "sem preferência" real) + `requiredCategory VehicleCategory? @relation(...)`.

`PricingTemplate.vehicleType VehicleType` e o `enum VehicleType` **ficam intocados** (só consumidor restante, sempre `'ANY'`).

Migration: `pnpm db:push` local (wipe + reseed, decisão do research.md — sem dado real de produção a preservar).

## 2. Seed — `prisma/seed/` (novo arquivo, ex. `vehicle-taxonomy-seed.ts`, chamado do seed principal)

```ts
const categories = [
  { name: 'Moto', specs: [{ name: 'Moto', maxWeightKg: 20, maxVolumeM3: 0.1 }] },
  { name: 'Van', specs: [{ name: 'Van', maxWeightKg: 800, maxVolumeM3: 6 }] },
  {
    name: 'Caminhão',
    specs: [
      { name: 'Caminhão 3/4', maxWeightKg: 3500, maxVolumeM3: 12 },
      { name: 'Caminhão Toco', maxWeightKg: 6000, maxVolumeM3: 20 },
      { name: 'Caminhão Truck', maxWeightKg: 14000, maxVolumeM3: 40 },
    ],
  },
]
```
(valores de capacidade são referência de mercado, ajustáveis sem migration — são dados de seed, não enum)

## 3. Repository

`server/repositories/vehicle-taxonomy.repository.ts` (novo) — leitura pura, sem use-case (mesmo padrão de `geographyRepo.listNeighborhoods()`):
```ts
export interface VehicleTaxonomyRepository {
  listCategories(): Promise<Array<{
    id: string; name: string; description: string | null
    specs: Array<{ id: string; name: string; maxWeightKg: number; maxVolumeM3: number }>
  }>>
}
// prisma.vehicleCategory.findMany({ where: { isActive: true }, include: { specs: { where: { isActive: true } } } })
```

`server/repositories/vehicle.repository.ts` (expandido — hoje só tem `findActiveTypeByOwnerId`):
```ts
export interface VehicleRepository {
  listByOwnerId(ownerId: string): Promise<VehicleWithSpec[]>
  findById(id: string): Promise<VehicleWithSpec | null>
  create(ownerId: string, data: CreateVehicleData): Promise<Vehicle>
  update(id: string, data: UpdateVehicleData): Promise<Vehicle>
  deactivate(id: string): Promise<void>
  // substitui findActiveTypeByOwnerId — retorna categoria (não spec), granularidade
  // usada hoje pela busca pública (S9-T3), que filtra por categoria, não por spec
  findActiveCategoryByOwnerId(ownerId: string): Promise<{ id: string; name: string } | null>
}
```

## 4. Use-cases — `server/use-cases/vehicles/` (novo)

- `list-my-vehicles.use-case.ts` — `listByOwnerId(userId)`
- `create-vehicle.use-case.ts` — valida `specId` existe/ativo, cria com `ownerId: userId`
- `update-vehicle.use-case.ts` — carrega o veículo, confere `vehicle.ownerId === userId` (mesmo padrão de `resolveSafetyParticipant`), atualiza
- `deactivate-vehicle.use-case.ts` — mesma checagem de dono, `isActive: false`

Discriminated union de erro em todos: `NOT_FOUND | FORBIDDEN | INVALID_SPEC`.

## 5. GraphQL

`server/graphql/enums/`: remove `VehicleTypeEnum` de `shipment.enum.ts` (só sobrevive se algum resolver de `PricingTemplate` precisar — não precisa, `PricingTemplate` não é exposto via GraphQL hoje).

`server/graphql/types/vehicle-taxonomy.type.ts` (novo):
```ts
export const VehicleSpecType = builder.simpleObject('VehicleSpec', {
  fields: (t) => ({ id: t.id(), name: t.string(), maxWeightKg: t.float(), maxVolumeM3: t.float() }),
})
export const VehicleCategoryType = builder.simpleObject('VehicleCategory', {
  fields: (t) => ({ id: t.id(), name: t.string(), specs: t.field({ type: [VehicleSpecType] }) }),
})
```

`server/graphql/types/vehicle.type.ts` (novo) — `VehicleType` GraphQL (nome conflita com o enum antigo removido — ok, o enum já vai ter sumido nesse ponto):
```ts
export const VehicleType = builder.simpleObject('Vehicle', {
  fields: (t) => ({
    id: t.id(), plate: t.string(), brand: t.string(), model: t.string(), year: t.int(),
    isActive: t.boolean(), spec: t.field({ type: VehicleSpecType }),
  }),
})
```

`server/graphql/queries/vehicle-taxonomy.query.ts` (novo) — `vehicleCategories` (autenticado, qualquer role — usado tanto por `create-shipment-form` quanto por "Meus Veículos"; segue `neighborhoods.query.ts` como padrão de query simples sem use-case).

`server/graphql/queries/vehicles.query.ts` (novo) — `myVehicles` (só `CARRIER`).

`server/graphql/mutations/vehicles.mutation.ts` (novo) — `createVehicle`, `updateVehicle`, `deactivateVehicle` (só `CARRIER`, autorização por dono dentro do use-case).

`server/graphql/mutations/shipments.mutation.ts` (modificado) — `vehicleTypeRequired: VehicleTypeEnum` → `requiredCategoryId: t.id({ required: false })`.

`server/graphql/types/shipment.type.ts`, `browse-shipment.type.ts` (modificados) — campo de saída migrado de `vehicleType` pra `requiredCategory { id name }` (ou nulo).

Registrar os 3 arquivos novos em `schema.ts`.

## 6. Use-cases existentes migrados

`server/use-cases/shipments/create-shipment.use-case.ts` — `input.vehicleTypeRequired: VehicleType` → `input.requiredCategoryId?: string`; grava direto, sem validar contra `VehicleCategory` nesta rodada (elegibilidade real é S10-T2).

`server/use-cases/carriers/search-public-carriers.use-case.ts` — troca `vehicleRepo.findActiveTypeByOwnerId` por `findActiveCategoryByOwnerId`; filtro por igualdade de `categoryId` em vez de `vehicleType`.

## 7. Hooks — `graphql/hooks/`

- `use-vehicle-taxonomy.ts` (novo) — `vehicleCategories`
- `use-my-vehicles.ts` (novo) — `myVehicles`
- `use-create-vehicle.ts` / `use-update-vehicle.ts` / `use-deactivate-vehicle.ts` (novos) — seguem o padrão `ERROR_MESSAGES` + `xxxErrorMessage()` já estabelecido (D-009)

## 8. UI

- `app/carrier/vehicles/page.tsx` (nova rota) — "Meus veículos"
- `components/features/vehicles/vehicle-list.tsx` (novo) — lista + botão desativar
- `components/features/vehicles/vehicle-form.tsx` (novo) — criar/editar; `AdaptiveSelect` de categoria → `AdaptiveSelect` de spec dentro da categoria escolhida (2 selects em cascata, mesmo padrão de UX de `create-shipment-form.tsx` pra bairro/cidade)
- Adiciona item "Meus veículos" na sidebar do carrier (`components/features/nav/sidebar.tsx`)
- `components/features/shipments/create-shipment-form.tsx` — select de `vehicleTypeRequired` (enum) → select de `requiredCategoryId` (via `useVehicleTaxonomy`)
- `components/features/shipments/shipment-labels.ts` — remove `VEHICLE_TYPE_LABELS` (rótulo agora vem do próprio nome da categoria no banco, não de um mapa estático)
- `components/features/auth/register-form.tsx` — prefill de `vehicleType` (query string) migra pro nome/id de categoria
- `components/features/public-search/carrier-search-form.tsx` + `carrier-search-results.tsx` — filtro migrado de `VehicleType` pra `VehicleCategory`

---

## Test Strategy

- `createVehicle`/`updateVehicle`/`deactivateVehicle` — happy path, `specId` inválido → erro, veículo de outro carrier → 403/404
- `myVehicles` — vazio, com 1+ veículo
- `vehicleCategories` — retorna árvore com specs aninhados
- Criação de frete com `requiredCategoryId` — happy path, sem categoria (null, "sem preferência") — happy path
- Busca pública filtrando por categoria — resultado equivalente ao comportamento atual (S9-T3 não regride)
- `pnpm lint` (0 novos, baseline 249) + `pnpm build` (mesma falha pré-existente do D-006, sem novo erro)
- QA manual: cadastrar veículo com spec real, criar frete pedindo uma categoria, confirmar que a busca pública ainda filtra certo

---

## Next Steps

`todo.md` com o checklist granular, na ordem: schema → seed → repository → use-cases → GraphQL → hooks → migração dos consumidores existentes → UI nova → UI existente migrada → validação.
