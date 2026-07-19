# S1-T3 — Shipment API (Customer)

**Sprint:** 1 — Shipment API
**Status:** pending
**Depends on:** S1-T1 (geography), S1-T2 (pricing)

---

## User story

Como customer, quero criar um frete (com origem, destino e modificadores), publicá-lo, e consultar/listar meus fretes, para que transportadores possam vê-lo assim que estiver aberto (S1-T4).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments` | CUSTOMER | Cria um frete em `DRAFT` com endereços + modificadores, calcula `suggestedPriceInCents` |
| `POST` | `/api/shipments/:id/publish` | CUSTOMER (dono) | Transiciona `DRAFT → OPEN` |
| `GET` | `/api/shipments/:id` | CUSTOMER (dono) | Detalhe de um frete |
| `GET` | `/api/shipments` | CUSTOMER | Lista os fretes do customer autenticado (paginado, filtro opcional por `status`) |

## Decisões de design (resolvidas, não abertas)

1. **Fluxo em duas etapas**: `create` sempre cria em `DRAFT`; `publish` é a única forma de virar `OPEN`. `publish` só valida `status === DRAFT` (endereços já são obrigatórios na criação, então não há o que faltar).
2. **Endereços aninhados na criação**: `POST /api/shipments` recebe `origin` e `destination` no mesmo payload (nested write atômica) — não são endpoints separados. `shipmentPhoto` (upload de fotos) fica fora de escopo (depende de Supabase Storage, task futura).
3. **Cálculo de `suggestedPriceInCents` exige bairro resolvível**: `origin.neighborhoodId` e `destination.neighborhoodId` são **obrigatórios** no payload (não apenas opcionais como no schema) — sem eles não dá pra achar o `pricingTemplate`/`pricingSnapshot` do corredor. Se o par de clusters não tiver `pricingTemplate` pro `shipmentType` enviado, a API retorna `422 NO_PRICING_AVAILABLE`. Isso restringe a criação de frete, por enquanto, a bairros que já estão no catálogo semeado (S1-T1) — aceitável pro MVP hiperlocal.
4. **`neighborhoodName` é derivado, não recebido do client** — copiado do `Neighborhood.name` resolvido via `neighborhoodId`, não confiamos em texto livre do client pra esse campo.
5. **Modificadores por percentual são "congelados" na criação**: `shipmentModifier.appliedValueInCents` é calculado uma vez (`pricingModifier.valueInCents` se `FIXED`; `basePriceInCents × valueInCents / 10000` se `PERCENTAGE`) e nunca recalculado depois — snapshot histórico, como o campo já documenta no `DATABASE-DESIGN.md`.
6. **Fora de escopo desta task**: `etaMinutes`, `windowExpiresAt` (dependem de Google Maps Distance Matrix — integração futura), `expiresAt` (política de expiração automática — vira relevante quando existir um job de background, fora do Sprint 1), `safetyTerm*` (Sprint 3), fotos.

## Payload de criação (`POST /api/shipments`)

```jsonc
{
  "type": "RESIDENTIAL_MOVING",        // ShipmentType
  "description": "Mudança de apartamento, 2 quartos",
  "estimatedWeightKg": 250,             // opcional
  "estimatedVolumeM3": 8,               // opcional
  "vehicleTypeRequired": "VAN",         // VehicleType
  "scheduledDate": "2026-08-01",
  "timeWindow": "MORNING",              // TimeWindow
  "specificTime": null,                 // só se timeWindow = SPECIFIC
  "customerSlaHours": 8,
  "origin": {
    "street": "Av. Rui Carneiro", "number": "500", "complement": null,
    "neighborhoodId": "<uuid — obrigatório>", "cityId": "<uuid>", "state": "PB",
    "zipCode": "58037000", "lat": null, "lng": null, "floor": 3, "hasElevator": true
  },
  "destination": { /* mesma forma */ },
  "modifiers": [{ "modifierCode": "HELPER", "quantity": 2 }]  // opcional, default []
}
```

## Out of scope

- Publicação automática (sempre manual via `/publish`)
- Edição de frete em `DRAFT` (`PATCH`) — não pedido pelo brief original, fica pra quando surgir necessidade real
- Upload de fotos (`shipmentPhoto`)
- Visibilidade pra carrier/admin (S1-T4 cobre a listagem do carrier; `GET /:id` aqui é só pro dono)
- Cancelamento (`cancelledAt`/`cancelReason`) — lifecycle mais adiante

## Acceptance criteria

- [ ] `POST /api/shipments` com payload válido → 201, `status: DRAFT`, `suggestedPriceInCents` correto (bate com `pricingSnapshot` + modificadores)
- [ ] `POST /api/shipments` sem `origin.neighborhoodId` ou `destination.neighborhoodId` → 400
- [ ] `POST /api/shipments` com corredor sem `pricingTemplate` pro `shipmentType` → 422 `NO_PRICING_AVAILABLE`
- [ ] `POST /api/shipments/:id/publish` em frete `DRAFT` → 200, `status: OPEN`
- [ ] `POST /api/shipments/:id/publish` em frete que não é `DRAFT` → 409 `INVALID_STATE_TRANSITION`
- [ ] `POST /api/shipments/:id/publish` de outro customer → 404
- [ ] `GET /api/shipments/:id` do dono → 200 com endereços + modificadores
- [ ] `GET /api/shipments/:id` de outro customer → 404
- [ ] `GET /api/shipments` lista só os fretes do customer autenticado, paginado
- [ ] Swagger documenta os 4 endpoints
- [ ] Collection Insomnia exportada

## Complexity

Medium-High — primeira API real do domínio (não é auth nem seed): envolve nested writes, cálculo de preço via lookup de cluster, e um endpoint de transição de estado.
