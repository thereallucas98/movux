# S3-T4 — Research

## Decision Log

### Timing do evento `SAFETY_CONFIRMED`

**Decision:** dispara 1x, só quando as duas confirmações existem (na chamada que completa o par).

**Reason:** o `eventType` é singular ("confirmado", não "confirmado por X"), e o diagrama de lifecycle do `DATABASE-DESIGN.md` trata a confirmação de segurança como um marco único entre `CARRIER_SELECTED` e `COLLECTED` — não dois eventos parciais. Implementação: depois de `safetyCheckInRepo.create(...)`, chamar `safetyCheckInRepo.findByShipment(shipmentId)` de novo; se agora existem as duas linhas (`CUSTOMER` e `CARRIER`), gravar o evento com `triggeredBy: null` (marco do sistema — nenhum dos dois lados "é" quem completou, é a combinação dos dois).

### `DELIVERED` duplicado no auto-confirm da S3-T3

**Decision:** não — só `mark-delivered.use-case.ts` (S3-T2, ação do carrier) grava o evento `DELIVERED`. `sweep-auto-confirm-delivery.ts` (S3-T3) não é tocado.

**Reason:** `DELIVERED` representa a transição de `Shipment.status`, que só acontece uma vez (quando o carrier marca a entrega). A confirmação do customer — manual ou automática — já tem seu próprio registro auditável completo em `DeliveryConfirmation` (`confirmedAt`, `confirmed`, `customerId`); duplicar como `shipmentEvent` seria redundante. A redação do `DATABASE-DESIGN.md §9.3` parece ter sido escrita antes da S3-T3 existir; não editamos `sweep-auto-confirm-delivery.ts`.

### `CARRIER_CALLED` — retirado do escopo

**Decision:** Fast — `CARRIER_CALLED` sai do escopo desta task, junto de `WINDOW_ALERT`/`CANCELLED`/`EXPIRED` (mesmo padrão: existe no enum, sem produtor ainda).

**Reason:** análise mais profunda no nível do Plan mostrou que `refillCalledGroup` e `sweepExpiredProposals` (que o chama internamente) são compartilhados por **9 use-cases diferentes**, incluindo 3 endpoints puramente de leitura (`get-my-queue-entry`, `get-my-proposal`, `list-proposals-for-shipment`) que não têm nenhuma outra razão pra depender de `shipmentEventRepo`. Exigir esse repo nas assinaturas dessas duas funções compartilhadas obrigaria (via TypeScript) threading em ~12 use-cases e ~9 rotas já commitadas e QA'd — desproporcional pra um evento de sistema sem nenhum consumidor hoje (sem UI, sem notificação). A tabela de escopo original do `exploration.md` ("6 call sites, uma mudança cobre todos") subestimou o alcance real por não ter rastreado a cadeia transitiva via `sweepExpiredProposals`.

**Follow-up:** revisitar quando `CARRIER_CALLED` tiver um consumidor real (UI mostrando "chamamos 3 carriers" no histórico, ou notificação) — nesse ponto o custo do threading se justifica.

## Technical Analysis

- **`ShipmentEventRepository` (novo):**
  ```ts
  export interface ShipmentEventRepository {
    create(shipmentId: string, eventType: EventType, triggeredBy: string | null, metadata?: object): Promise<void>
    listByShipment(shipmentId: string): Promise<ShipmentEvent[]>
  }
  ```
- **Retrofit — 6 pontos de inserção** (`CARRIER_CALLED` fora de escopo, `SAFETY_CONFIRMED` é condicional dentro de 1 use-case):
  1. `publish-shipment.use-case.ts` → `PUBLISHED`, `triggeredBy: userId`
  2. `submit-proposal.use-case.ts` → `PROPOSAL_RECEIVED`, `triggeredBy: carrierId`, `metadata: { proposalId: proposal.id }`
  3. `accept-proposal.use-case.ts` → `CARRIER_SELECTED`, `triggeredBy: userId` (customer)
  4. `confirm-safety-check-in.use-case.ts` → `SAFETY_CONFIRMED` condicional (ver decisão acima), `triggeredBy: null`
  5. `mark-collected.use-case.ts` → `COLLECTED`, `triggeredBy: userId` (carrier)
  6. `mark-in-transit.use-case.ts` → `IN_TRANSIT`, `triggeredBy: userId` (carrier)
  7. `mark-delivered.use-case.ts` → `DELIVERED`, `triggeredBy: userId` (carrier)

  (7 use-cases, 6 `eventType` distintos + `SAFETY_CONFIRMED` condicional = 7 tipos de evento no total.)
- **`GET /events`:** reaproveita `resolveSafetyParticipant` (3ª reutilização, mesmo predicado "dono ou carrier selecionado"). Sem gate de status — histórico deve ser legível em qualquer momento do lifecycle, não só num status específico (diferente de `/safety` e `/delivery-confirmation`, que só fazem sentido numa janela).
- **Assinatura de cada use-case retrofitada:** ganha `shipmentEventRepo: ShipmentEventRepository` no objeto `repos` — muda a interface `XRepos` de cada arquivo, mas não o comportamento externo (rota/contrato de resposta intactos). Rotas existentes (`publish`, `queue/join`, `proposal`, `proposals/:id/accept`, `safety/confirm`, `collect`, `transit`, `deliver`) precisam passar `shipmentEventRepository` na montagem dos repos — 8 arquivos de rota tocados além dos 8 use-cases.

## Edge Cases

| Case | Behavior |
|---|---|
| `GET /events` por quem não é participante | 404 |
| `GET /events` num frete recém-criado (`DRAFT`, nenhum evento ainda) | lista vazia `[]` |
| `refillCalledGroup` chama 2 carriers de uma vez (2 slots livres) | 2 eventos `CARRIER_CALLED`, um por `queueEntry` |
| `confirmSafetyCheckIn` — 1ª confirmação (só 1 dos 2 papéis) | nenhum evento `SAFETY_CONFIRMED` ainda |
| `confirmSafetyCheckIn` — 2ª confirmação (completa o par) | 1 evento `SAFETY_CONFIRMED` |

## Blockers

✅ No blockers — as duas decisões foram resolvidas em chat.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
