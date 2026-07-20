# S5-T1 — Exploration

## Current code state

- No `CarrierDocumentRepository` exists yet — needs creating.
- `CarrierDocument.carrierId` references `User.id` directly (not `CarrierProfile.id`) — no profile lookup needed, `principal.userId` can be used as-is.
- `lib/storage/supabase.ts` (Turnora legacy, already explored in `brief.md`) exposes `uploadFile(bucket, path, file, contentType)` / `deleteFile(bucket, path)`, both throwing on failure.
- **Full multipart precedent already exists** in `app/api/requests/route.ts` + `server/use-cases/requests/submit-time-off.use-case.ts` (Task 12, Turnora legacy):
  - Route: detects `multipart/form-data` via `content-type` header, calls `req.formData()`, extracts the file field, converts to `Buffer` via `arrayBuffer()`, passes to the use-case alongside the parsed JSON `payload` field.
  - Validation: `ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024`, `ATTACHMENT_MIME_WHITELIST` array, both in `request.schema.ts` — reusable constants/pattern (values may differ for documents, e.g. allowing PDF).
  - Upload: `path = "{domain}/{scopingId}/{userId}/{timestamp}-{safeFilename}"`, wrapped in try/catch mapping any failure to `ATTACHMENT_UPLOAD_FAILED`.
  - **Both `ATTACHMENT_INVALID` and `ATTACHMENT_UPLOAD_FAILED` error codes already exist** in `error-response.ts`/`graphql/errors.ts` with generic, reusable messages ("Invalid attachment (MIME or size)", "Failed to upload attachment") — **no new error codes needed for S5-T1**.
  - Bucket: `process.env.SUPABASE_STORAGE_BUCKET ?? 'request-attachments'` — the Turnora-era fallback name is domain-specific to that project; Movux needs its own fallback (e.g. `'carrier-documents'`).
- The legacy use-case calls `prisma.$transaction` directly rather than going through a repository — inconsistent with the Movux architecture (`route → use-case(repos) → repository`, established since S0-T2). S5-T1 will follow the Movux pattern (new `CarrierDocumentRepository`), borrowing only the storage-call mechanics (path construction, try/catch → `ATTACHMENT_UPLOAD_FAILED`) from the legacy code, not its persistence approach.

## Key files (patterns to mirror)

- `app/api/requests/route.ts` — multipart-vs-JSON content-type branching at the route level.
- `server/schemas/request.schema.ts` — `parseAttachmentField(formData)` shape; `ATTACHMENT_MIME_WHITELIST`/`ATTACHMENT_MAX_BYTES` constants to adapt for documents.
- `server/use-cases/requests/submit-time-off.use-case.ts` — storage path convention and error-mapping pattern.

## Integration points

- New `CarrierDocumentRepository`: `create(data)`, `findByCarrier(carrierId)`.
- New `server/schemas/carrier-document.schema.ts`: `parseDocumentField(formData)` (adapted from `parseAttachmentField`) + a `type` field validator restricted to the 5 carrier-autônomo values (`CPF|CNH_FRONT|CNH_BACK|ADDRESS_PROOF|SELFIE`) — company types (`CNPJ`, `SOCIAL_CONTRACT`) rejected here per the brief's scoping, not just "not implemented."

## Risks

- None significant — this is a well-trodden pattern in the codebase (Task 12 built and shipped the exact same shape). Main care point: confirming the route correctly branches multipart parsing without breaking the existing all-JSON routes elsewhere (isolated to this new route file, no shared code touched).
