# S5-T2 — Admin Verification API

**Sprint:** 5 — Carrier Verification
**Status:** pending
**Depends on:** S5-T1 (Document upload)

---

## User story

Como admin, quero aprovar ou rejeitar os documentos enviados por um carrier, pra que o cadastro dele seja liberado (ou não) pra operar na plataforma.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/carrier-documents/:id/approve` | ADMIN | Aprova um documento |
| `POST` | `/api/admin/carrier-documents/:id/reject` | ADMIN | Rejeita um documento (com motivo) |
| `GET` | `/api/admin/carrier-documents?status=PENDING` | ADMIN | Lista documentos por status (fila de revisão) |

Primeira rota do projeto restrita a `ADMIN` — todas as anteriores eram `CUSTOMER`/`CARRIER`.

## Regras

1. `approve`: `CarrierDocument.status → APPROVED`, `reviewedBy` = admin, `reviewedAt` = agora
2. `reject`: `status → REJECTED`, `reviewedBy`/`reviewedAt` iguais, `rejectionReason` obrigatório
3. Só documentos `PENDING` podem ser aprovados/rejeitados — já revisado → 409
4. `GET` lista paginada/filtrada por `status` (fila de revisão do admin)

## Pergunta em aberto — como `CarrierDocument.status` afeta `CarrierProfile.verificationStatus`

O `ROADMAP.md` descreve esta task como "approve/reject doc, **atualizar verificationStatus**" — mas `DATABASE-DESIGN.md` não documenta a regra exata de quando `CarrierProfile.verificationStatus` (que tem seu próprio `verifiedAt`/`verifiedBy`, separado do `reviewedAt`/`reviewedBy` de cada documento) deve mudar. Isso precisa de decisão na Research:

- Aprovar todos os 5 documentos obrigatórios do carrier autônomo (`CPF`, `CNH_FRONT`, `CNH_BACK`, `ADDRESS_PROOF`, `SELFIE`) deveria auto-completar `CarrierProfile.verificationStatus → APPROVED`? (mesmo padrão "só quando tudo está completo" já usado pra `SAFETY_CONFIRMED` e `REVIEWED` nesta sprint)
- Rejeitar 1 documento deveria mover `CarrierProfile.verificationStatus → REJECTED` automaticamente, mesmo que o carrier possa reenviar um novo documento do mesmo tipo depois? Ou fica `PENDING` até o carrier corrigir?

## Out of scope

- Validação externa (BigDataCorp/Serpro) — S5-T3
- UI de fila de revisão pro admin — API-first, sem frontend ainda
- Notificar o carrier quando aprovado/rejeitado — Sprint 6
- Suspender/reativar carrier manualmente (`verificationStatus = SUSPENDED`) — não é sobre documentos, é uma ação administrativa separada não pedida nesta task

## Acceptance criteria

- [ ] `POST /approve` muda `status` pra `APPROVED`, registra `reviewedBy`/`reviewedAt`
- [ ] `POST /reject` exige `rejectionReason`, muda `status` pra `REJECTED`
- [ ] Aprovar/rejeitar documento já revisado → 409
- [ ] `GET` lista documentos filtrados por `status`
- [ ] Endpoints acessíveis só por `ADMIN` — 403 pra `CUSTOMER`/`CARRIER`
- [ ] Comportamento de `CarrierProfile.verificationStatus` conforme decisão da Research
- [ ] Swagger documenta os 3 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium — CRUD de aprovação é direto, mas a integração com `CarrierProfile.verificationStatus` precisa de decisão de regra de negócio antes do Plan.
