# TODO: S8-T5 — Fretes do Carrier — Generalização do Redesign Visual

**Date**: 2026-07-21
**Phase**: EXECUTION
**Status**: DONE

---

## Implementation Checklist

### Step 1: Repo

- [x] **1.1** `server/repositories/shipment.repository.ts` — método `findById` (novo)

### Step 2: Use-case

- [x] **2.1** `server/use-cases/shipments/get-shipment-for-carrier.use-case.ts` (novo)
- [x] **2.2** Export em `server/use-cases/index.ts`

### Step 3: Resolver GraphQL

- [x] **3.1** `server/graphql/queries/shipments.query.ts` — query `shipmentForCarrier`

### Step 4: Codegen

- [x] **4.1** `graphql/operations/shipment-for-carrier.graphql` (novo)
- [x] **4.2** `pnpm codegen`

### Step 5: Hook

- [x] **5.1** `graphql/hooks/use-shipment-for-carrier.ts` (novo)

### Step 6: Card de detalhe

- [x] **6.1** `components/features/shipments/carrier-shipment-detail-view.tsx` (novo)

### Step 7: Página

- [x] **7.1** `app/carrier/shipments/[shipmentId]/page.tsx` (novo)

### Step 8: Browse — ícone + clicável

- [x] **8.1** `components/features/shipments/browse-shipment-card.tsx` — `ShipmentTypeIcon`
- [x] **8.2** `browse-shipment-card.tsx` — card clicável (`router.push`)
- [x] **8.3** `browse-shipment-card.tsx` — `stopPropagation` no footer/botão de ação

### Step 9: Propostas — ícone + clicável

- [x] **9.1** `components/features/proposals/my-proposals-list.tsx` — `ShipmentTypeIcon`
- [x] **9.2** `my-proposals-list.tsx` — card clicável (`router.push`)
- [x] **9.3** `my-proposals-list.tsx` — `stopPropagation` no footer/botão de ação

### Step 10: Validation

- [x] **10.1** `pnpm lint` escopo isolado desta task — limpo
- [x] **10.2** `pnpm typecheck` escopo isolado desta task — limpo
- [x] **10.3** QA manual no navegador — backend (3 cenários de permissão), UI (browse, propostas, detalhe, dashboard, stopPropagation, responsivo 375px/desktop, isolamento entre 2 contas carrier) — 1 bug real encontrado e corrigido (regra de visibilidade incompleta)
- [x] **10.4** `validation.md` registrado após aprovação do QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1 | ✅ | |
| 2.1–2.2 | ✅ | |
| 3.1 | ✅ | |
| 4.1–4.2 | ✅ | |
| 5.1 | ✅ | |
| 6.1 | ✅ | |
| 7.1 | ✅ | |
| 8.1–8.3 | ✅ | |
| 9.1–9.3 | ✅ | |
| 10.1–10.2 | ✅ | |
| 10.3–10.4 | ✅ | 1 bug real: visibilidade do detalhe não cobria PROPOSALS_RECEIVED — corrigido e revalidado |
