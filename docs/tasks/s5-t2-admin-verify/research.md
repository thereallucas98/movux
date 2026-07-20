# S5-T2 — Research

## Decision Log

### Auto-approve do `CarrierProfile.verificationStatus`

**Decision:** sim, automático — quando um `approve` de documento completa o conjunto dos 5 tipos obrigatórios (cada um com pelo menos 1 documento `APPROVED`), `CarrierProfile.verificationStatus → APPROVED`, `verifiedBy`/`verifiedAt` = o mesmo admin/momento do `approve` que completou.

**Reason:** mesmo padrão já estabelecido nesta sprint pra `SAFETY_CONFIRMED` (S3-T4) e `REVIEWED` (S4-T1) — a peça final de um conjunto completa o agregado automaticamente, sem exigir uma segunda ação manual do admin pra um estado que já está logicamente decidido pelos dados.

### Auto-reject do `CarrierProfile.verificationStatus`

**Decision:** não — rejeitar 1 documento não move o perfil pra `REJECTED`; fica `PENDING`.

**Reason:** mesma assimetria da S4-T2 (`isFlagged` bidirecional vs. `isActive` só desliga automaticamente): ações automáticas "positivas" são seguras, ações "negativas" que bloqueiam alguém pedem julgamento humano. Como o carrier pode reenviar um documento corrigido do mesmo tipo (S5-T1: sem `UNIQUE(carrierId, type)`), travar o perfil inteiro em `REJECTED` por 1 documento rejeitado penalizaria um erro corrigível.

## Technical Analysis

- **`carrier-document.repository.ts` — métodos novos:**
  ```ts
  findById(id): Promise<CarrierDocument | null>
  updateStatus(id, status: 'APPROVED' | 'REJECTED', reviewedBy: string, rejectionReason?: string): Promise<void>
  findByStatus(filter: {status?, cursor?, limit?}): Promise<{data: CarrierDocument[], nextCursor: string|null}>
  findApprovedTypesByCarrier(carrierId): Promise<CarrierDocumentType[]>
  // distinct types com pelo menos 1 documento APPROVED — usado no completeness check
  ```
- **`carrier-profile.repository.ts` — método novo:**
  ```ts
  markVerified(userId, verifiedBy): Promise<void>
  // verificationStatus: APPROVED, verifiedAt: now(), verifiedBy
  ```
- **`approve-carrier-document.use-case.ts`:**
  1. `carrierDocumentRepo.findById(id)` → `NOT_FOUND`
  2. `status !== 'PENDING'` → `INVALID_STATE_TRANSITION`
  3. `updateStatus(id, 'APPROVED', adminUserId)`
  4. `findApprovedTypesByCarrier(document.carrierId)` → se o `Set` cobre todos os `CARRIER_DOCUMENT_TYPES` → `carrierProfileRepo.markVerified(document.carrierId, adminUserId)`
- **`reject-carrier-document.use-case.ts`:**
  1-2. mesmas checagens
  3. `rejectionReason` obrigatório (Zod, não lógica de use-case)
  4. `updateStatus(id, 'REJECTED', adminUserId, rejectionReason)` — sem tocar `CarrierProfile`
- **`list-carrier-documents-for-admin.use-case.ts`:** `carrierDocumentRepo.findByStatus(filter)` — sem checagem de participante além do gate `ADMIN` na rota

## Edge Cases

| Case | Behavior |
|---|---|
| Carrier tem 2 uploads do mesmo `type` (ex. 2× `SELFIE`), ambos `PENDING` | `findApprovedTypesByCarrier` conta *tipos distintos*, não documentos — aprovar os 2 não conta como 2 tipos |
| Aprovar o 5º tipo que faltava | `CarrierProfile.verificationStatus → APPROVED` nesse exato `approve` |
| Aprovar um documento quando os 5 tipos já estavam completos (ex. reenvio aprovado depois de já verificado) | idempotente — `markVerified` roda de novo, sem efeito colateral negativo |
| Rejeitar um documento depois do perfil já `APPROVED` | `CarrierProfile.verificationStatus` permanece `APPROVED` — rejeição isolada de um reenvio não desfaz a verificação já concedida |
| `approve`/`reject` em documento já revisado | 409 `INVALID_STATE_TRANSITION` |
| `reject` sem `rejectionReason` | 400 (Zod) |
| `CUSTOMER`/`CARRIER` chamando qualquer rota `/admin/*` | 403 |

## Blockers

✅ No blockers — as duas decisões resolvidas em chat.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
