# S5-T2 — Plan

## `carrier-document.repository.ts` — métodos novos

```ts
findById(id): Promise<CarrierDocument | null>

updateStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reviewedBy: string,
  rejectionReason?: string,
): Promise<void>
// prisma.carrierDocument.update({ where: { id }, data: { status, reviewedBy, reviewedAt: new Date(), rejectionReason } })

findApprovedTypesByCarrier(carrierId): Promise<CarrierDocumentType[]>
// prisma.carrierDocument.findMany({ where: { carrierId, status: 'APPROVED' }, distinct: ['type'], select: { type: true } }).then(rows => rows.map(r => r.type))

findByStatus(filter: { status?: VerificationStatus; cursor?: string; limit?: number }): Promise<{ data: CarrierDocument[]; nextCursor: string | null }>
// mesmo padrão limit+1 de shipment.repository.ts#listOpenForBrowse
```

## `carrier-profile.repository.ts` — método novo

```ts
markVerified(userId: string, verifiedBy: string): Promise<void>
// prisma.carrierProfile.update({ where: { userId }, data: { verificationStatus: 'APPROVED', verifiedAt: new Date(), verifiedBy } })
```

## Schemas — `server/schemas/carrier-document.schema.ts` (extensão do arquivo da S5-T1)

```ts
export const CarrierDocumentIdParamSchema = z.object({ documentId: z.uuid() })

export const RejectCarrierDocumentSchema = z.object({
  rejectionReason: z.string().min(1),
})

export const ListCarrierDocumentsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
```

## Use-cases (`server/use-cases/carrier-documents/`)

### `approve-carrier-document.use-case.ts`
1. `carrierDocumentRepo.findById(id)` → `NOT_FOUND`
2. `document.status !== 'PENDING'` → `INVALID_STATE_TRANSITION`
3. `carrierDocumentRepo.updateStatus(id, 'APPROVED', adminUserId)`
4. `approvedTypes = carrierDocumentRepo.findApprovedTypesByCarrier(document.carrierId)`
5. Se `CARRIER_DOCUMENT_TYPES.every(t => approvedTypes.includes(t))` → `carrierProfileRepo.markVerified(document.carrierId, adminUserId)`

### `reject-carrier-document.use-case.ts`
1-2. mesmas checagens do approve
3. `carrierDocumentRepo.updateStatus(id, 'REJECTED', adminUserId, rejectionReason)`

### `list-carrier-documents-for-admin.use-case.ts`
1. `carrierDocumentRepo.findByStatus(filter)`

## Rotas

```
app/api/admin/carrier-documents/route.ts                       — GET (ADMIN)
app/api/admin/carrier-documents/[documentId]/approve/route.ts  — POST (ADMIN)
app/api/admin/carrier-documents/[documentId]/reject/route.ts   — POST (ADMIN)
```

Gate: `if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')` — primeira vez nesse padrão no domínio Movux.

## Swagger + Insomnia

- `lib/swagger/definitions/carrier-documents.ts` (estende o arquivo da S5-T1) — 3 endpoints novos, mesma tag `Carrier Documents`
- `docs/insomnia/s5-t2-admin-verify.json` — novo

## Ordem de execução

1. `carrier-document.repository.ts` — 3 métodos novos
2. `carrier-profile.repository.ts` — `markVerified`
3. Schemas novos em `carrier-document.schema.ts`
4. 3 use-cases
5. Registrar nos barrels
6. 3 rotas
7. Swagger
8. Insomnia
9. QA via curl: promover um usuário existente pra `ADMIN` via SQL (mesmo padrão da S3-T1); fluxo completo — upload dos 5 tipos (S5-T1, sem Supabase real então usar `fileUrl` inserido direto via SQL pra simular documentos já "enviados"), aprovar 4 de 5 (verificationStatus continua PENDING), aprovar o 5º (verificationStatus vira APPROVED), rejeitar um documento de outro carrier (verificationStatus continua PENDING, não vira REJECTED), aprovar/rejeitar documento já revisado (409), reject sem rejectionReason (400), GET filtrado por status, acesso por CUSTOMER/CARRIER (403)
10. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S5-T1

## Nota sobre QA sem Supabase configurado

Como o upload real (S5-T1) falha sem credenciais, os documentos usados nesta QA serão inseridos direto via `INSERT INTO "carrierDocument"` (SQL), simulando uploads já concluídos com `status: PENDING` e um `fileUrl` fake — suficiente pra exercitar toda a lógica de aprovação/rejeição/cascata, que não depende do conteúdo real do arquivo.
