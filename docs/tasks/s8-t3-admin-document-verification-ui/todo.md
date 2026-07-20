# TODO: S8-T3 — Admin: Verificação de Documentos

**Date**: 2026-07-20
**Phase**: EXECUTION
**Status**: COMPLETE

---

## Implementation Checklist

### Step 1: Contexto GraphQL (bloqueador)

- [x] **1.1** `server/graphql/context.ts` — adicionar `carrierProfileRepo`, `carrierDocumentRepo` à interface `GraphQLContext.repos`
- [x] **1.2** `server/graphql/context.ts` — wireá-los em `createGraphQLContext`

### Step 2: Repo e schema

- [x] **2.1** `server/repositories/carrier-document.repository.ts` — `findByStatus` inclui relação `carrier` (`fullName`, `email`); export `CarrierDocumentWithCarrier`
- [x] **2.2** `server/schemas/carrier-document.schema.ts` — mensagem humana em `RejectCarrierDocumentSchema.rejectionReason` e `ExternalValidationBodySchema.result`

### Step 3: Enums Pothos

- [x] **3.1** `server/graphql/enums/carrier-document.enum.ts` (novo) — `CarrierDocumentTypeEnum`, `VerificationStatusEnum`, `ExternalValidationResultEnum`

### Step 4: Types Pothos

- [x] **4.1** `server/graphql/types/carrier-document.type.ts` (novo) — `ExternalValidationType`, `CarrierDocumentType`, `CarrierDocumentConnectionType`, `toGraphQLCarrierDocument`

### Step 5: Query

- [x] **5.1** `server/graphql/queries/carrier-documents.query.ts` (novo) — `carrierDocuments`

### Step 6: Mutations

- [x] **6.1** `server/graphql/mutations/carrier-documents.mutation.ts` (novo) — `ExternalValidationInput`, `approveCarrierDocument`, `rejectCarrierDocument`, `recordExternalValidation`

### Step 7: Wiring e checkpoint de schema

- [x] **7.1** `server/graphql/schema.ts` — imports do enum, type, query, mutation novos
- [x] **7.2** `pnpm lint`/`pnpm typecheck` escopo isolado — limpo
- [x] **7.3** `pnpm codegen` — schema exporta sem erro

### Step 8: Operações GraphQL do client + codegen

- [x] **8.1** `graphql/operations/carrier-documents/carrier-documents.graphql`
- [x] **8.2** `graphql/operations/carrier-documents/{approve-carrier-document,reject-carrier-document,record-external-validation}.graphql`
- [x] **8.3** `pnpm codegen` — gera tipos/documentos sem erro

### Step 9: Hooks React Query

- [x] **9.1** `graphql/hooks/use-carrier-documents.ts`
- [x] **9.2** `graphql/hooks/use-approve-document.ts` (+ `ERROR_MESSAGES` PT-BR)
- [x] **9.3** `graphql/hooks/use-reject-document.ts` (+ `ERROR_MESSAGES` PT-BR)
- [x] **9.4** `graphql/hooks/use-record-external-validation.ts` (+ `ERROR_MESSAGES` PT-BR)

### Step 10: Componentes

- [x] **10.1** `components/features/admin/document-status-badge.tsx`
- [x] **10.2** `components/features/admin/document-card.tsx`
- [x] **10.3** `components/features/admin/reject-document-dialog.tsx`
- [x] **10.4** `components/features/admin/external-validation-dialog.tsx`

### Step 11: Páginas

- [x] **11.1** `app/admin/verifications/page.tsx` — filtro por status + lista de cards
- [x] **11.2** `app/admin/dashboard/page.tsx` — atalho + resumo

### Step 12: Validation

- [x] **12.1** Seed de teste via SQL (`INSERT INTO "carrierDocument"`) — 3 documentos `PENDING` de um carrier real
- [x] **12.2** `pnpm lint` escopo isolado desta task — limpo
- [x] **12.3** `pnpm typecheck` escopo isolado desta task — limpo
- [x] **12.4** QA manual no navegador (roteiro no chat, Fase 5)
- [x] **12.5** `validation.md` registrado após aprovação do QA

## Não previsto no plan original (necessário durante a Execution)

- [x] `components/features/admin/carrier-document-labels.ts` (novo) — labels de tipo de documento + resultado de checagem externa
- [x] `components/features/admin/document-list.tsx` (novo, não estava no plan como arquivo separado) — encapsula filtro de status + fetch, reaproveitado por `/admin/verifications` e `/admin/dashboard`
- [x] Mensagem humana em `ExternalValidationBodySchema.result` (não previsto no plan original, adicionado proativamente antes do QA)
- [x] Fix de tipo em `external-validation-dialog.tsx` — `z.input` em vez de interface manual (mismatch entre `zodResolver` e tipo declarado à mão para schema único, diferente do padrão de união usado no S8-T2)

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1–1.2 | ✅ | |
| 2.1–2.2 | ✅ | |
| 3.1 | ✅ | |
| 4.1 | ✅ | |
| 5.1 | ✅ | |
| 6.1 | ✅ | |
| 7.1–7.3 | ✅ | |
| 8.1–8.3 | ✅ | |
| 9.1–9.4 | ✅ | |
| 10.1–10.4 | ✅ | |
| 11.1–11.2 | ✅ | |
| 12.1–12.5 | ✅ | |
