# S9-T3 — Exploration

**Date**: 2026-07-21
**Status**: Complete

---

## Correção ao brief: path de relação carrier → cidade é mais longo que o descrito

O brief descrevia o join como `CarrierProfile → Proposal(ACCEPTED) → Shipment.origin`. Confirmado no schema real, com 2 correções importantes:

1. **`Proposal.carrierId` referencia `User.id`, não `CarrierProfile.id`** (`schema.prisma:736,748`). `CarrierProfile.userId` (`:347`, `@unique`) é o campo que precisa bater com `Proposal.carrierId` — não existe FK direta `CarrierProfile → Proposal`.
2. **`Shipment` não tem campo `originCityId`/`origin` singular.** Cidade mora em `ShipmentAddress` (`schema.prisma:657-680`): `cityId` (`:666`) + `type: AddressType` (`ORIGIN`/`DESTINATION`, enum `:123-126`), com `@@unique([shipmentId, type])` (`:678`). O acesso é via `Shipment.addresses ShipmentAddress[]` (`:639`), filtrando `type: 'ORIGIN'`.

**Path correto e completo:**
```
CarrierProfile.userId
  → Proposal.carrierId (where status: 'ACCEPTED')
    → Proposal.shipment
      → Shipment.addresses (where type: 'ORIGIN')
        → ShipmentAddress.cityId
```

`ProposalStatus` enum confirmado (`schema.prisma:60-66`): `ACTIVE | ACCEPTED | REJECTED | WITHDRAWN | EXPIRED`.

---

## Precedente de agregação por relação — está em `shipment.repository.ts`, não `proposal.repository.ts`

O brief citava `proposal.repository.ts` como candidato ao método novo — na prática esse arquivo (153 linhas) só tem `findMany`, sem agregação. O precedente real de "count via relação Prisma sem SQL raw" (S8-T7) está em `shipment.repository.ts:344-351` e `:371-375`:

```ts
async countActiveByCarrier(carrierId) {
  return prisma.shipment.count({
    where: { status: {...}, proposals: { some: { carrierId, status: 'ACCEPTED' } } },
  })
}
async countByCarrier(carrierId) {
  return prisma.shipment.count({
    where: { proposals: { some: { carrierId, status: 'ACCEPTED' } } },
  })
}
```

Mesmo padrão `relation: { some: {...} }`, mas invertido em relação ao que esta task precisa: aqui a query parte de `CarrierProfile`/`User` (não de `Shipment`) e precisa agrupar por carrier a partir de fretes que batem a cidade — mais próximo de uma query em `Shipment`/`Proposal` com `include`/`groupBy` por `carrierId`, seguida de um segundo lookup em `CarrierProfile` pelos `userId`s encontrados (dois passos, não um único `count`). Isso vai pro `carrier-profile.repository.ts` ou um novo método dedicado — decisão de qual arquivo recebe o método fica pro `plan.md`, mas fica confirmado que **não é uma extensão direta de `countByCarrier`**, é uma query nova (lista distinta de carriers, não uma contagem).

---

## Contexto GraphQL — `ctx.principal` já é `null`-safe, nenhuma query pública existe hoje

- `resolvePrincipal` (`server/graphql/context.ts:80-108`) decodifica o cookie `session`; se ausente/inválido retorna `null` (nunca lança) — `createGraphQLContext` sempre popula `ctx.principal` com esse valor, inclusive `null`.
- Todas as queries existentes (`browse-shipments.query.ts:20`, `dashboard-metrics.query.ts:49,70,91`) fazem `if (!ctx.principal) throw gqlError('UNAUTHENTICATED')` logo no início — a query pública desta task é a **primeira exceção** ao padrão, confirmando o que o brief já assumia (Risk table).
- Padrão Pothos a replicar: `builder.queryField('nome', (t) => t.field({ type, args, resolve: async (_root, args, ctx) => {...} }))` (`browse-shipments.query.ts:10-36`). Pra tipo de retorno simples (sem paginação), usar `builder.simpleObject('PublicCarrierResult', { fields: (t) => ({...}) })`, mesmo padrão de `dashboard-metrics.query.ts:9-19`. Registro em `schema.ts:70-71` (import da query) e `schema.ts:46` (tipo, se novo).

---

## Middleware e route groups — rota pública não precisa de tratamento especial

- `middleware.ts` matcher (`:63-65`) cobre só `/customer/:path*`, `/carrier/:path*`, `/admin/:path*` — qualquer rota fora disso (inclusive `/buscar-transportadores` e `/api/graphql`) não passa pelo middleware, sem risco de bloqueio acidental.
- Não existe `(public)` hoje; só `(auth)` e `(test)`. Os 3 `layout.tsx` de auth-gate (`admin/layout.tsx:11`, `carrier/layout.tsx:11`, `customer/layout.tsx:11`) chamam `await requireMe()` — o `layout.tsx` raiz não chama nada disso. Confirma que criar um novo grupo `(public)/buscar-transportadores` não herda proteção nenhuma automaticamente — é seguro, sem bypass especial necessário.

---

## Riscos confirmados / atualizados

- **Novo risco identificado**: a query precisa de 2 passos (achar `userId`s de carrier com frete aceito na cidade → buscar `CarrierProfile` desses `userId`s filtrando `verificationStatus/isActive/isFlagged`), não um único `count`/`findMany` relacional simples como os precedentes existentes — aumenta levemente a complexidade do use-case frente ao estimado no brief, mas não muda o esforço geral (já era Medium/6-8h).
- Riscos do brief (carrier sem histórico não aparece; scraping sem PII de baixo valor; precedente de resolver público sendo copiado por engano) — todos confirmados, sem mudança.

## Next Steps

Seguir para `research.md` — decidir o método exato de 2 passos (uma query `groupBy`/`findMany` distinct de `Proposal` + um `findMany` em `CarrierProfile`, feito no use-case ou em dois métodos de repository) e o nome final do tipo/query GraphQL.
