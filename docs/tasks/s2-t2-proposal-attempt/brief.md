# S2-T2 — Proposal Attempt API

**Sprint:** 2 — Proposals & Queue
**Status:** pending
**Depends on:** S2-T1 (proposal queue)

---

## User story

Como carrier chamado (`CALLED`) na fila, quero enviar uma proposta de preço, revisá-la (contra-oferta) até 5 vezes, ou desistir, para negociar com o customer.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/shipments/:id/proposal` | CARRIER (`CALLED`) | Cria a proposta (1ª tentativa) |
| `POST` | `/api/shipments/:id/proposal/attempts` | CARRIER (dono) | Nova tentativa (contra-oferta), até 5 no total |
| `POST` | `/api/shipments/:id/proposal/withdraw` | CARRIER (dono) | Desiste da proposta inteira |
| `GET` | `/api/shipments/:id/proposal` | CARRIER (dono) | Vê a própria proposta + tentativas |

## Decisões de design (fronteira com S2-T3 e S2-T4)

1. **Só carrier `CALLED` pode criar a proposta.** Ao criar, a `proposalQueueEntry` do carrier vira `ACTIVE` (não ocupa mais uma das 3 vagas `CALLED`) e isso dispara o `refillCalledGroup` (S2-T1) — libera vaga pro próximo `WAITING`.
2. **Cálculo de `agreedSlaHours` é feito aqui, não na S2-T3.** O campo é obrigatório no schema (`Proposal.agreedSlaHours NOT NULL`) — não dá pra criar a proposta sem ele. Fórmula do `DATABASE-DESIGN.md`: `agreedSlaHours = ceil((customerSlaHours + carrierSlaHours) / 2)`. `customerSlaHours` vem do `shipment`; `carrierSlaHours` vem do payload desta API.
3. **`expiresAt = createdAt + agreedSlaHours` horas**, recalculado a cada nova tentativa (mesmo `agreedSlaHours`, já que `carrierSlaHours` não muda entre tentativas — só `priceInCents`/`message`).
4. **"SLA engine" (S2-T3) é o mecanismo de expiração automática** (varrer propostas `ACTIVE` vencidas e marcar `EXPIRED`) — não existe aqui. Nesta task, `expiresAt` só é gravado, nunca checado/varrido.
5. **Contra-oferta não exige resposta prévia do customer.** Sem a S2-T4 (accept/reject) ainda existindo, `POST /proposal/attempts` permite nova tentativa a qualquer momento enquanto `status = ACTIVE` e `currentAttempt < 5` — não bloqueia por "última tentativa ainda pendente". Se isso precisar mudar quando a S2-T4 existir, é ajuste da própria S2-T4 (ela decide o que fazer com tentativas antigas ao aceitar/rejeitar), não desta task.
6. **Rejeição do customer (accept/reject por tentativa) é 100% da S2-T4** — não faz parte desta task.
7. **`withdraw` afeta a fila** — muda a `proposalQueueEntry` pra `WITHDRAWN` (esteja ela `CALLED` ou `ACTIVE`) e dispara `refillCalledGroup`.

## Payload — `POST /proposal` e `POST /proposal/attempts`

```jsonc
{ "priceInCents": 22000, "carrierSlaHours": 6, "message": "Posso fazer até sexta" }
```

`carrierSlaHours` só é lido na 1ª tentativa (define `agreedSlaHours` da proposta inteira); em tentativas seguintes é ignorado se enviado (o campo não muda depois de criado).

## Out of scope

- Accept/reject de tentativa pelo customer (S2-T4)
- Expiração automática (S2-T3)
- Limite de propostas ativas por plano (`plan.maxActiveProposals`) — Fase de billing, não Sprint 2

## Acceptance criteria

- [ ] `POST /proposal` com carrier `CALLED` → 201, `Proposal` criado com `currentAttempt: 1`, `attempts: [1]`, `agreedSlaHours` correto
- [ ] `POST /proposal` com carrier não-`CALLED` (ex: `WAITING`) → 409
- [ ] `POST /proposal` duplicado (carrier já tem proposta no shipment) → 409
- [ ] Queue entry do carrier vira `ACTIVE` após o `POST /proposal`; próximo `WAITING` é chamado
- [ ] `POST /proposal/attempts` incrementa `currentAttempt`, cria nova `ProposalAttempt`
- [ ] `POST /proposal/attempts` na 6ª tentativa → 409 `TOO_MANY_ATTEMPTS`
- [ ] `POST /proposal/withdraw` → `status: WITHDRAWN`, queue entry `WITHDRAWN`, refill dispara
- [ ] `GET /proposal` retorna proposta + tentativas do carrier autenticado; 404 se não existe
- [ ] Swagger documenta os 4 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium — cruza três agregados (`proposalQueueEntry`, `proposal`, `proposalAttempt`) numa única operação de criação, com efeito colateral na fila.
