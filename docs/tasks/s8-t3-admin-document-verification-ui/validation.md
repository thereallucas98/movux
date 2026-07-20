# Validation: S8-T3 — Admin: Verificação de Documentos (UI)

**Date**: 2026-07-20
**Status**: Complete

---

## Acceptance Criteria

| ID | Criterion | Verification Method | Result |
|----|-----------|---------------------|--------|
| AC1 | `/admin/verifications` lista documentos reais, com nome do carrier e filtro por status | Manual (navegador) | ✅ |
| AC2 | Admin consegue aprovar um documento `PENDING` | Manual (navegador) | ✅ |
| AC3 | Admin consegue rejeitar um documento `PENDING` com motivo obrigatório | Manual (navegador) | ✅ |
| AC4 | Admin consegue registrar uma checagem externa manual em qualquer documento | Manual (navegador) | ✅ |
| AC5 | Erros de negócio aparecem como toast em português | Manual (navegador) — nenhum erro real disparado no QA (todas as ações estavam em estado válido); mensagens PT-BR confirmadas nos hooks/schemas | ✅ |
| AC6 | `pnpm lint`/`pnpm typecheck` passam no escopo isolado desta task | Comando | ✅ |
| AC7 | `/admin/dashboard` mostra atalho + resumo de documentos pendentes | Manual (navegador) | ✅ |
| AC8 | Responsivo confirmado em 375px e desktop | Manual (navegador) | ✅ |

---

## QA Checklist

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Seed de teste via SQL (3 documentos `PENDING` de um carrier real) | Insert direto em `carrierDocument`, sem upload real (Supabase não configurado, decisão de escopo) | ✅ |
| 2 | Login como `ADMIN` | Conta promovida via SQL (registro público só oferece Cliente/Transportador); login gera JWT novo com role `ADMIN` | ✅ |
| 3 | `/admin/dashboard` | Atalho "Ver verificações" + resumo de 3 documentos pendentes, com nome/e-mail do carrier | ✅ |
| 4 | Aprovar documento (`approveCarrierDocument`) | Toast "Documento aprovado"; card some da lista `PENDING`, lista refeita automaticamente | ✅ |
| 5 | Rejeitar documento (`rejectCarrierDocument`) | Dialog pede motivo obrigatório (mensagem PT-BR humana desde o início); toast "Documento rejeitado"; card mostra "Motivo: ..." no filtro `Rejeitados` | ✅ |
| 6 | Registrar checagem externa (`recordExternalValidation`) | Dialog com `AdaptiveSelect` (Confere/Não confere/Inconclusivo) + observação opcional; toast "Checagem registrada"; card passa a mostrar "Checagem externa: Confere — ..."; documento continua `PENDING` (não é transição de estado) | ✅ |
| 7 | `/admin/verifications` — filtro "Pendentes" | Lista sem `limit`, mesmos 2 documentos restantes | ✅ |
| 8 | `/admin/verifications` — filtro "Aprovados" | Lista documentos aprovados nesta sessão + dados reais de sprints anteriores (`Carrier S5T2`, `S5T3`, `S6T1`); sem botões Aprovar/Rejeitar (só `PENDING` os mostra); "Checagem externa" sempre disponível | ✅ |
| 9 | `/admin/verifications` — filtro "Rejeitados" | Idem, com motivo de rejeição visível em cada card, incluindo dado histórico real | ✅ |
| 10 | Responsivo 375px (mobile) | Cards empilhados, tab bar inferior, sem scroll horizontal | ✅ |
| 11 | Console do navegador | Sem erros do app | ✅ |

## Desvios encontrados durante a execução

1. **Gap real descoberto na Exploration**: `carrierDocumentRepository.findByStatus` não incluía a relação `carrier` — a UI do admin não teria como mostrar de quem é o documento. Resolvido com um `include` aditivo (não quebra a REST route existente, só adiciona um campo `carrier` a mais na resposta), decidido diretamente na Research sem precisar de aprovação em chat (decisão de API, não de escopo/produto).
2. **`GraphQLContext.repos` não tinha `carrierProfileRepo`/`carrierDocumentRepo`** — 3ª ocorrência do mesmo gap já visto no `S8-T1` e `S8-T2`. Corrigido em `context.ts`.
3. **Mensagens humanas adicionadas proativamente desta vez**: `RejectCarrierDocumentSchema.rejectionReason` e `ExternalValidationBodySchema.result` não tinham mensagem customizada — corrigido ANTES do QA (aprendizado das duas rodadas anteriores desta sprint), evitando reintroduzir a mesma classe de bug pela 3ª vez.
4. **Bug de tipo real encontrado no typecheck (não no QA visual)**: `external-validation-dialog.tsx` — `useForm` com tipo declarado à mão (`result: ExternalValidationResult | undefined`) não bate com o tipo inferido pelo `zodResolver` de um schema único (diferente do `proposal-form-dialog.tsx` do S8-T2, que usa uma união de dois schemas e por isso tolera o mesmo padrão). Corrigido usando `z.input<typeof ExternalValidationBodySchema>` diretamente como tipo do form, com o valor inicial de `result` via cast (`undefined as unknown as ...`) — padrão comum para campos obrigatórios que nascem vazios em formulários RHF+Zod.
5. **Sem UI de upload do carrier** — decisão de escopo em chat (Supabase não configurado; fora do "Admin" do `ROADMAP.md`). Dado de teste entrou via SQL direto, mesmo padrão usado no `S8-T2` pra publicar um shipment `OPEN`.
6. **Conta `ADMIN` sem via de autoatendimento** — registro público só oferece Cliente/Transportador. Resolvido registrando uma conta comum e promovendo via SQL (`UPDATE "user" SET role = 'ADMIN'`), com logout/login pra emitir um JWT novo refletindo o role atualizado (o cookie antigo continha o role antigo, mesmo com o banco já atualizado).

Nenhum desvio de arquitetura da Research original (Pothos sobre use-cases já existentes, mutations retornando `Boolean`, campos flat de carrier no type).

---

## Quality Gates

| Check | Result | Notes |
|-------|--------|-------|
| `pnpm lint` (escopo S8-T3, arquivo por arquivo) | ✅ | 0 erros/warnings |
| `pnpm typecheck` (escopo S8-T3) | ✅ | 0 erros |
| `pnpm lint` / `pnpm typecheck` (projeto inteiro) | ❌ não passam | Mesmo débito pré-existente da migração Turnora→Movux já documentado no `S8-T1`/`S8-T2` — confirmado via `git diff` que nenhum arquivo desse débito foi tocado nesta task |
| `pnpm codegen` | ✅ | Schema exporta e gera tipos sem erro |
| Console do navegador | ✅ | Sem erros do app |

---

## Files Modified

```
Modified:
  apps/web/src/app/admin/dashboard/page.tsx
  apps/web/src/app/admin/verifications/page.tsx
  apps/web/src/server/graphql/context.ts
  apps/web/src/server/graphql/schema.ts
  apps/web/src/server/repositories/carrier-document.repository.ts
  apps/web/src/server/schemas/carrier-document.schema.ts
  apps/web/src/server/use-cases/carrier-documents/list-carrier-documents-for-admin.use-case.ts
  docs/ROADMAP.md

New:
  apps/web/src/components/features/admin/*.ts(x) (6 arquivos)
  apps/web/src/graphql/hooks/use-{carrier-documents,approve-document,reject-document,record-external-validation}.ts
  apps/web/src/graphql/operations/carrier-documents/*.graphql (4 arquivos)
  apps/web/src/server/graphql/enums/carrier-document.enum.ts
  apps/web/src/server/graphql/mutations/carrier-documents.mutation.ts
  apps/web/src/server/graphql/queries/carrier-documents.query.ts
  apps/web/src/server/graphql/types/carrier-document.type.ts
  docs/tasks/s8-t3-admin-document-verification-ui/{brief,exploration,research,plan,todo,validation}.md
```

---

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm lint`/`pnpm build` (projeto inteiro) | Mesmo débito pré-existente documentado no `S8-T1`/`S8-T2` — não relacionado a esta task |
| UI de upload do carrier (`/carrier/documents`, `S5-T1`) | Fora de escopo — Supabase sem credenciais configuradas; fica pra quando as credenciais existirem |
| Auto-completar `CarrierProfile.verificationStatus` | Regra já implementada e testada no `S5-T2` (backend) — não re-testada nesta rodada por falta de um carrier de teste com os 5 tipos obrigatórios aprovados; comportamento herdado, não é código novo desta task |
| Breakpoints 720px/1024px/1440px | Só 375px e desktop (1280px) testados visualmente, mesmo padrão do `S8-T1`/`S8-T2` |

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Developer (Claude) | Claude | 2026-07-20 | ✅ |
| Reviewer (Human) | David Lucas | 2026-07-20 | ✅ |
