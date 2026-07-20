# S3-T1 — Plan

## Schema migration

Remove `Shipment.safetyTermCustomerAt` / `safetyTermCarrierAt` (dead fields, decision recorded in `research.md`).

```prisma
model Shipment {
  // ... remove:
  // safetyTermCustomerAt  DateTime?      @map("safety_term_customer_at")
  // safetyTermCarrierAt   DateTime?      @map("safety_term_carrier_at")
}
```

Migration via `prisma migrate diff --from-config-datasource ... --to-schema ... --script` + manual migration folder + `prisma migrate deploy` (non-interactive workaround, same as S2-T1).

Also update `docs/DATABASE-DESIGN.md §6.1` — remove the two rows from the `shipment` field table.

## Repositórios — métodos novos

### `proposal.repository.ts`
```ts
findAcceptedByShipment(shipmentId): Promise<{ carrierId: string } | null>
// findFirst({ where: { shipmentId, status: 'ACCEPTED' }, select: { carrierId: true } })
```

### `safety-check-in.repository.ts` (novo arquivo)
```ts
export interface SafetyCheckInRepository {
  findByShipment(shipmentId: string): Promise<SafetyCheckIn[]>
  findByShipmentAndRole(shipmentId: string, role: ReviewerRole): Promise<SafetyCheckIn | null>
  create(shipmentId: string, userId: string, role: ReviewerRole, ipAddress: string | null): Promise<SafetyCheckIn>
}
```

## `lib/get-client-ip.ts` (novo arquivo)

```ts
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip')
}
```

## Error code novo

`server/http/error-response.ts`:
- `ErrorCode` union: `+ 'ALREADY_CONFIRMED'`
- `ERROR_MAP`: `ALREADY_CONFIRMED: { status: 409, message: 'Safety check-in already confirmed for this role' }`

`server/graphql/errors.ts`:
- `Record<ErrorCode,string>`: `ALREADY_CONFIRMED: 'Safety check-in already confirmed for this role'`

## Use-cases (`server/use-cases/shipments/safety/`)

### `resolve-safety-participant.ts` (helper interno, não exportado no barrel)
Resolve `{ shipment: {status}, role }` ou `null` a partir de `userId` + `principalRole`:
- `CUSTOMER` → `customerProfileRepo.findByUserId` → `shipmentRepo.findStatusForOwner(shipmentId, customerProfile.id)`
- `CARRIER` → `shipmentRepo.findStatusById(shipmentId)` + `proposalRepo.findAcceptedByShipment(shipmentId)` → compara `carrierId === userId`

### `confirm-safety-check-in.use-case.ts`
1. `resolveSafetyParticipant` → `NOT_FOUND` se não é dono nem carrier selecionado
2. `shipment.status !== 'CARRIER_SELECTED'` → `INVALID_STATE_TRANSITION`
3. `safetyCheckInRepo.findByShipmentAndRole(shipmentId, role)` existente → `ALREADY_CONFIRMED`
4. `safetyCheckInRepo.create(shipmentId, userId, role, ipAddress)`

### `get-safety-check-in-status.use-case.ts`
1. `resolveSafetyParticipant` → `NOT_FOUND`
2. `shipment.status !== 'CARRIER_SELECTED'` → `INVALID_STATE_TRANSITION`
3. `safetyCheckInRepo.findByShipment(shipmentId)` → monta `{ customer: CheckIn | null, carrier: CheckIn | null }`

## Schemas

Nenhum novo — `ShipmentIdParamSchema` (`server/schemas/shipment.schema.ts`) já cobre os dois endpoints.

## Rotas

```
app/api/shipments/[shipmentId]/safety/confirm/route.ts   — POST (CUSTOMER ou CARRIER)
app/api/shipments/[shipmentId]/safety/route.ts            — GET  (CUSTOMER ou CARRIER)
```

Diferente das rotas de queue/proposal (role único), aqui o gate de role no route é `principal.role !== 'CUSTOMER' && principal.role !== 'CARRIER'` → `FORBIDDEN` (bloqueia só `ADMIN`); o use-case decide `NOT_FOUND` se a pessoa não é participante deste shipment específico.

`getClientIp(req)` chamado na rota de confirm, passado como argumento pro use-case (mantém a use-case pura de `Request`, só recebe `string | null`).

## Swagger + Insomnia

- `lib/swagger/definitions/safety.ts` (arquivo novo) — 2 endpoints, tag `Safety`
- `docs/insomnia/s3-t1-safety-checkin.json` — novo

## Ordem de execução

1. Migration — remover `safetyTermCustomerAt`/`safetyTermCarrierAt` do schema + `DATABASE-DESIGN.md`
2. `proposalRepo.findAcceptedByShipment`
3. `safety-check-in.repository.ts`
4. `lib/get-client-ip.ts`
5. `ALREADY_CONFIRMED` em `error-response.ts` + `graphql/errors.ts`
6. `resolve-safety-participant.ts` + 2 use-cases
7. Registrar nos barrels (`repositories/index.ts`, `use-cases/index.ts`)
8. 2 rotas
9. Swagger
10. Insomnia
11. QA via curl: confirm customer → confirm carrier → GET mostra os dois; confirm 2x mesmo papel → 409; confirm por carrier não-selecionado → 404; confirm com shipment em `PROPOSALS_RECEIVED` → 409; confirm por `ADMIN` → 403
12. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S2-T4
