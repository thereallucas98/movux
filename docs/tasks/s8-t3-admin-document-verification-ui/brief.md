# Task Brief: Admin — Verificação de Documentos (UI)

**Created**: 2026-07-20
**Status**: Approved
**Complexity**: Medium
**Type**: New Feature
**Estimated Effort**: 4-6 hours

---

## Feature Overview

### User Story
Como admin, quero ver a fila de documentos de carrier pendentes de revisão, aprovar ou rejeitar cada um (com motivo), e registrar o resultado de uma checagem externa manual de CPF/CNH, para liberar (ou não) o cadastro do carrier na plataforma.

### Problem Statement
A API REST do fluxo de verificação está pronta desde o Sprint 5 (`S5-T1` upload, `S5-T2` aprovar/rejeitar + auto-completar `CarrierProfile.verificationStatus`, `S5-T3` checagem externa manual), mas não tem UI nem exposição via GraphQL. A rota `/admin/verifications` existe só como placeholder ("Em breve.").

### Scope

**In Scope:**
- GraphQL: `pendingDocuments` (query, filtro por `status`, paginado) — espelha `S5-T2` (`GET /admin/carrier-documents`)
- GraphQL: `approveCarrierDocument` / `rejectCarrierDocument` (mutations) — espelha `S5-T2`
- GraphQL: `recordExternalValidation` (mutation) — espelha `S5-T3`
- UI `/admin/verifications` — fila de documentos por status, com nome/e-mail do carrier, tipo do documento, link pro arquivo, ações de aprovar/rejeitar (com motivo) e registrar checagem externa (manual: `MATCH`/`MISMATCH`/`INCONCLUSIVE` + observação)
- UI `/admin/dashboard` — atalho + resumo (documentos pendentes recentes)

**Out of Scope:**
- Upload de documento pelo carrier (`/carrier/documents`, `S5-T1`) — decisão em chat: Supabase ainda não tem credenciais configuradas (upload real falharia), e não é o objetivo desta task (que é "Admin", per `ROADMAP.md`). Dados de teste pro QA entram via SQL direto, mesmo padrão usado no `S8-T2` pra publicar um shipment sem tela de "publicar"
- Documentos de company (`CNPJ`, `SOCIAL_CONTRACT`) — fora de escopo desde o `S5-T1` (sem CRUD de `Company` no projeto)
- Integração paga de verdade (BigDataCorp/Serpro) — a checagem externa continua 100% manual (`provider: 'MANUAL'`), estrutura já pronta pra automação futura sem mudar o contrato
- Notificar o carrier — já acontece no backend (e-mail via `sendEmailNotification`, Sprint 6), nada de UI extra aqui
- Suspender/reativar carrier manualmente (`verificationStatus = SUSPENDED`) — ação administrativa separada, não pedida

---

## Current State

**Key Files:**
- `apps/web/src/app/api/admin/carrier-documents/{,[documentId]/{approve,reject,external-validation}}/route.ts` — REST completo, validado (`S5-T2`, `S5-T3`)
- `apps/web/src/server/use-cases/carrier-documents/{approve,reject,list-carrier-documents-for-admin,record-external-validation}-carrier-document.use-case.ts` — prontos, reaproveitáveis
- `apps/web/src/server/repositories/carrier-document.repository.ts` — pronto (`findByStatus`, `updateStatus`, `recordExternalValidation`, `findApprovedTypesByCarrier`)
- `apps/web/src/server/repositories/carrier-profile.repository.ts` — `markVerified` pronto (auto-completa `verificationStatus` quando os 5 tipos obrigatórios estão `APPROVED` — decisão já resolvida na Research do `S5-T2`)
- `apps/web/src/server/graphql/queries/shipments.query.ts` (e demais domínios) — nenhuma query/mutation do domínio `carrierDocument`/`admin` ainda existe
- `apps/web/src/app/admin/{dashboard,verifications}/page.tsx` — placeholders, sem lógica

**Current Behavior:**
API funciona ponta a ponta via Insomnia/Swagger (validado no Sprint 5). Nenhuma tela do admin renderiza dado real. Sem nenhum `CarrierDocument` real no banco hoje (upload nunca foi exercitado pela UI nem pelo Supabase configurado).

**Gaps/Issues:**
- `GraphQLContext.repos` não tem `carrierProfileRepo` nem `carrierDocumentRepo` — mesmo tipo de gap já visto no `S8-T1` e `S8-T2` (repo faltando no context)
- `carrierDocumentRepository.findByStatus` não inclui a relação `carrier` (nome/e-mail) — necessário pro admin identificar de quem é o documento na fila; precisa de um `include` novo
- `RejectCarrierDocumentSchema.rejectionReason` não tem mensagem humana customizada (`z.string().min(1)` sem segundo argumento) — mesma classe de problema já corrigida no `S8-T1`/`S8-T2`, mas essa ainda não tinha sido tocada
- Faltam enums Pothos para `CarrierDocumentType`/`VerificationStatus`
- Faltam GraphQL types pro documento (com carrier embutido) e pro envelope de `externalValidation`
- Faltam a query + 3 mutations GraphQL
- Faltam os hooks React Query + operations `.graphql`
- Faltam os componentes de UI e a lógica das 2 páginas placeholder

---

## Requirements

### Functional Requirements

**FR1: Ver fila de documentos por status**
- **Description**: Admin vê lista de `CarrierDocument`, com filtro por status (`PENDING` por padrão)
- **Trigger**: Acessa `/admin/verifications`
- **Expected Outcome**: Cards/linhas com nome do carrier, tipo do documento, link pro arquivo (`fileUrl`), status, data de envio
- **Edge Cases**: Lista vazia → empty state

**FR2: Aprovar documento**
- **Description**: Ação "Aprovar" num documento `PENDING`
- **Trigger**: Botão na fila
- **Expected Outcome**: `approveCarrierDocument` muda status pra `APPROVED`; se completar os 5 tipos obrigatórios do carrier, `CarrierProfile.verificationStatus` vira `APPROVED` automaticamente (já é regra do backend, UI só reflete)
- **Edge Cases**: Documento já revisado (409 `INVALID_STATE_TRANSITION`) — ação não deveria estar disponível pela UI nesse estado

**FR3: Rejeitar documento**
- **Description**: Ação "Rejeitar" exige motivo
- **Trigger**: Botão na fila, abre formulário com campo de motivo obrigatório
- **Expected Outcome**: `rejectCarrierDocument` muda status pra `REJECTED`, grava `rejectionReason`
- **Edge Cases**: Motivo vazio → erro de validação em PT-BR humano

**FR4: Registrar checagem externa manual**
- **Description**: Admin registra o resultado de uma conferência manual de CPF/CNH (`MATCH`/`MISMATCH`/`INCONCLUSIVE` + observação opcional)
- **Trigger**: Ação disponível em qualquer documento, independente do status (`PENDING`, `APPROVED` ou `REJECTED`)
- **Expected Outcome**: `recordExternalValidation` grava o envelope (`provider: 'MANUAL'`, `result`, `notes`, `checkedBy`, `checkedAt`); sobrescreve registro anterior se já existia
- **Edge Cases**: Nenhuma — sempre permitido, não é uma transição de estado

---

## Technical Approach

**Chosen Approach:**
Mesmo padrão do `S8-T1`/`S8-T2`: camada Pothos (enums → types → query/mutations) por cima dos use-cases já existentes, `graphql-request` + codegen + hooks React Query no client.

**Alternatives Considered:**
1. **Incluir a tela de upload do carrier nesta task** — descartado em chat: Supabase sem credenciais (upload real falharia), e foge do escopo "Admin" descrito no `ROADMAP.md`

**Rationale:**
Use-cases já recebem repos como parâmetro e retornam union discriminada (exceto `listCarrierDocumentsForAdmin`, que retorna a lista direto — sem código de erro possível, mesmo formato de `browseOpenShipments`) — encaixam direto no resolver GraphQL do mesmo jeito que os domínios anteriores já fazem.

---

## Files to Change

### New Files
- `apps/web/src/server/graphql/enums/carrier-document.enum.ts` — `CarrierDocumentTypeEnum`, `VerificationStatusEnum`, `ExternalValidationResultEnum`
- `apps/web/src/server/graphql/types/carrier-document.type.ts` — `CarrierDocumentType` (com `carrierName`/`carrierEmail` embutidos), `ExternalValidationType`
- `apps/web/src/server/graphql/queries/carrier-documents.query.ts` — `pendingDocuments`
- `apps/web/src/server/graphql/mutations/carrier-documents.mutation.ts` — `approveCarrierDocument`, `rejectCarrierDocument`, `recordExternalValidation`
- `apps/web/graphql/operations/carrier-documents/*.graphql` (4 arquivos)
- `apps/web/src/graphql/hooks/use-{pending-documents,approve-document,reject-document,record-external-validation}.ts`
- `apps/web/src/components/features/admin/*` — badge de status, card/linha de documento, formulário de rejeição, formulário de checagem externa
- `apps/web/src/server/repositories/carrier-document.repository.ts` — `findByStatus` passa a incluir a relação `carrier` (nome/e-mail)

### Modified Files
- `apps/web/src/server/graphql/context.ts` — adicionar `carrierProfileRepo`/`carrierDocumentRepo` ao `GraphQLContext.repos`
- `apps/web/src/server/graphql/schema.ts` — wiring dos novos enums/types/query/mutations
- `apps/web/src/server/schemas/carrier-document.schema.ts` — mensagem humana em `RejectCarrierDocumentSchema.rejectionReason`
- `apps/web/src/app/admin/dashboard/page.tsx` — atalho + resumo
- `apps/web/src/app/admin/verifications/page.tsx` — fila + ações

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/admin/verifications` lista documentos reais, com nome do carrier e filtro por status
- [ ] **AC2**: Admin consegue aprovar um documento `PENDING`
- [ ] **AC3**: Admin consegue rejeitar um documento `PENDING` com motivo obrigatório
- [ ] **AC4**: Admin consegue registrar uma checagem externa manual em qualquer documento
- [ ] **AC5**: Erros de negócio (409 de estado inválido, 400 de motivo vazio) aparecem como toast em português
- [ ] **AC6**: `pnpm lint`/`pnpm typecheck` passam no escopo isolado dos arquivos desta task

### Should Have (P1)
- [ ] **AC7**: `/admin/dashboard` mostra atalho + resumo de documentos pendentes
- [ ] **AC8**: Responsivo confirmado em 375px e desktop

---

## Test Strategy

**GraphQL (para cada query/mutation)**:
- Happy path com dado válido
- Não autenticado → `UNAUTHENTICATED`
- Role errada (`CUSTOMER`/`CARRIER` chamando mutation de admin) → `FORBIDDEN`
- Estado inválido (aprovar/rejeitar documento já revisado) → `INVALID_STATE_TRANSITION`, mensagem PT-BR

**UI (para cada componente)**:
- Renderiza com dado real (seed via SQL)
- Estado vazio
- Estado de loading
- Ação disparando mutation → refetch + toast

---

## Dependencies

**Blocks:** None
**Blocked By:** None (API/use-cases já existem)
**Related Work:** `S8-T1`/`S8-T2` (padrões de UI/GraphQL reaproveitados), `S5-T1`/`S5-T2`/`S5-T3` (API REST original)
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Sem carrier real com documento pra testar (upload fora de escopo) | Alta | Baixo | Seed de teste via SQL direto (`INSERT INTO "carrierDocument"`), mesmo padrão usado pra publicar shipment no `S8-T2` |
| `context.ts` sem os repos de carrier document/profile (mesmo bug recorrente) | Baixa | Alto | Checar `GraphQLContext.repos` antes de escrever os resolvers |

---

## Complexity Estimate

**Overall**: Medium
- Backend: Simple (só exposição GraphQL + 1 `include` novo no repo)
- Frontend: Medium (1 tela principal, 3 ações, sem estados cruzados complexos como o S8-T2)

**Estimated Effort**: 4-6 hours
**Confidence**: Medium (limitação de QA conhecida: sem upload real, sem dado de produção pra validar volume)

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-20

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Escopo "Good" escolhido em chat — aprovar/rejeitar (`S5-T2`) + checagem externa manual (`S5-T3`) no mesmo painel do documento, sem tela de upload do carrier (Supabase não configurado, fora do escopo "Admin" do `ROADMAP.md`).

---

## References

- **Design**: Segue o mesmo design system do `S8-T1`/`S8-T2` (`docs/DESIGN-SYSTEM.md`)
- **Related Issues**: `docs/tasks/s5-t1-document-upload/`, `docs/tasks/s5-t2-admin-verify/`, `docs/tasks/s5-t3-external-validation/`
