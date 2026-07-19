# S1-T4 — Shipment Browse API (Carrier)

**Sprint:** 1 — Shipment API
**Status:** pending
**Depends on:** S1-T3 (shipment create/publish)

---

## User story

Como carrier, quero navegar pelos fretes `OPEN` disponíveis, filtrando por cidade e tipo, para decidir em quais entrar na fila de propostas (S2).

## Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/shipments/browse` | CARRIER | Lista fretes `OPEN`, paginado, com filtro opcional por `cityId` e `type` |

## Decisões de design

1. **`status = OPEN` é implícito, não um filtro do client** — o endpoint só mostra fretes abertos; não é possível pedir `DRAFT` (nem existe motivo, dado que carrier nunca deveria ver rascunho de outro customer).
2. **Endereço redigido (privacy-by-default)** — antes do carrier ser selecionado (`CARRIER_SELECTED`), rua/número/complemento/CEP/lat/lng/andar não são expostos. O browse retorna só `{ type: ORIGIN|DESTINATION, neighborhoodName, cityId, state }` por endereço — suficiente pro carrier avaliar distância/viabilidade sem vazar o endereço exato do customer pra qualquer um navegando a fila. Alinhado com o diferencial de segurança do `BUSINESS-FOUNDATION.md` (confiança progressiva). Endereço completo só passa a ser visível quando existir uma feature de detalhe pós-seleção (fora de escopo aqui).
3. **Identidade do customer não é exposta** — a resposta não inclui nome/telefone/rating do customer nesta task (não há necessidade de decisão ainda; carrier decide só pelos dados do frete).
4. **Qualquer `CARRIER` autenticado pode navegar**, mesmo sem verificação aprovada — a restrição de `verificationStatus = APPROVED` é uma regra de **propor** (S2), não de **olhar**.
5. **Verificação (S5) fica de fora** — não checa `carrierProfile.verificationStatus` nem frota nesta task.

## Query params

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `cityId` | uuid | não | Filtra por cidade |
| `type` | `ShipmentType` | não | Filtra por tipo de frete |
| `cursor` | string | não | Paginação |
| `limit` | int (≤100) | não | Default 20 |

## Response shape (por item)

```jsonc
{
  "id": "uuid",
  "type": "RESIDENTIAL_MOVING",
  "description": "Mudança de apartamento, 2 quartos",
  "estimatedWeightKg": 250,
  "estimatedVolumeM3": 8,
  "vehicleTypeRequired": "VAN",
  "scheduledDate": "2026-08-01",
  "timeWindow": "MORNING",
  "specificTime": null,
  "suggestedPriceInCents": 23000,
  "customerSlaHours": 8,
  "createdAt": "2026-07-19T...",
  "addresses": [
    { "type": "ORIGIN", "neighborhoodName": "Manaíra", "cityId": "uuid", "state": "PB" },
    { "type": "DESTINATION", "neighborhoodName": "Tambaú", "cityId": "uuid", "state": "PB" }
  ]
}
```

## Out of scope

- Entrar na fila de propostas (`proposalQueueEntry`) — S2-T1
- Endereço completo pós-seleção
- Filtro por `vehicleTypeRequired` do carrier (carrier vê tudo, decide sozinho por enquanto)
- Gate de verificação/frota pra navegar

## Acceptance criteria

- [ ] `GET /api/shipments/browse` sem auth → 401
- [ ] `GET /api/shipments/browse` como CUSTOMER → 403
- [ ] `GET /api/shipments/browse` como CARRIER → 200, só fretes `OPEN`
- [ ] Endereços retornados sem `street`/`number`/`complement`/`zipCode`/`lat`/`lng`/`floor`/`hasElevator`
- [ ] Filtro `cityId` funciona
- [ ] Filtro `type` funciona
- [ ] Paginação (`cursor`/`limit`) funciona
- [ ] Fretes `DRAFT` de qualquer customer nunca aparecem
- [ ] Swagger documenta o endpoint

## Complexity

Low — leitura só, reaproveita o `shipmentRepository` já existente (adiciona um método de listagem filtrada), sem escrita nem cálculo novo.
