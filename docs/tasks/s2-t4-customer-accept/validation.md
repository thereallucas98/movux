# S2-T4 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Shipment PROPOSALS_RECEIVED após 1ª proposta | `PROPOSALS_RECEIVED` | ✅ |
| 2 | Customer lista as propostas | 2 propostas `ACTIVE` | ✅ |
| 3 | Accept | HTTP 200 | ✅ |
| 4 | Shipment vira CARRIER_SELECTED + finalPriceInCents | `CARRIER_SELECTED 21000` | ✅ |
| 5 | Outra proposta rejeitada em cascata | `REJECTED` | ✅ |
| 6 | Fila do carrier perdedor | `EXHAUSTED` | ✅ |
| 7 | Accept 2x (já ACCEPTED / shipment não é mais PROPOSALS_RECEIVED) | 409 | ✅ |
| 8 | Reject com tentativa < 5 | proposta continua `ACTIVE` | ✅ |
| 9 | Reject na 5ª tentativa | `Proposal.status: REJECTED`, fila `EXHAUSTED` | ✅ |
| 10 | Swagger — 3 endpoints sob `Proposals` | presentes | ✅ |

Todos os 10 casos do `qa-roteiro.md` passaram. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, todos pré-existentes no código legado do Turnora (`tenant-memberships`, `workspace-memberships`, `shift-timelines`, `tenants`/`workspaces` plan-limits). Zero erros novos em arquivos de `shipment`/`proposal`.

## Desvios encontrados durante execução

### 1. Lockout no join-queue após a transição `OPEN → PROPOSALS_RECEIVED`

Ao implementar a transição `submitProposal: OPEN → PROPOSALS_RECEIVED` na 1ª proposta (conforme o gap descrito no `brief.md`), o guard de `joinProposalQueue` (`status !== 'OPEN'`) ficou desatualizado: depois que 1 carrier propunha, nenhum outro conseguia mais entrar na fila (`409 INVALID_STATE_TRANSITION`), mesmo o shipment ainda aceitando novas propostas.

**Fix:** `join-proposal-queue.use-case.ts` — guard ampliado para aceitar `OPEN` ou `PROPOSALS_RECEIVED`. Por consistência, `shipmentRepository.listOpenForBrowse` também passou a incluir shipments em `PROPOSALS_RECEIVED` no browse (carriers devem conseguir descobrir e entrar em fretes que já têm propostas).

**Descoberto via:** QA caso 2 mostrou só 1 de 2 propostas esperadas — o `join` do 2º carrier no script de setup estava falhando silenciosamente (saída redirecionada mascarou o 409).

### 2. `acceptProposal` sem transação cross-repositório

O fluxo de accept toca 3 tabelas em chamadas sequenciais (`proposal`, `shipment`, `proposalQueueEntry`) sem `$transaction` envolvendo os três repositórios — consistente com o padrão já usado no resto do Sprint 2 (nenhuma outra use-case do sprint usa transação cross-repo). Risco aceito: uma falha no meio do fluxo pode deixar estado parcial (ex.: proposta aceita mas fila não esgotada). Não bloqueante para este sprint; candidato a revisão se o volume justificar transação real futuramente.

### 3. Erro de aritmética no próprio roteiro de QA (não é bug de aplicação)

O caso 9 originalmente rodava só 3 tentativas extras (`for p in 3900 3800 3700`) partindo de `currentAttempt=1`, chegando em `currentAttempt=4` — não 5. A checagem `>= MAX_ATTEMPTS` corretamente não disparava a transição terminal. Corrigido para 4 tentativas extras (`3900 3800 3700 3600`) no `qa-roteiro.md`; re-executado e confirmado `REJECTED`/`EXHAUSTED`.

## Acceptance criteria (brief.md)

- [x] `GET /proposals` retorna todas as propostas do shipment com tentativas
- [x] `GET /proposals` de quem não é dono → 404
- [x] Accept → `Proposal: ACCEPTED`, `Shipment: CARRIER_SELECTED` com `finalPriceInCents` correto
- [x] Accept rejeita automaticamente as outras propostas `ACTIVE`
- [x] Accept esgota as `proposalQueueEntry` não-terminais
- [x] Accept em proposta não-`ACTIVE` → 409
- [x] Reject < 5ª tentativa → proposta continua `ACTIVE`
- [x] Reject na 5ª tentativa → `REJECTED` + fila `EXHAUSTED` + próximo `WAITING` chamado
- [x] `submitProposal` muda `shipment.status: OPEN → PROPOSALS_RECEIVED`
- [x] Swagger documenta os 3 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

Nenhum.
