# S5-T2 — Todo

- [x] `carrier-document.repository.ts` — `findById`, `updateStatus`, `findApprovedTypesByCarrier`, `findByStatus`
- [x] `carrier-profile.repository.ts` — `markVerified`
- [x] `carrier-document.schema.ts` — `CarrierDocumentIdParamSchema`, `RejectCarrierDocumentSchema`, `ListCarrierDocumentsQuerySchema`
- [x] `use-cases/carrier-documents/approve-carrier-document.use-case.ts`
- [x] `use-cases/carrier-documents/reject-carrier-document.use-case.ts`
- [x] `use-cases/carrier-documents/list-carrier-documents-for-admin.use-case.ts`
- [x] Registrar nos barrels
- [x] `app/api/admin/carrier-documents/route.ts` — GET
- [x] `app/api/admin/carrier-documents/[documentId]/approve/route.ts` — POST
- [x] `app/api/admin/carrier-documents/[documentId]/reject/route.ts` — POST
- [x] Swagger — estender `lib/swagger/definitions/carrier-documents.ts`
- [x] `docs/insomnia/s5-t2-admin-verify.json`
- [x] QA via curl: promover ADMIN via SQL, inserir docs via SQL (sem Supabase real), aprovar 4/5 (PENDING), aprovar 5º (APPROVED), rejeitar doc de outro carrier (continua PENDING), revisar 2x (409), reject sem motivo (400), GET filtrado, 403 pra CUSTOMER/CARRIER
- [x] `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S5-T1
