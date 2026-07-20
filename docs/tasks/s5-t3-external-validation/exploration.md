# S5-T3 — Exploration

## Current code state

- `CarrierDocument.externalValidation` (`Json?`) exists since S0-T1, untouched by any code so far (confirmed via grep — no repository method, use-case, or route references it).
- `CarrierDocumentRepository.findById(id)` (S5-T2) is directly reusable — no gate needed, since this action works regardless of document `status`.
- `getPrincipal`'s `ADMIN` role gate (established in S5-T2) is the exact pattern to reuse for this route.

## Key files (patterns to mirror)

- `server/use-cases/carrier-documents/reject-carrier-document.use-case.ts` (S5-T2) — closest shape: find by id → `NOT_FOUND` if missing → single repo update call. This use-case is simpler still (no status guard).
- `server/repositories/carrier-document.repository.ts` — add `recordExternalValidation(id, envelope)` alongside the existing `updateStatus`.

## Integration points

- **Envelope type:** since Prisma's `Json` column is untyped at the DB layer, the envelope shape should be defined as a TS type at the schema/use-case layer (not enforced by Prisma) — `ExternalValidationEnvelope = { provider: 'MANUAL'; result: 'MATCH'|'MISMATCH'|'INCONCLUSIVE'; notes?: string; checkedBy: string; checkedAt: string }`. A future automated provider would produce a structurally similar but not identical shape (`raw` instead of `notes`) — worth deciding in Research whether to model this now as a discriminated union (`provider: 'MANUAL'` vs `provider: 'BIGDATACORP'`) or keep it loose or generic for this task, since only `MANUAL` is actually implemented today.

## Risks

- None significant — smallest task in the sprint. Only real judgment call is how strictly to type the envelope now for a provider that doesn't exist yet (see Research).
