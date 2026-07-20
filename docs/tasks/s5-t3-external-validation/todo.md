# S5-T3 — Todo

- [x] `ExternalValidationEnvelope` — definido em `carrier-document.repository.ts` (sem `server/types/`, sem convenção existente pra 1 tipo)
- [x] `carrier-document.repository.ts` — `recordExternalValidation`
- [x] `carrier-document.schema.ts` — `ExternalValidationBodySchema`
- [x] `use-cases/carrier-documents/record-external-validation.use-case.ts`
- [x] Registrar em `server/use-cases/index.ts`
- [x] `app/api/admin/carrier-documents/[documentId]/external-validation/route.ts` — POST
- [x] Swagger — estender `lib/swagger/definitions/carrier-documents.ts`
- [x] `docs/insomnia/s5-t3-external-validation.json`
- [x] QA via curl: registrar MATCH com notes, registrar em documento já APPROVED, sobrescrever (MISMATCH), result inválido (400), documento inexistente (404), CUSTOMER/CARRIER (403)
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S5-T2
