# S5-T1 — Plan

## `server/repositories/carrier-document.repository.ts` (novo)

```ts
import type { CarrierDocument, CarrierDocumentType, PrismaClient } from '~/generated/prisma/client'

export interface CreateCarrierDocumentInput {
  carrierId: string
  type: CarrierDocumentType
  fileUrl: string
}

export interface CarrierDocumentRepository {
  create(data: CreateCarrierDocumentInput): Promise<CarrierDocument>
  findByCarrier(carrierId: string): Promise<CarrierDocument[]>
}

export function createCarrierDocumentRepository(prisma: PrismaClient): CarrierDocumentRepository {
  return {
    async create(data) {
      return prisma.carrierDocument.create({ data })
    },
    async findByCarrier(carrierId) {
      return prisma.carrierDocument.findMany({
        where: { carrierId },
        orderBy: { uploadedAt: 'desc' },
      })
    },
  }
}
```

## `server/schemas/carrier-document.schema.ts` (novo)

```ts
import { z } from 'zod'

export const CARRIER_DOCUMENT_TYPES = [
  'CPF', 'CNH_FRONT', 'CNH_BACK', 'ADDRESS_PROOF', 'SELFIE',
] as const

export const DocumentTypeSchema = z.enum(CARRIER_DOCUMENT_TYPES)

export const DOCUMENT_MIME_WHITELIST = ['image/jpeg', 'image/png', 'application/pdf'] as const
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

export type ParseDocumentResult =
  | { success: true; file: File }
  | { success: false; code: 'ATTACHMENT_INVALID' }

export function parseDocumentField(formData: FormData): ParseDocumentResult {
  const raw = formData.get('file')
  if (!(raw instanceof File) || raw.size === 0) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  if (raw.size > DOCUMENT_MAX_BYTES) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  if (!DOCUMENT_MIME_WHITELIST.includes(raw.type as (typeof DOCUMENT_MIME_WHITELIST)[number])) {
    return { success: false, code: 'ATTACHMENT_INVALID' }
  }
  return { success: true, file: raw }
}
```

## Use-cases (`server/use-cases/carrier-documents/`)

### `upload-carrier-document.use-case.ts`
```ts
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'carrier-documents'

export async function uploadCarrierDocument(repos, userId, type, file: {buffer, contentType, sizeBytes, originalFilename}) {
  const safeName = file.originalFilename.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
  const path = `carrier-documents/${userId}/${Date.now()}-${safeName}`

  let uploaded
  try {
    uploaded = await uploadFile(STORAGE_BUCKET, path, file.buffer, file.contentType)
  } catch {
    return { success: false, code: 'ATTACHMENT_UPLOAD_FAILED' }
  }

  const document = await repos.carrierDocumentRepo.create({
    carrierId: userId,
    type,
    fileUrl: uploaded.url,
  })

  return { success: true, document }
}
```

### `list-carrier-documents.use-case.ts`
```ts
export async function listCarrierDocuments(repos, userId) {
  const documents = await repos.carrierDocumentRepo.findByCarrier(userId)
  return { success: true, documents }
}
```
(Sem `success: false` — sempre 200, mesmo com lista vazia; não há gate de participante como nas rotas de shipment.)

## Rota — `app/api/me/documents/route.ts` (novo)

```
POST — multipart/form-data (campo "type" + campo "file"), gate CARRIER, branch de content-type como em app/api/requests/route.ts
GET  — lista os documentos do carrier autenticado, gate CARRIER
```

## Swagger + Insomnia

- `lib/swagger/definitions/carrier-documents.ts` (novo) — 2 endpoints, tag `Carrier Documents`
- `docs/insomnia/s5-t1-document-upload.json` — novo (Insomnia suporta corpo multipart nativamente)

## Ordem de execução

1. `server/repositories/carrier-document.repository.ts`
2. `server/schemas/carrier-document.schema.ts`
3. 2 use-cases
4. Registrar nos barrels
5. Rota `app/api/me/documents/route.ts`
6. Swagger
7. Insomnia
8. QA via curl (`-F` pra multipart): type inválido (400), arquivo grande demais (400), MIME não permitido (400), não-CARRIER (403), upload válido → **esperado**: erro `ATTACHMENT_UPLOAD_FAILED` porque Supabase não está configurado (documentar o erro exato, não é falha do roteiro), `GET /me/documents` retorna `[]` (nada foi persistido, já que o upload falha antes do `create`)
9. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S4-T3
