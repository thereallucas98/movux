# S3-T4 — Shipment Event Log

**Sprint:** 3 — Transit Flow
**Status:** pending
**Depends on:** S3-T3 (Delivery confirmation) — última task do Sprint 3

---

## User story

Como customer ou carrier de um frete, quero ver o histórico de tudo que aconteceu com ele (publicado, propostas, seleção, segurança, coleta, trânsito, entrega), pra ter um registro auditável do ciclo completo.

## Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/shipments/:id/events` | CUSTOMER (dono) ou CARRIER (selecionado) | Lista o histórico de eventos do frete, em ordem cronológica |

## Escopo — quais eventos são logados

`ShipmentEvent.eventType` (`DATABASE-DESIGN.md §9.2`) tem 11 valores, mas nem todos têm uma use-case que os produz hoje. Escopo desta task = **retrofit de todas as use-cases já existentes** (Sprints 1-3) que correspondem a um `eventType` com produtor real:

| `eventType` | Use-case que produz (já commitada) |
|---|---|
| `PUBLISHED` | `publish-shipment.use-case.ts` (S1-T3) |
| `PROPOSAL_RECEIVED` | `submit-proposal.use-case.ts` (S2-T2) |
| `CARRIER_SELECTED` | `accept-proposal.use-case.ts` (S2-T4) |
| `SAFETY_CONFIRMED` | `confirm-safety-check-in.use-case.ts` (S3-T1) — só quando as duas confirmações existem (ver `research.md`) |
| `COLLECTED` | `mark-collected.use-case.ts` (S3-T2) |
| `IN_TRANSIT` | `mark-in-transit.use-case.ts` (S3-T2) |
| `DELIVERED` | `mark-delivered.use-case.ts` (S3-T2) |

**Fora do escopo** (sem produtor no código hoje, ou custo/benefício desproporcional):
- `WINDOW_ALERT` — depende de integração Google Maps, não existe
- `CANCELLED` / `EXPIRED` — não existe nenhuma use-case de cancelamento ou expiração de *shipment* (só existe expiração de *proposta*, entidade diferente)
- `CARRIER_CALLED` — tem produtor real (`refill-called-group.ts`), mas essa função (e `sweepExpiredProposals`, que a chama) é compartilhada por 9 use-cases diferentes, incluindo 3 endpoints puramente de leitura. Logá-la exigiria threading de `shipmentEventRepo` em ~12 use-cases e ~9 rotas já commitadas e QA'd, por um evento sem nenhum consumidor hoje (sem UI, sem notificação) — decisão registrada em `research.md`, follow-up para quando houver uma necessidade real

Esses 4 `eventType` continuam no enum (schema já existente) mas não são exercitados por nenhum código nesta task.

## Regras

1. `GET /events` só pro customer dono ou o carrier selecionado (mesma resolução das tasks anteriores da Sprint 3) — qualquer outro → `NOT_FOUND`
2. Cada evento grava `shipmentId`, `eventType`, `triggeredBy` (userId de quem agiu; `null` quando é o sistema — ex.: `CARRIER_CALLED`), `occurredAt`, `metadata` opcional
3. O retrofit é **aditivo** — cada use-case existente ganha uma chamada a mais (criar o evento) no fim do fluxo, sem mudar nenhum comportamento ou contrato de resposta já testado nas tasks anteriores
4. Ordem de retorno: cronológica (`occurredAt asc`)

## Out of scope

- `WINDOW_ALERT`, `CANCELLED`, `EXPIRED`, `CARRIER_CALLED` — sem use-case produtora, ou custo desproporcional (ver tabela acima e `research.md`)
- Qualquer nova funcionalidade de cancelamento/expiração de shipment — não é o objetivo desta task, só logging do que já existe
- Notificações baseadas em eventos — Sprint 6
- Paginação do histórico — lista completa por enquanto (frete tem no máximo ~10 eventos no lifecycle atual)

## Acceptance criteria

- [ ] `GET /events` retorna todos os eventos do frete em ordem cronológica
- [ ] `GET /events` de quem não é participante → 404
- [ ] Cada uma das 7 use-cases da tabela de escopo passa a gravar seu `shipmentEvent` correspondente, sem alterar o comportamento/resposta já existente
- [ ] Swagger documenta o endpoint
- [ ] Collection Insomnia atualizada

## Complexity

Medium — retrofit espalhado por 7 use-cases de 5 tasks diferentes já commitadas (S1-T3 até S3-T2), mas cada uma delas é uma inserção isolada e aditiva (sem função compartilhada por múltiplos domínios no meio do caminho, diferente do `CARRIER_CALLED` descartado). Duas questões de comportamento específico já resolvidas na Research: timing do `SAFETY_CONFIRMED` e não-duplicação do `DELIVERED` no auto-confirm da S3-T3.
