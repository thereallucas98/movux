# S9-T3 — Research

**Date**: 2026-07-21
**Status**: Complete

---

## Decisão: método de busca em 2 passos

Confirmado no `exploration.md` que não existe um `count`/`findMany` relacional único que resolva a busca — decisão final do método, em `carrier-profile.repository.ts` (novo método `findPublicSearchResults`):

1. **Passo 1** — `prisma.proposal.findMany({ where: { status: 'ACCEPTED', shipment: { addresses: { some: { type: 'ORIGIN', cityId } } } }, select: { carrierId: true }, distinct: ['carrierId'] })` → lista de `userId`s de carrier elegíveis pela cidade.
2. **Passo 2** — `prisma.carrierProfile.findMany({ where: { userId: { in: [...] }, verificationStatus: 'APPROVED', isActive: true, isFlagged: false }, include: { user: { select: { fullName: true } } } })` → perfis elegíveis, já com o nome pra extrair o primeiro nome.

Dois passos, sem SQL raw, cada um usando só filtro de relação Prisma (mesmo espírito do precedente de `shipment.repository.ts:344-375`, adaptado pra retornar lista em vez de contagem).

---

## Decisão: origem do "tipo de veículo" no card

`Vehicle` não tem relação direta com `CarrierProfile` — só com `User` (via `ownerId`, caso autônomo) ou `Company` (via `companyId`, caso frota). Decisão de escopo pra v1: buscar `Vehicle` via `ownerId = carrierProfile.userId` (`Vehicle.isActive: true`, pegar o primeiro) — cobre o caso autônomo, que é o caminho mais direto e sem ambiguidade. Carrier vinculado a uma `Company`/frota (`CarrierProfile.currentCompanyId` preenchido) **não** tem o tipo de veículo resolvido nesta rodada — card mostra "—" no lugar do tipo de veículo nesse caso, em vez de reproduzir a cadeia `Company → Vehicle` (que exigiria decidir qual dos N veículos da frota mostrar, ambiguidade que não vale resolver pra um card anonimizado). Registrado como limitação aceita, não bloqueante.

---

## Decisão: nomes finais

- Rota: `apps/web/src/app/(public)/buscar-transportadores/page.tsx`
- Query GraphQL: `publicCarrierSearch(cityId: String!, vehicleType: VehicleType)`
- Tipo de retorno: `builder.simpleObject('PublicCarrierResult', { fields: (t) => ({ firstName: t.string(), vehicleType: t.field({ type: VehicleTypeEnum, nullable: true }), avgRating: t.float({ nullable: true }), totalShipments: t.int() }) })` — só esses 4 campos existem no tipo, fisicamente impossível vazar PII por herança de tipo (não reaproveita o tipo `Carrier` existente)
- Use-case: `search-public-carriers.use-case.ts`, recebe `(repos, input: { cityId, vehicleType? })` — sem `principal` no assinatura (não recebe porque não existe; diferente dos demais use-cases que recebem `principal` mesmo que não usem)
- Repository: método novo `findPublicSearchResults` em `carrier-profile.repository.ts` (não em `proposal.repository.ts`, corrigindo o brief original)

---

## Edge cases confirmados

- Carrier aparece 1x mesmo com múltiplos fretes aceitos na mesma cidade — garantido pelo `distinct: ['carrierId']` no Passo 1
- `avgRating` nulo (carrier com frete aceito mas sem review ainda) → "—" no card, mesmo tratamento do S8-T7
- `firstName` extraído de `fullName.split(' ')[0]` — nomes com um único termo (raro, mas possível) retornam o próprio nome inteiro, sem erro
- Filtro opcional de `vehicleType`: aplicado como filtro adicional no Passo 2 (`vehicle.type = vehicleType`), não no Passo 1 — carrier sem veículo próprio resolvido (caso frota) nunca aparece se o visitante filtrar por tipo de veículo (comportamento aceito, é o mesmo gap já registrado acima)
- Cidade inexistente/`cityId` inválido (usuário adulterando a URL manualmente) — use-case retorna lista vazia, mesmo comportamento do estado "sem resultado", sem erro 500

## Next Steps

Seguir para `plan.md` — ordenar sub-steps (schema/repository → use-case → GraphQL query/type → hooks → UI da rota → ajuste no `RegisterForm`/`CreateShipmentForm` pro prefill).
