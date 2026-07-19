# S1-T4 — Plan

## Filtro de `cityId` — decisão

`Shipment` não tem `cityId` direto (só os endereços têm). Filtro por cidade = `cityId` do endereço `ORIGIN` (onde o frete começa — o que importa pro carrier avaliar se vale a pena pegar).

## Redação de endereço — via `select` do Prisma, não pós-processamento

O método do repositório já retorna só os campos redigidos (`type`, `neighborhoodName`, `cityId`, `state`) via `select` na relação `addresses` — não existe um passo de "remover campos sensíveis" que possa ser esquecido depois; o dado sensível nunca sai do banco pra essa query.

## Arquivos

### `server/repositories/shipment.repository.ts` — método novo

```ts
listOpenForBrowse(filter: { cityId?: string; type?: ShipmentType; cursor?: string; limit?: number }):
  Promise<{ data: BrowseShipmentItem[]; nextCursor: string | null }>
```

`BrowseShipmentItem` = campos do frete (sem `finalPriceInCents`, sem nada de `customerId` cru) + `addresses: { type, neighborhoodName, cityId, state }[]`.

### `server/schemas/shipment.schema.ts` — schema novo

`BrowseShipmentsQuerySchema`: `cityId?` (`z.uuid()`), `type?` (enum), `cursor?`, `limit?`

### `server/use-cases/shipments/browse-open-shipments.use-case.ts` — novo

Fino — só repassa o filtro pro repositório (não precisa de `customerProfileRepo`; browse é aberto a qualquer `CARRIER` autenticado, sem checar `carrierProfile`).

### Rota

```
app/api/shipments/browse/route.ts — GET
```

Auth: `getPrincipal` → 401 se ausente; `principal.role !== 'CARRIER'` → 403 (`errorResponse('FORBIDDEN')`).

Next.js resolve `/api/shipments/browse` (segmento estático) antes de `/api/shipments/[shipmentId]` (dinâmico) — sem conflito de rota.

### Swagger

Adiciona ao `lib/swagger/definitions/shipments.ts` existente (mesmo arquivo, endpoint novo).

## Ordem de execução

1. `shipmentRepository.listOpenForBrowse`
2. `BrowseShipmentsQuerySchema`
3. `browseOpenShipments` use-case
4. Registrar no barrel `use-cases/index.ts`
5. `app/api/shipments/browse/route.ts`
6. Swagger (endpoint novo no arquivo existente)
7. Insomnia — adicionar request no `s1-shipment-api.json` existente
8. QA via curl (roteiro no `qa-roteiro.md`)
