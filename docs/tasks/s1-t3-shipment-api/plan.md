# S1-T3 — Plan

## Camadas (Route → UseCase(repos, principal, input) → Repository → Response), conforme `API-ARCHITECTURE.md`

### Repositórios novos

- `customer-profile.repository.ts` — só o necessário: `findByUserId(userId)` → `{ id }` (resolve `customerProfile.id` a partir do `principal.userId` do JWT; `shipment.customerId` referencia `customerProfile.id`, não `user.id`)
- `pricing.repository.ts` — leitura, sem escrita:
  - `findClusterIdForNeighborhood(neighborhoodId)` — via `clusterNeighborhood`, pega o primeiro cluster (dado atual é 1:1 bairro→cluster, então não há ambiguidade real)
  - `findSnapshotForCorridor(originClusterId, destinationClusterId, shipmentType)` — sempre busca `vehicleType: 'ANY'` no `pricingTemplate` (único valor semeado na S1-T2), junta com `pricingSnapshot`
  - `findModifiersByCodes(codes: ModifierCode[])` — busca definição (`valueType`, `valueInCents`) dos modificadores globais (`cityId: null`)
- `shipment.repository.ts`:
  - `createDraft(data)` — nested write: `shipment` + 2 `shipmentAddress` (origin/destination) + N `shipmentModifier`, `status: DRAFT`
  - `findByIdForOwner(id, customerProfileId)` — inclui `addresses` + `modifiers`
  - `findStatusForOwner(id, customerProfileId)` — só `{ id, status }`, usado pelo publish (evita carregar o objeto todo)
  - `updateStatus(id, status)`
  - `listForCustomer(customerProfileId, { status?, cursor?, limit? })` — paginação cursor-based (`createdAt desc, id desc`), mesmo padrão dos repos antigos (`listForUser(userId, cursor, limit)`)

### Use-cases novos (`server/use-cases/shipments/`)

- `create-shipment.use-case.ts` — resolve `customerProfileId` → resolve clusters → busca `pricingSnapshot` (`NO_PRICING_AVAILABLE` se não achar) → calcula `appliedValueInCents` por modificador (`FIXED`: `valueInCents`; `PERCENTAGE`: `round(basePriceInCents × valueInCents / 10000)`) → soma `suggestedPriceInCents = basePrice + Σ(appliedValueInCents × quantity)` → cria via `shipmentRepo.createDraft`
- `publish-shipment.use-case.ts` — `findStatusForOwner` → `NOT_FOUND` se não existe/não é dono → `INVALID_STATE_TRANSITION` se `status !== DRAFT` → `updateStatus(OPEN)`
- `get-shipment.use-case.ts` — `findByIdForOwner` → `NOT_FOUND` se não existe/não é dono
- `list-shipments-for-customer.use-case.ts` — resolve `customerProfileId` → `listForCustomer`

### Schemas (`server/schemas/shipment.schema.ts`)

- `ShipmentAddressSchema` (reused para origin/destination): `street`, `number`, `complement?`, `neighborhoodId` (`z.uuid()`), `cityId` (`z.uuid()`), `state` (2 chars), `zipCode`, `lat?`, `lng?`, `floor?`, `hasElevator?`
- `ShipmentModifierInputSchema`: `modifierCode` (enum), `quantity` (int positivo, default 1)
- `CreateShipmentSchema`: campos do brief + `.refine()` pra `specificTime` obrigatório só quando `timeWindow === 'SPECIFIC'`; `customerSlaHours` restrito a `4 | 6 | 8 | 12 | 24`
- `ListShipmentsQuerySchema`: `status?`, `cursor?`, `limit?` (querystring)

### Rotas

```
app/api/shipments/route.ts                    — POST (create), GET (list)
app/api/shipments/[shipmentId]/route.ts        — GET (detail)
app/api/shipments/[shipmentId]/publish/route.ts — POST (publish)
```

Erro → status: `EMAIL_IN_USE`-style mapping já estabelecido — `NOT_FOUND → 404`, `INVALID_STATE_TRANSITION → 409`, `NO_PRICING_AVAILABLE → 422`, validação Zod → `400`.

### Swagger + Insomnia

- `lib/swagger/definitions/shipments.ts` — novo, tag `Shipments` adicionada em `lib/swagger.ts`
- `docs/insomnia/s1-shipment-api.json` — collection com os 4 endpoints

## Ordem de execução

1. `customer-profile.repository.ts`
2. `pricing.repository.ts`
3. `shipment.repository.ts`
4. `server/schemas/shipment.schema.ts`
5. 4 use-cases (`create`, `publish`, `get`, `list`)
6. Registrar tudo em `server/repositories/index.ts` e `server/use-cases/index.ts`
7. 4 route handlers
8. Swagger definitions + tag
9. Insomnia collection
10. QA manual via curl (roteiro no `qa-roteiro.md` — a ser escrito na Execution, não antes)
