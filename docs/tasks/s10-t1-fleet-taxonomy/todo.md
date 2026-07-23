# TODO: S10-T1 — Taxonomia de Frota

**Date**: 2026-07-22
**Phase**: EXECUTION
**Status**: COMPLETE

---

## Implementation Checklist

### Step 1: Schema

- [x] **1.1** Adicionar `model VehicleCategory` e `model VehicleSpec` em `schema.prisma`
- [x] **1.2** `Vehicle`: remover `type VehicleType`, adicionar `specId`/`spec` (obrigatório), adicionar `@unique` em `plate`
- [x] **1.3** `Shipment`: remover `vehicleTypeRequired VehicleType`, adicionar `requiredCategoryId`/`requiredCategory` (opcional)
- [x] **1.4** Confirmar que `PricingTemplate.vehicleType` e `enum VehicleType` não são tocados
- [x] **1.5** `pnpm db:push` local (wipe + reseed) + `pnpm db:generate`

### Step 2: Seed

- [x] **2.1** Novo arquivo de seed da taxonomia (categorias: Moto, Van, Caminhão com specs reais de capacidade)
- [x] **2.2** Atualizar `dev-public-search-fixture.ts` (e qualquer outro seed que crie `Vehicle`) pra usar `specId` em vez de `type`
- [x] **2.3** Rodar seed completo, confirmar dados no Prisma Studio/psql

### Step 3: Repository

- [x] **3.1** `vehicle-taxonomy.repository.ts` (novo) — `listCategories()`
- [x] **3.2** `vehicle.repository.ts` — expandir com `listByOwnerId`, `findById`, `create`, `update`, `deactivate`, `findActiveCategoryByOwnerId` (substitui `findActiveTypeByOwnerId`)
- [x] **3.3** Registrar os repos novos/alterados em `server/repositories/index.ts` e `server/graphql/context.ts`

### Step 4: Use-cases

- [x] **4.1** `use-cases/vehicles/list-my-vehicles.use-case.ts`
- [x] **4.2** `use-cases/vehicles/create-vehicle.use-case.ts`
- [x] **4.3** `use-cases/vehicles/update-vehicle.use-case.ts`
- [x] **4.4** `use-cases/vehicles/deactivate-vehicle.use-case.ts`
- [x] **4.5** Registrar exports em `server/use-cases/index.ts`
- [x] **4.6** Migrar `create-shipment.use-case.ts` (`vehicleTypeRequired` → `requiredCategoryId`)
- [x] **4.7** Migrar `search-public-carriers.use-case.ts` (filtro por categoria)

### Step 5: GraphQL

- [x] **5.1** `types/vehicle-taxonomy.type.ts` (novo) — `VehicleCategoryType`/`VehicleSpecType`
- [x] **5.2** `types/vehicle.type.ts` (novo) — `VehicleType` GraphQL
- [x] **5.3** `queries/vehicle-taxonomy.query.ts` (novo) — `vehicleCategories`
- [x] **5.4** `queries/vehicles.query.ts` (novo) — `myVehicles`
- [x] **5.5** `mutations/vehicles.mutation.ts` (novo) — `createVehicle`/`updateVehicle`/`deactivateVehicle`
- [x] **5.6** Migrar `mutations/shipments.mutation.ts` (`requiredCategoryId`)
- [x] **5.7** Migrar `types/shipment.type.ts` e `types/browse-shipment.type.ts` (campo de saída)
- [x] **5.8** Remover `VehicleTypeEnum` de `enums/shipment.enum.ts`
- [x] **5.9** Registrar os arquivos novos em `schema.ts`
- [x] **5.10** `pnpm codegen`

### Step 6: Hooks

- [x] **6.1** `use-vehicle-taxonomy.ts`, `use-my-vehicles.ts`
- [x] **6.2** `use-create-vehicle.ts`, `use-update-vehicle.ts`, `use-deactivate-vehicle.ts` (com `ERROR_MESSAGES` por hook, padrão D-009)
- [x] **6.3** `.graphql` operation files correspondentes em `graphql/operations/`

### Step 7: UI nova — "Meus veículos"

- [x] **7.1** `app/carrier/vehicles/page.tsx`
- [x] **7.2** `components/features/vehicles/vehicle-list.tsx`
- [x] **7.3** `components/features/vehicles/vehicle-form.tsx` (categoria → spec em cascata)
- [x] **7.4** Item novo na sidebar do carrier

### Step 8: UI existente migrada

- [x] **8.1** `create-shipment-form.tsx` — select de categoria em vez de `VehicleType`
- [x] **8.2** `shipment-labels.ts` — remover `VEHICLE_TYPE_LABELS`
- [x] **8.3** `register-form.tsx` — prefill migrado
- [x] **8.4** `carrier-search-form.tsx` + `carrier-search-results.tsx` — filtro/exibição migrados

### Step 10: Catálogo real de marca/modelo (D-011, adicionado em execução)

- [x] **10.1** Schema: `VehicleBrand`/`VehicleModel`, `VehicleCategory.fipeVehicleType`, `Vehicle.modelId` (substitui `brand`/`model` texto livre)
- [x] **10.2** `prisma/seed/vehicle-brands-models.ts` — import idempotente/retomável da API da FIPE, com retry+backoff em 429
- [x] **10.3** Repository/use-case/GraphQL/hooks pra `vehicleBrands`/`vehicleModels`
- [x] **10.4** `VehicleForm` — segunda cascata Marca → Modelo
- [~] **10.5** Import completo do catálogo — **parcial**: ~15 marcas de moto importadas, rate limit da FIPE interrompeu o resto (238 marcas no total); Van/Caminhão só têm a marca "Fixture" de teste. Follow-up: rodar `dotenv -e .env -- tsx prisma/seed/vehicle-brands-models.ts` de novo mais tarde (idempotente, retoma de onde parou)

### Step 9: Validação

- [x] **9.1** `pnpm lint` — 0 novos erros (baseline 249, D-006)
- [x] **9.2** `pnpm build` — mesma falha pré-existente do D-006, sem novo erro
- [x] **9.3** QA manual: cadastro de veículo (Categoria/Especificação/Marca/Modelo em cascata), edição pré-carregada corretamente, criação de frete com categoria, busca pública filtrando por categoria
- [x] **9.4** `docs/decisions.md` (D-010, D-011) e `ROADMAP.md` atualizados

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1 | ✅ | |
| 2 | ✅ | |
| 3 | ✅ | |
| 4 | ✅ | |
| 5 | ✅ | |
| 6 | ✅ | |
| 7 | ✅ | |
| 8 | ✅ | |
| 9 | ✅ | |
| 10 | ⚠️ | Import da FIPE parcial (rate limit) — follow-up registrado |

**Incidente:** `TRUNCATE ... CASCADE` no meio da execução apagou todo o histórico de QA da sessão (shipments/propostas/reviews), não só a tabela de veículos — detalhado em D-011. Sem dado de produção perdido; usuário optou por reseedar e seguir.
