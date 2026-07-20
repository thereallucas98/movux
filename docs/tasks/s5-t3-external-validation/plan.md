# S5-T3 — Plan

## `server/types/external-validation.ts` (novo — tipo compartilhado, não é schema Prisma)

```ts
export type ExternalValidationEnvelope = {
  provider: 'MANUAL'
  result: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE'
  notes?: string
  checkedBy: string
  checkedAt: string
}
// Futuro: | { provider: 'BIGDATACORP'; result: ...; raw: unknown; checkedAt: string }
```

## `carrier-document.repository.ts` — método novo

```ts
recordExternalValidation(id: string, envelope: ExternalValidationEnvelope): Promise<void>
// prisma.carrierDocument.update({ where: { id }, data: { externalValidation: envelope } })
```

## `server/schemas/carrier-document.schema.ts` — schema novo

```ts
export const ExternalValidationBodySchema = z.object({
  result: z.enum(['MATCH', 'MISMATCH', 'INCONCLUSIVE']),
  notes: z.string().optional(),
})
```

## `use-cases/carrier-documents/record-external-validation.use-case.ts` (novo)

```ts
export type RecordExternalValidationResult =
  | { success: true }
  | { success: false; code: 'NOT_FOUND' }

export async function recordExternalValidation(repos, adminUserId, documentId, input) {
  const document = await repos.carrierDocumentRepo.findById(documentId)
  if (!document) return { success: false, code: 'NOT_FOUND' }

  await repos.carrierDocumentRepo.recordExternalValidation(documentId, {
    provider: 'MANUAL',
    result: input.result,
    notes: input.notes,
    checkedBy: adminUserId,
    checkedAt: new Date().toISOString(),
  })

  return { success: true }
}
```

## Rota

```
app/api/admin/carrier-documents/[documentId]/external-validation/route.ts   — POST (ADMIN)
```

## Swagger + Insomnia

- Estender `lib/swagger/definitions/carrier-documents.ts` — 1 endpoint novo, mesma tag `Carrier Documents`, documentando o envelope no `description`
- Estender `docs/insomnia/s5-t2-admin-verify.json` → renomear pra incluir o request novo, ou criar `docs/insomnia/s5-t3-external-validation.json` separado (decisão: arquivo separado, mesmo padrão 1-arquivo-por-task usado em todo o projeto)

## Ordem de execução

1. `server/types/external-validation.ts`
2. `carrier-document.repository.ts` — `recordExternalValidation`
3. `ExternalValidationBodySchema`
4. `record-external-validation.use-case.ts`
5. Registrar em `server/use-cases/index.ts`
6. Rota `external-validation/route.ts`
7. Swagger
8. Insomnia
9. QA via curl: registrar MATCH com notes, registrar em documento já APPROVED (S5-T2), sobrescrever registrando de novo (MISMATCH), result inválido (400), documento inexistente (404), CUSTOMER/CARRIER (403)
10. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S5-T2
