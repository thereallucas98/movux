# S5-T1 — Todo

- [x] `server/repositories/carrier-document.repository.ts` (novo)
- [x] `server/schemas/carrier-document.schema.ts` (novo)
- [x] `use-cases/carrier-documents/upload-carrier-document.use-case.ts`
- [x] `use-cases/carrier-documents/list-carrier-documents.use-case.ts`
- [x] Registrar `carrierDocumentRepository` em `server/repositories/index.ts`
- [x] Registrar use-cases em `server/use-cases/index.ts`
- [x] `app/api/me/documents/route.ts` — POST (multipart) + GET
- [x] Swagger — `lib/swagger/definitions/carrier-documents.ts` (tag `Carrier Documents`)
- [x] `docs/insomnia/s5-t1-document-upload.json`
- [x] QA via curl: type inválido (400), arquivo grande (400), MIME não permitido (400), não-CARRIER (403), upload válido → ATTACHMENT_UPLOAD_FAILED esperado (Supabase não configurado), GET retorna []
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S4-T3
