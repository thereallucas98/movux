# Admin — Verificação de Documentos (UI) — EXPLORATION

**Date**: 2026-07-20
**Phase**: EXPLORATION
**Status**: COMPLETE

---

## Context

A API REST do fluxo de verificação (fila por status, aprovar, rejeitar, checagem externa manual) foi construída e validada no Sprint 5 (`S5-T1`, `S5-T2`, `S5-T3`), com a regra de auto-completar `CarrierProfile.verificationStatus` já decidida e implementada. Falta só a camada GraphQL (padrão Sprint 8) + a tela do admin, hoje placeholder.

---

## Goals

- Confirmar que toda a regra de negócio necessária já existe nos use-cases de `carrier-documents/`
- Levantar os repos faltando no `GraphQLContext` (mesmo padrão de gap já visto no `S8-T1`/`S8-T2`)
- Confirmar o que falta no repositório pra UI conseguir mostrar "de quem é o documento" (nome/e-mail do carrier)
- Confirmar o nav do admin já está pronto (não precisa de mudança)
- Mapear os componentes do `S8-T1`/`S8-T2` reaproveitáveis sem alteração

---

## Current Architecture

### Backend — já pronto, só falta expor

| Camada | Arquivo | Status |
|---|---|---|
| REST routes | `app/api/admin/carrier-documents/{,[documentId]/{approve,reject,external-validation}}/route.ts` | ✅ prontos, validados (Sprint 5) |
| Use-cases | `approve-carrier-document`, `reject-carrier-document`, `list-carrier-documents-for-admin`, `record-external-validation` (em `use-cases/carrier-documents/`) | ✅ prontos, mesmo formato de union discriminada (exceto a listagem, que retorna a lista direto — sem código de erro possível) |
| Repos | `carrierDocumentRepository` (`findByStatus`, `updateStatus`, `recordExternalValidation`, `findApprovedTypesByCarrier`), `carrierProfileRepository.markVerified` | ✅ prontos |
| Validação | `server/schemas/carrier-document.schema.ts` (`RejectCarrierDocumentSchema`, `ExternalValidationBodySchema`) | ✅ pronto, reaproveitável no client — **exceto** `rejectionReason` sem mensagem humana (gap, ver abaixo) |
| Erros | `server/graphql/errors.ts` `CODE_TO_MESSAGE` | ✅ já mapeia `NOT_FOUND`, `INVALID_STATE_TRANSITION`, `FORBIDDEN` — nenhum código novo a adicionar |
| Regra de negócio (auto-completar verificação) | Decidida na Research do `S5-T2`: aprovar o 5º tipo obrigatório completa `CarrierProfile.verificationStatus → APPROVED` automaticamente; rejeitar não move o perfil (fica `PENDING`, carrier pode reenviar) | ✅ já implementada em `approveCarrierDocument`, nada a redecidir aqui |

### Backend — gaps reais

1. **`GraphQLContext.repos` não tem `carrierProfileRepo` nem `carrierDocumentRepo`** — 3ª ocorrência do mesmo tipo de gap (`S8-T1`: `customerProfileRepo`; `S8-T2`: `proposalQueueRepo`/`proposalRepo`/`notificationLogRepo`/`shipmentEventRepo`). `approveCarrierDocument` também precisa de `userRepo`/`notificationLogRepo` (já estão no context, usados por outros domínios).
2. **`carrierDocumentRepository.findByStatus` não inclui a relação `carrier`** — hoje retorna só `CarrierDocument` puro (`carrierId` como string solta). A UI do admin precisa mostrar nome/e-mail de quem enviou; precisa de `include: { carrier: { select: { fullName, email } } }` no repo. É um `include` puramente aditivo — não quebra o consumo atual da REST route (que só serializa o objeto como JSON; o campo `carrier` novo é ignorado por quem não usa).
3. **`RejectCarrierDocumentSchema.rejectionReason` não tem mensagem customizada** (`z.string().min(1)` sem segundo argumento) — mesma classe de bug já corrigida duas vezes nesta sprint (`S8-T1` mensagens do form de frete, `S8-T2` mensagens do form de proposta). Corrigir agora, direto, evita reintroduzir o mesmo problema pela 3ª vez.

### Modelo Prisma envolvido (contrato exato pro GraphQL type)

```
CarrierDocument: id, carrierId?, companyId?, type (CarrierDocumentType), fileUrl,
  externalValidation? (Json — envelope { provider, result, notes?, checkedBy, checkedAt }),
  status (VerificationStatus), reviewedBy?, reviewedAt?, rejectionReason?, uploadedAt
  + relação carrier (User?) — precisa ser incluída pro admin ver nome/e-mail

enum CarrierDocumentType: CPF | CNH_FRONT | CNH_BACK | ADDRESS_PROOF | SELFIE | CNPJ | SOCIAL_CONTRACT
  (só os 5 primeiros são relevantes aqui — CNPJ/SOCIAL_CONTRACT são de company, fora de escopo)
enum VerificationStatus: PENDING | APPROVED | REJECTED | SUSPENDED
  (documento só transita PENDING → APPROVED|REJECTED; SUSPENDED é só de CarrierProfile, não de documento)
```

### Frontend — nav e padrões já validados (reaproveitáveis sem alteração)

| Peça | Arquivo | Reuso |
|---|---|---|
| Nav do admin | `components/features/nav/nav-items.ts:29-34` | **Já tem** `/admin/dashboard` e `/admin/verifications` configurados — nenhuma mudança de nav necessária |
| Páginas placeholder | `app/admin/{dashboard,verifications}/page.tsx` | Existem, vazias — role já gated pelo `middleware.ts` (`/admin` → `ADMIN`) |
| Layout | `app/admin/layout.tsx` | `requireMe()` + `AppShell` — igual customer/carrier, nada a mudar |
| Client GraphQL / codegen / hooks (padrão) | `lib/graphql-client.ts`, `codegen.ts`, `graphql/hooks/use-join-queue.ts` (modelo de mutation) | Mesmo padrão do `S8-T2` |
| Lista responsiva + badge de status (padrão) | `shipments-list.tsx`, `shipment-status-badge.tsx`, `queue-status-badge.tsx` | Modelo direto pra fila de documentos e badge de `VerificationStatus` |
| Dialog de confirmação/formulário (padrão) | `withdraw-confirm-dialog.tsx` (confirmação), `proposal-form-dialog.tsx` (formulário com Zod) | Modelo pro dialog de rejeição (motivo obrigatório) e de checagem externa (result + notes) |

---

## Blockers

✅ Nenhum blocker — os 3 gaps (repos no context, `include` novo no repo, mensagem de erro) têm solução direta e viram sub-steps do Plan.

**Limitação de QA conhecida** (já registrada no brief): sem upload real (Supabase não configurado, tela de upload fora de escopo desta task), o QA em navegador depende de `CarrierDocument` inserido via SQL direto — mesmo padrão usado pra publicar um shipment `OPEN` no `S8-T2`.

---

## Next Steps

1. Research: confirmar o desenho exato do GraphQL type (`carrierName`/`carrierEmail` como campos flat vs. objeto `carrier` aninhado) e da mutation de checagem externa (retorno)
2. Plan + Todo: sub-steps ordenados (context.ts → repo include → enums → types → query/mutations → codegen → hooks → UI)
3. Execution
