# TODO: S9-T3 — Busca Pública de Transportadores

**Date**: 2026-07-21
**Phase**: EXECUTION
**Status**: IN_PROGRESS

---

## Implementation Checklist

### Step 1: Repository

- [x] **1.1** Correção de execução: split em 3 métodos, não 1 — `proposal.repository.ts.findDistinctCarrierIdsAcceptedInCity`, `carrier-profile.repository.ts.findEligiblePublicProfiles`, `vehicle.repository.ts` (novo repo) `findActiveTypeByOwnerId`. `totalShipments` vem de `shipmentRepo.countByCarrier` (não do campo `CarrierProfile.totalShipments`, confirmado morto/sempre-0 via comentário em `shipment.repository.ts:365`)
- [x] **1.2** `vehicle.repository.ts` (novo) + registrado em `repositories/index.ts` e `graphql/context.ts`
- [x] **1.3** `geography.repository.ts` — `listCities()` novo (necessário: não havia nenhuma forma pública de listar cidades pro form de busca)

### Step 2: Use-case

- [x] **2.1** `use-cases/carriers/search-public-carriers.use-case.ts` (novo) + registrado em `use-cases/index.ts`

### Step 3: GraphQL

- [x] **3.1** `graphql/queries/public-carrier-search.query.ts` (novo, com `PublicCarrierResultType` inline)
- [x] **3.2** `graphql/queries/public-cities.query.ts` (novo, não previsto no plan original — necessário pro form)
- [x] **3.3** Registro em `schema.ts`; `pnpm codegen` rodado 2x, sem erro

### Step 4: Hook e UI da rota pública

- [x] **4.1** `graphql/hooks/use-public-carrier-search.ts` + `use-public-cities.ts` (novo)
- [x] **4.2** `app/(public)/buscar-transportadores/page.tsx` (novo)
- [x] **4.3** `components/features/public-search/carrier-search-form.tsx` (novo) + `carrier-search-page.tsx` (novo, wrapper client que guarda o estado da busca)
- [x] **4.4** `components/features/public-search/carrier-search-results.tsx` (novo, com estado vazio + CTA)

### Step 5: Prefill de cadastro e criação de frete

- [x] **5.1** Correção de execução: `register-form.tsx` lê `useSearchParams()` direto (client component) — não precisou tocar em `register/page.tsx` além de adicionar `<Suspense>` (exigência do Next para `useSearchParams`)
- [x] **5.2** `register-form.tsx` — lê `cityId`/`vehicleType`/`role`, redirect condicional pós-cadastro
- [x] **5.3** Correção de execução (limitação real descoberta): `create-shipment-form.tsx` só prefila `vehicleTypeRequired` — `origin.cityId` não tem campo próprio nessa tela (endereço é por bairro, que já deriva a cidade); prefill de cidade sozinha ficaria incompleto sem escolher um bairro específico, fora do escopo de "prefill simples". `customer/shipments/new/page.tsx` ganhou `<Suspense>` (exigência do Next para `useSearchParams`)

### Step 6: Validation

- [x] **6.1** `pnpm lint` no escopo desta task — 0 erros/warnings novos; `pnpm codegen` rodado 2x sem erro (confirma schema GraphQL/tipos sintaticamente corretos)
- [ ] **6.2** `pnpm build` — bloqueado por bug pré-existente não relacionado (`app/api/workspace/select/route.ts`) — ver S9-T2/todo.md 6.2, reportado na QA
- [ ] **6.3** QA GraphQL: cidade com/sem carrier, carrier flagged/pending nunca aparece, payload sem PII — pendente (ver QA em chat)
- [ ] **6.4** QA UI: acesso sem cookie, fluxo completo busca→cadastro→frete prefilado, fluxo direto sem regressão — pendente (ver QA em chat)
- [ ] **6.5** `validation.md` registrado após aprovação do QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1 | ⬜ | |
| 2.1 | ⬜ | |
| 3.1–3.3 | ⬜ | |
| 4.1–4.4 | ⬜ | |
| 5.1–5.3 | ⬜ | |
| 6.1–6.5 | ⬜ | |
