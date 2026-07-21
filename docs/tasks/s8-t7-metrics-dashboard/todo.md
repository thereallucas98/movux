# TODO: S8-T7 — Dashboard de Métricas

**Date**: 2026-07-21
**Phase**: EXECUTION
**Status**: DONE

---

## Implementation Checklist

### Step 1: Repos

- [x] **1.1** `shipment.repository.ts` — `countActiveByCustomer`, `sumFinalPriceByCustomer`, `countActiveByCarrier`, `sumFinalPriceByCarrier`
- [x] **1.2** `customer-profile.repository.ts` — `findMetricsByUserId`
- [x] **1.3** `carrier-profile.repository.ts` — `findMetricsByUserId`, `countFlagged`, `countActive`, `countByVerificationStatus`
- [x] **1.4** `carrier-document.repository.ts` — `countByStatus`

### Step 2: Use-cases

- [x] **2.1** `use-cases/dashboard/get-customer-dashboard-metrics.use-case.ts`
- [x] **2.2** `use-cases/dashboard/get-carrier-dashboard-metrics.use-case.ts`
- [x] **2.3** `use-cases/dashboard/get-admin-dashboard-metrics.use-case.ts`
- [x] **2.4** Exports em `use-cases/index.ts`

### Step 3: GraphQL

- [x] **3.1** `server/graphql/queries/dashboard-metrics.query.ts` — 3 types + 3 queries

### Step 4: Codegen

- [x] **4.1** 3 arquivos `.graphql` em `graphql/operations/dashboard/`
- [x] **4.2** `pnpm codegen`

### Step 5: Hooks

- [x] **5.1** `use-customer-dashboard-metrics.ts`
- [x] **5.2** `use-carrier-dashboard-metrics.ts`
- [x] **5.3** `use-admin-dashboard-metrics.ts`

### Step 6: Componente base

- [x] **6.1** `components/ui/metric-card.tsx`

### Step 7: Componentes por role

- [x] **7.1** `components/features/dashboard/customer-metrics.tsx`
- [x] **7.2** `components/features/dashboard/carrier-metrics.tsx`
- [x] **7.3** `components/features/dashboard/admin-metrics.tsx`

### Step 8: Páginas

- [x] **8.1** `app/customer/dashboard/page.tsx`
- [x] **8.2** `app/carrier/dashboard/page.tsx`
- [x] **8.3** `app/admin/dashboard/page.tsx`

### Step 9: Validation

- [x] **9.1** `pnpm lint` escopo isolado desta task — limpo
- [x] **9.2** `pnpm typecheck` escopo isolado desta task — limpo
- [x] **9.3** QA manual — 3 dashboards com dado real, zero-state, responsivo 375px/desktop, isolamento entre roles (query certa por role)
- [x] **9.4** `validation.md` registrado após aprovação do QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1–1.4 | ✅ | +2 métodos extras (`countByCustomer`/`countByCarrier`) achados na QA |
| 2.1–2.4 | ✅ | |
| 3.1 | ✅ | |
| 4.1–4.2 | ✅ | |
| 5.1–5.3 | ✅ | |
| 6.1 | ✅ | ajustado responsivo na QA (fonte/ícone menor no mobile) |
| 7.1–7.3 | ✅ | |
| 8.1–8.3 | ✅ | |
| 9.1–9.4 | ✅ | 2 bugs reais: "Total de fretes" sempre zerado (campo morto), truncamento no mobile |
