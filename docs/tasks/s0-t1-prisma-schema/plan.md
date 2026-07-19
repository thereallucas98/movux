# S0-T1 — Plan

## Ordem de execução

1. Configurar Docker Compose (`apps/web/docker-compose.yml`) com serviço `postgres` na porta 5432
2. Ajustar `apps/web/prisma/schema.prisma` — datasource + generator
3. Escrever todos os enums (24 enums definidos no brief)
4. Escrever modelos na ordem de dependência:
   - Sem FK: `state`, `city`, `neighborhood`, `neighborhoodCluster`, `plan`, `reviewTag`
   - Com FK simples: `user`, `clusterNeighborhood`, `pricingTemplate`, `pricingModifier`
   - Com FK composta: `customerProfile`, `carrierProfile`, `company`, `vehicle`
   - Relacionamentos complexos: `companyMembership`, `carrierDocument`, `subscription`, `subscriptionPayment`, `carrierPricingConfig`
   - Core transaction: `shipment`, `shipmentAddress`, `shipmentModifier`, `shipmentPhoto`
   - Proposals: `proposalQueueEntry`, `proposal`, `proposalAttempt`
   - Chat: `chatRoom`, `chatMessage`
   - Safety: `safetyCheckIn`, `shipmentEvent`, `deliveryConfirmation`
   - Reviews: `review`, `reviewTagSelection`
   - Pricing signals: `pricingSignal`, `pricingSnapshot`
   - Notifications: `notificationLog`
5. Adicionar `@@map` (snake_case) e `@map` em todos os campos
6. Adicionar indexes do DATABASE-DESIGN.md §13 via `@@index`
7. Rodar `pnpm prisma migrate dev --name init`
8. Rodar `pnpm prisma generate`
9. Verificar no Prisma Studio

## Arquivos alterados

- `apps/web/docker-compose.yml` — novo
- `apps/web/prisma/schema.prisma` — rewrite completo
- `apps/web/.env.local` — `DATABASE_URL` apontando para Docker

## Convenção Prisma (Movux)

```prisma
model ShipmentAddress {
  id             String   @id @default(uuid())
  shipmentId     String   @map("shipment_id")
  // ...
  @@map("shipment_address")
}
```

- Model name: `PascalCase` singular
- Field name: `camelCase`
- `@map`: `snake_case`
- `@@map`: `snake_case` singular
