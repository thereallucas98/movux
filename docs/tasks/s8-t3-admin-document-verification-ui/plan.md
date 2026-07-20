# S8-T3 — Plan

## 1. Fix do gap de contexto GraphQL

`server/graphql/context.ts` — adicionar ao `GraphQLContext.repos`: `carrierProfileRepo: typeof carrierProfileRepository`, `carrierDocumentRepo: typeof carrierDocumentRepository`, importando de `~/server/repositories`. **Primeiro sub-step**, mesmo padrão do `S8-T1`/`S8-T2`.

## 2. Repo — incluir relação `carrier`

`server/repositories/carrier-document.repository.ts` — `findByStatus` passa a fazer:
```ts
async findByStatus(filter) {
  const limit = filter.limit ?? 20
  const data = await prisma.carrierDocument.findMany({
    where: filter.status ? { status: filter.status } : {},
    orderBy: [{ uploadedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    include: { carrier: { select: { fullName: true, email: true } } },
  })
  // hasMore/nextCursor igual já está
}
```
Tipo de retorno da interface (`CarrierDocumentRepository.findByStatus`) muda de `CarrierDocument[]` pra `(CarrierDocument & { carrier: { fullName: string; email: string } | null })[]` — export um alias `CarrierDocumentWithCarrier` pro use-case/resolver reaproveitarem.

## 3. Fix de mensagem humana

`server/schemas/carrier-document.schema.ts`:
```ts
export const RejectCarrierDocumentSchema = z.object({
  rejectionReason: z.string().min(1, 'Informe o motivo da rejeição'),
})
```

## 4. Enums Pothos — `server/graphql/enums/carrier-document.enum.ts` (novo)

```ts
export const CarrierDocumentTypeEnum = builder.enumType('CarrierDocumentType', {
  values: ['CPF', 'CNH_FRONT', 'CNH_BACK', 'ADDRESS_PROOF', 'SELFIE', 'CNPJ', 'SOCIAL_CONTRACT'] as const,
})
export const VerificationStatusEnum = builder.enumType('VerificationStatus', {
  values: ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const,
})
export const ExternalValidationResultEnum = builder.enumType('ExternalValidationResult', {
  values: ['MATCH', 'MISMATCH', 'INCONCLUSIVE'] as const,
})
```

## 5. Types — `server/graphql/types/carrier-document.type.ts` (novo)

```ts
export const ExternalValidationType = builder.simpleObject('ExternalValidation', {
  fields: (t) => ({
    provider: t.string(),
    result: t.field({ type: ExternalValidationResultEnum }),
    notes: t.string({ nullable: true }),
    checkedBy: t.id(),
    checkedAt: t.field({ type: 'DateTime' }),
  }),
})

export const CarrierDocumentType = builder.simpleObject('CarrierDocument', {
  fields: (t) => ({
    id: t.id(),
    type: t.field({ type: CarrierDocumentTypeEnum }),
    fileUrl: t.string(),
    status: t.field({ type: VerificationStatusEnum }),
    rejectionReason: t.string({ nullable: true }),
    uploadedAt: t.field({ type: 'DateTime' }),
    reviewedAt: t.field({ type: 'DateTime', nullable: true }),
    carrierName: t.string({ nullable: true }),
    carrierEmail: t.string({ nullable: true }),
    externalValidation: t.field({ type: ExternalValidationType, nullable: true }),
  }),
})

export const CarrierDocumentConnectionType = builder.simpleObject('CarrierDocumentConnection', {
  fields: (t) => ({
    data: t.field({ type: [CarrierDocumentType] }),
    nextCursor: t.id({ nullable: true }),
  }),
})

// achata carrier.fullName/email + normaliza externalValidation (Json → shape tipado)
export function toGraphQLCarrierDocument(doc: CarrierDocumentWithCarrier) {
  return {
    ...doc,
    carrierName: doc.carrier?.fullName ?? null,
    carrierEmail: doc.carrier?.email ?? null,
    externalValidation: doc.externalValidation as ExternalValidationEnvelope | null,
  }
}
```

## 6. Query — `server/graphql/queries/carrier-documents.query.ts` (novo)

```ts
builder.queryField('carrierDocuments', (t) =>
  t.field({
    type: CarrierDocumentConnectionType,
    args: { status: t.arg({ type: VerificationStatusEnum }), cursor: t.arg.id(), limit: t.arg.int() },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')
      const result = await listCarrierDocumentsForAdmin(
        { carrierDocumentRepo: ctx.repos.carrierDocumentRepo },
        { status: args.status ?? undefined, cursor: args.cursor ? String(args.cursor) : undefined, limit: args.limit ?? undefined },
      )
      return { data: result.data.map(toGraphQLCarrierDocument), nextCursor: result.nextCursor }
    },
  }),
)
```

## 7. Mutations — `server/graphql/mutations/carrier-documents.mutation.ts` (novo)

```ts
const ExternalValidationInput = builder.inputType('ExternalValidationInput', {
  fields: (t) => ({ result: t.field({ type: ExternalValidationResultEnum, required: true }), notes: t.string() }),
})
```
- `approveCarrierDocument(documentId!): Boolean` — chama `approveCarrierDocument` use-case (repos: `carrierDocumentRepo`, `carrierProfileRepo`, `userRepo`, `notificationLogRepo`); erro via `gqlErrorFromResult`
- `rejectCarrierDocument(documentId!, rejectionReason!): Boolean` — chama `rejectCarrierDocument` use-case (repos: `carrierDocumentRepo`, `userRepo`, `notificationLogRepo`)
- `recordExternalValidation(documentId!, input!): Boolean` — chama `recordExternalValidation` use-case (repos: `carrierDocumentRepo`)

Mesmo guard `UNAUTHENTICATED`/`FORBIDDEN` (`role !== 'ADMIN'`) em todos os três.

## 8. Wiring — `server/graphql/schema.ts`

Adicionar 1 import de enum, 1 de type, 1 de query, 1 de mutation (arquivos únicos, diferente do S8-T2 que teve 3 cada) na ordem já usada.

## 9. Client — operações `.graphql`

`src/graphql/operations/carrier-documents/` (nova pasta): `carrier-documents.graphql` (query), `approve-carrier-document.graphql`, `reject-carrier-document.graphql`, `record-external-validation.graphql` (mutations).

## 10. Client — hooks React Query

`src/graphql/hooks/`:
- `use-carrier-documents.ts` — `useQuery`, `queryKey: ['carrier-documents', filter]`
- `use-approve-document.ts`, `use-reject-document.ts`, `use-record-external-validation.ts` — `useMutation` (padrão `use-withdraw-queue.ts`: `ERROR_MESSAGES` PT-BR + `getGraphQLErrorCode`), cada um invalidando `['carrier-documents']` no `onSuccess`

`ERROR_MESSAGES` a cobrir: `INVALID_STATE_TRANSITION`, `NOT_FOUND`.

## 11. Client — componentes

`src/components/features/admin/` (nova pasta):
- `document-status-badge.tsx` — mesmo padrão de `queue-status-badge.tsx`, `Record<VerificationStatus, {label, variant}>`
- `document-card.tsx` — card com nome/e-mail do carrier, tipo do documento, link `fileUrl` (`target="_blank"`), badge de status, badge de checagem externa se existir, e as 3 ações (aprovar / rejeitar / registrar checagem) — lógica de "qual botão mostra" inline (`status === 'PENDING'` habilita aprovar/rejeitar; checagem externa sempre disponível), decisão da Research
- `reject-document-dialog.tsx` — `AdaptiveDialog` com campo de motivo (`zodResolver(RejectCarrierDocumentSchema)`)
- `external-validation-dialog.tsx` — `AdaptiveDialog` com `AdaptiveSelect` de resultado (`MATCH`/`MISMATCH`/`INCONCLUSIVE`) + `Textarea` de observação (`zodResolver(ExternalValidationBodySchema)`)

## 12. Páginas

`app/admin/verifications/page.tsx` — filtro por status (`AdaptiveSelect`, default `PENDING`) + lista de `document-card.tsx`; `EmptyState` quando vazio

`app/admin/dashboard/page.tsx` — atalho "Ver verificações" + resumo (3 primeiros documentos `PENDING`, reaproveitando a lista com `limit`)

## Ordem de execução (sub-steps)

1. `context.ts` (bloqueia tudo)
2. Repo (`include` em `findByStatus`) + fix de mensagem no schema Zod
3. Enums → Types → Query → Mutations → wiring `schema.ts`
4. `pnpm codegen` roda limpo (checkpoint intermediário)
5. Operações `.graphql` + `pnpm codegen` de novo
6. Hooks React Query
7. Componentes
8. Páginas
9. Seed de teste via SQL (`INSERT INTO "carrierDocument"`, mesmo padrão do `S8-T2` pra publicar shipment) + lint/typecheck escopo isolado + QA manual no navegador
