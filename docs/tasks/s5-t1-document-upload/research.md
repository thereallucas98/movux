# S5-T1 — Research

## Decision Log

Nenhuma decisão de arquitetura pendente — a Exploration encontrou um precedente direto e completo (`app/api/requests/route.ts` + `submit-time-off.use-case.ts`) pra multipart upload + Supabase Storage, incluindo os códigos de erro já existentes. As únicas escolhas de escopo (documentos de company/CRLV fora, comportamento sem Supabase configurado) já foram resolvidas no `brief.md`.

## Technical Analysis

- **`CarrierDocumentRepository` (novo):**
  ```ts
  export interface CarrierDocumentRepository {
    create(data: {
      carrierId: string
      type: CarrierDocumentType
      fileUrl: string
    }): Promise<CarrierDocument>
    findByCarrier(carrierId: string): Promise<CarrierDocument[]>
  }
  ```
- **`server/schemas/carrier-document.schema.ts` (novo):**
  ```ts
  export const CARRIER_DOCUMENT_TYPES = ['CPF', 'CNH_FRONT', 'CNH_BACK', 'ADDRESS_PROOF', 'SELFIE'] as const
  export const DOCUMENT_MIME_WHITELIST = ['image/jpeg', 'image/png', 'application/pdf'] as const
  export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024 // 10MB — docs maiores que os 5MB de anexo de request (fotos de CNH/selfie em boa resolução)

  export function parseDocumentField(formData: FormData): ParseDocumentResult { ... } // mesmo shape de parseAttachmentField
  export const DocumentTypeSchema = z.enum(CARRIER_DOCUMENT_TYPES)
  ```
- **Use-case `upload-carrier-document.use-case.ts`:**
  1. Recebe `type` (já validado pelo schema) + `file: {buffer, contentType, sizeBytes, originalFilename}`
  2. Monta `path = "carrier-documents/${userId}/${Date.now()}-${safeName}"`
  3. `uploadFile(bucket, path, buffer, contentType)` — try/catch → `ATTACHMENT_UPLOAD_FAILED`
  4. `carrierDocumentRepo.create({ carrierId: userId, type, fileUrl: uploaded.url })`
- **Use-case `list-carrier-documents.use-case.ts`:** só `carrierDocumentRepo.findByCarrier(userId)` — sem checagem extra de participante (o próprio carrier autenticado é sempre dono dos seus documentos, não há conceito de "outro participante" aqui como em shipment)
- **Bucket:** `process.env.SUPABASE_STORAGE_BUCKET ?? 'carrier-documents'` (fallback Movux-específico, diferente do `'request-attachments'` herdado do Turnora)
- **Rota:** `app/api/me/documents/route.ts` — `POST` (multipart, branch de content-type como em `requests/route.ts`) + `GET` (JSON simples)

## Edge Cases

| Case | Behavior |
|---|---|
| `type` fora dos 5 permitidos (ex. `CNPJ`) | 400 `VALIDATION_ERROR` (rejeitado no schema, não silenciosamente ignorado) |
| Arquivo > 10MB | 400 `ATTACHMENT_INVALID` |
| MIME não permitido (ex. `video/mp4`) | 400 `ATTACHMENT_INVALID` |
| Sem arquivo no `multipart/form-data` | 400 `ATTACHMENT_INVALID` |
| Supabase não configurado (`.env` sem `NEXT_PUBLIC_SUPABASE_URL`) | `uploadFile` lança, use-case captura → 409/500 `ATTACHMENT_UPLOAD_FAILED` (comportamento esperado, documentado no `brief.md`) |
| Reenvio do mesmo `type` | cria uma 2ª linha — não há unique constraint, comportamento intencional (histórico) |
| `GET /me/documents` sem nenhum documento enviado | `[]` |
| Caller não é `CARRIER` | 403 |

## Blockers

✅ No blockers.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3) — roteiro de QA precisa cobrir explicitamente o caso "Supabase não configurado" como resultado esperado, não como falha do roteiro.
