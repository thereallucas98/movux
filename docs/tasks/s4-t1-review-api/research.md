# S4-T1 — Research

## Decision Log

### Gate de elegibilidade pra review

**Decision:** `shipment.status === 'DELIVERED'` libera o envio de reviews (não `REVIEWED`).

**Reason:** `§10.1` ("Reviews only allowed when `shipment.status = REVIEWED`") cria um paradoxo lógico — se review só é permitida quando o status já é `REVIEWED`, nada dispararia a transição `DELIVERED → REVIEWED`, já que a própria review seria simultaneamente pré-condição e efeito. `§12` ("Reviews only enabled after `shipment.status = DELIVERED` confirmed") e o diagrama de lifecycle (`DELIVERED → both leave reviews → REVIEWED`) são consistentes entre si e implementáveis; `§10.1` fica registrado como erro de redação do doc.

### Timing da transição `DELIVERED → REVIEWED`

**Decision:** dispara 1x, só quando as duas reviews existem — mesmo padrão do `SAFETY_CONFIRMED` (S3-T4).

**Reason:** o diagrama de lifecycle usa o plural ("both leave reviews → REVIEWED"), tratando `REVIEWED` como resultado da dupla, não de uma review isolada. Implementação: depois de criar a review, consultar `reviewRepo.findByShipment(shipmentId)` de novo; se agora existem as duas (`reviewerRole: CUSTOMER` e `CARRIER`), chamar `shipmentRepo.updateStatus(shipmentId, 'REVIEWED')`.

## Technical Analysis

- **`ReviewRepository` (novo):**
  ```ts
  export interface ReviewRepository {
    findByShipment(shipmentId): Promise<ReviewWithTags[]>
    findByShipmentAndRole(shipmentId, reviewerRole): Promise<Review | null>
    create(data: CreateReviewInput): Promise<ReviewWithTags>
  }
  ```
  `create` grava `Review` + `ReviewTagSelection[]` numa única operação (`prisma.review.create({ data: { ..., tagSelections: { create: tagIds.map(tagId => ({ tagId })) } } })`), mesmo padrão usado em `proposal.repository.ts#create` pra `attempts`.
- **`ReviewTagRepository` (novo, mínimo):**
  ```ts
  export interface ReviewTagRepository {
    findByIds(tagIds: string[]): Promise<{ id: string; targetRole: ReviewerRole }[]>
  }
  ```
  Usado só pra validar que cada `tagId` enviado existe e tem `targetRole` == papel avaliado.
- **`customerProfileRepo.findUserIdById(customerProfileId)` (novo método)** — resolve o `revieweeId` (User.id) quando o carrier avalia o customer.
- **Resolução de `revieweeId`:**
  - Customer avalia → `revieweeId = proposalRepo.findAcceptedByShipment(shipmentId).carrierId` (já é `User.id`)
  - Carrier avalia → `revieweeId = customerProfileRepo.findUserIdById(shipment.customerId).userId`
- **Acesso (`resolveSafetyParticipant`, reaproveitado):** mesmo predicado "dono ou carrier selecionado" — mas aqui o gate de status é `DELIVERED` **ou** `REVIEWED` (pra permitir ler/enviar a 2ª review depois que a 1ª já disparou a transição).
- **Validação de tags:** `reviewTagRepo.findByIds(tagIds)` → se algum id não existir, ou `targetRole` for diferente do papel avaliado (não do papel de quem envia — ex.: customer avaliando carrier precisa de tags com `targetRole: CARRIER`), → 400.

## Edge Cases

| Case | Behavior |
|---|---|
| `POST /reviews` com shipment `DELIVERED`, ainda sem nenhuma review | cria a 1ª, shipment continua `DELIVERED` |
| `POST /reviews` completando o par | cria a 2ª, shipment vira `REVIEWED` |
| `POST /reviews` com shipment já `REVIEWED` (só a 2ª review, papel ainda não tinha revisado) | permitido — `REVIEWED` não bloqueia a 2ª review que ainda falta |
| `POST /reviews` duas vezes pro mesmo papel | 409 (`ALREADY_REVIEWED`, novo código) |
| `POST /reviews` com `rating` fora de 1-5 | 400 (validação Zod) |
| `POST /reviews` com tag de `targetRole` errado | 400 |
| `POST /reviews` com `tagId` inexistente | 400 |
| `POST /reviews` antes de `DELIVERED` (ex.: `IN_TRANSIT`) | 409 `INVALID_STATE_TRANSITION` |
| `GET /reviews` com 0, 1 ou 2 reviews | retorna o que existir, sem erro |

## Blockers

✅ No blockers — as duas decisões resolvidas em chat.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3) — QA precisa inserir 2 `ReviewTag` manualmente via SQL (1 `CARRIER`, 1 `CUSTOMER`) já que a S4-T3 ainda não existe.
