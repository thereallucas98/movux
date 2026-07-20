# S5-T2 — Exploration

## Current code state

- `CarrierDocumentRepository` (S5-T1) only has `create`/`findByCarrier` — needs `findById`, `updateStatus` (approve/reject), and `findByStatus` (admin queue) added.
- `CarrierProfileRepository` (S4-T2) only has `updateRating` — needs a method to update `verificationStatus`/`verifiedAt`/`verifiedBy`.
- No route in the Movux domain has been gated to `ADMIN` yet — this is the first one. Pattern is identical to the existing `CUSTOMER`/`CARRIER` gates (`if (principal.role !== 'ADMIN') return errorResponse('FORBIDDEN')`), no new infrastructure needed.
- `CARRIER_DOCUMENT_TYPES` (S5-T1, `server/schemas/carrier-document.schema.ts`) already exports the 5 required type codes as a typed const array — directly reusable for an "are all 5 required types approved" completeness check.
- Cursor-pagination pattern (`limit + 1` trick, `nextCursor`) already established in `shipment.repository.ts#listOpenForBrowse` / `#listForCustomer` — reusable shape for the admin queue `GET`.

## Key files (patterns to mirror)

- `server/repositories/shipment.repository.ts` — cursor pagination shape.
- `server/use-cases/shipments/proposals/accept-proposal.use-case.ts` — precedent for "this action on entity A cascades to update entity B" (accepting a proposal updates the shipment).

## Integration points

- **Completeness check:** after approving a document, check whether the carrier now has an `APPROVED` document for all 5 types in `CARRIER_DOCUMENT_TYPES` — needs a repo method like `hasApprovedForAllTypes(carrierId, types[]): Promise<boolean>` (or fetch all approved docs for the carrier and compare the distinct `type` set against the required list in the use-case layer — simpler, no new aggregate query shape needed).
- **`CarrierProfile.verifiedBy`/`verifiedAt`:** if the auto-approval cascade is confirmed in Research, these should be set to the *admin's* id (the one whose approval action completed the set) and the current timestamp — consistent with `CarrierDocument.reviewedBy`/`reviewedAt` already being set to the same admin in the same request.

## Risks

- Getting the completion-check wrong (e.g. counting documents instead of distinct approved *types*) could let a carrier with 5 duplicate uploads of the same type (allowed since S5-T1 has no unique constraint) get auto-approved without actually having all 5 distinct document types reviewed. Worth explicit QA coverage: upload 2× the same type, confirm approving both doesn't trigger completion.
