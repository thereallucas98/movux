# S3-T4 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | GET /events num shipment `DRAFT` | lista vazia `[]` | ✅ |
| 2 | GET /events com só 1 das 2 confirmações de segurança | `SAFETY_CONFIRMED` ausente | ✅ |
| 3 | GET /events fluxo completo (publish → propose → accept → safety×2 → collect → transit → deliver) | 7 eventos, ordem cronológica correta | ✅ |
| 4 | `triggeredBy` de cada evento | customer nos eventos de customer, carrier nos de carrier, `null` em `SAFETY_CONFIRMED` | ✅ |
| 5 | GET pelo carrier selecionado | 200 | ✅ |
| 6 | GET por quem não é participante | 404 | ✅ |
| 7 | Swagger — endpoint sob `Shipment Events` | presente | ✅ |

Todos os 7 casos do `qa-roteiro.md` passaram de primeira. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S3-T3, todos pré-existentes no código legado do Turnora. Zero erros novos nos 7 use-cases retrofitados, no repositório novo, ou nas rotas tocadas.

## Desvios encontrados durante execução

Nenhum desvio de comportamento durante a Execution. Três decisões de escopo/arquitetura, todas registradas em `research.md` **antes** do Plan (nenhuma delas exigiu retrabalho):

1. **`SAFETY_CONFIRMED` dispara só quando as duas confirmações existem** (não uma vez por papel) — condicional em `confirm-safety-check-in.use-case.ts` que consulta `safetyCheckInRepo.findByShipment` de novo após criar a confirmação.
2. **`DELIVERED` não é duplicado pelo auto-confirm da S3-T3** — `sweep-auto-confirm-delivery.ts` não foi tocado; só `mark-delivered.use-case.ts` (ação do carrier) grava o evento.
3. **`CARRIER_CALLED` retirado do escopo** — descoberto durante o Plan que `refillCalledGroup`/`sweepExpiredProposals` são compartilhados por 9 use-cases (incluindo 3 somente-leitura), o que exigiria threading de `shipmentEventRepo` em ~12 use-cases e ~9 rotas já commitadas por um evento sem consumidor hoje. Ficou junto de `WINDOW_ALERT`/`CANCELLED`/`EXPIRED` como fora de escopo, com follow-up registrado.

## Acceptance criteria (brief.md)

- [x] `GET /events` retorna todos os eventos do frete em ordem cronológica
- [x] `GET /events` de quem não é participante → 404
- [x] Cada uma das 7 use-cases da tabela de escopo passa a gravar seu `shipmentEvent` correspondente, sem alterar o comportamento/resposta já existente
- [x] Swagger documenta o endpoint
- [x] Collection Insomnia atualizada

## Follow-ups

- `CARRIER_CALLED`: revisitar quando houver um consumidor real (UI ou notificação) que justifique o threading de `shipmentEventRepo` pelos 9 use-cases compartilhados de fila/proposta.
- (Herdado da S3-T3) Revisitar `Shipment.collectedAt`/`inTransitAt`/`deliveredAt` quanto à redundância com os eventos `COLLECTED`/`IN_TRANSIT`/`DELIVERED` agora que o event log existe de fato — ambos coexistem por ora sem conflito (o event log é o histórico completo; os campos no `Shipment` são o acesso rápido ao "último timestamp" sem precisar agregar o log).
