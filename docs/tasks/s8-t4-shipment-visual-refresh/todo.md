# TODO: S8-T4 — Fretes do Customer — Prova de Conceito Visual

**Date**: 2026-07-21
**Phase**: EXECUTION
**Status**: DONE

---

## Implementation Checklist

### Step 1: Hook

- [x] **1.1** `graphql/hooks/use-shipment.ts` (já existia do S8-T1, reaproveitado; `meta: { silent: true }` adicionado na QA)

### Step 2: Ícone por tipo

- [x] **2.1** `components/features/shipments/shipment-type-icon.tsx` (novo)

### Step 3: Painel de filtro

- [x] **3.1** `components/features/shipments/shipment-filter-sheet.tsx` (novo)

### Step 4: Card de detalhe

- [x] **4.1** `components/features/shipments/shipment-detail-view.tsx` (novo)

### Step 5: Página de detalhe

- [x] **5.1** `app/customer/shipments/[shipmentId]/page.tsx` (novo)

### Step 6: Lista

- [x] **6.1** `shipments-list.tsx` — estado de status + botão de filtro + `ShipmentFilterSheet`
- [x] **6.2** `shipments-list.tsx` — `ShipmentTypeIcon` em cada linha/card
- [x] **6.3** `shipments-list.tsx` — linha/card vira link pro detalhe

### Step 7: Documentação

- [x] **7.1** `docs/DESIGN-SYSTEM.md` — padrão de ícone por categoria + padrão de painel de filtro

### Step 8: Validation

- [x] **8.1** `pnpm lint` escopo isolado desta task — limpo
- [x] **8.2** `pnpm typecheck` escopo isolado desta task — limpo
- [x] **8.3** QA manual no navegador (lista com ícone, filtro aplicar/limpar, navegação pro detalhe, detalhe com dado real, 404 de frete inexistente, responsivo 375px/desktop) — 2 bugs reais encontrados e corrigidos (toast de erro cru; destaque de nav em rota filha/sobreposta)
- [x] **8.4** `validation.md` registrado após aprovação do QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1 | ✅ | Hook pré-existente do S8-T1, nunca usado; `silent: true` adicionado na QA |
| 2.1 | ✅ | |
| 3.1 | ✅ | |
| 4.1 | ✅ | |
| 5.1 | ✅ | |
| 6.1–6.3 | ✅ | |
| 7.1 | ✅ | |
| 8.1–8.4 | ✅ | QA ao vivo achou 2 bugs reais: toast global vazando erro GraphQL cru, e nav highlight quebrando em rota filha/prefixo sobreposto — ambos corrigidos e revalidados |
