# S8-T1 — Research

## Decision Log

### Seleção de bairro (origem/destino)

**Decision:** `AdaptiveSelect` (já existe, resolve Select↔Drawer mobile
automaticamente) alimentado por uma nova query GraphQL `neighborhoods` que
retorna a lista completa (hoje 17 linhas, 1 cidade). Sem hardcode de
"João Pessoa" no código — estruturado como cidade→bairro mesmo que hoje só
exista uma cidade.

**Reason:** a API só resolve bairro por id (`resolveNeighborhood`), sem
busca por nome — precisa de alguma forma de listagem. Com 17 linhas, um
select simples cobre o caso real sem esforço de autocomplete/debounce que
não tem dado pra justificar hoje.

### Padrão de erro nas novas queries/mutations GraphQL

**Decision:** usar `gqlError`/`gqlErrorFromResult` (`server/graphql/errors.ts`),
não repetir o `GraphQLError` inline de `me.mutation.ts`.

**Reason:** o helper já existe, já mapeia os códigos certos
(`CUSTOMER_PROFILE_NOT_FOUND`, `INVALID_ADDRESS`, `NO_PRICING_AVAILABLE`) e
é menos código que escrever cada throw na mão. Não mexe em `me.mutation.ts`
— fora de escopo desta task.

### Padrão de formulário

**Decision:** shadcn `Form`/`FormField` (`components/ui/form.tsx`), não o
`register()` cru de `register-form.tsx`.

**Reason:** o form de frete tem campo condicional (`specificTime` só se
`timeWindow === 'SPECIFIC'`) — `FormField` + `form.watch()` lida melhor com
isso que wiring manual. Primeiro uso real de um primitivo já instalado.

### Preço indisponível no corredor (`NO_PRICING_AVAILABLE`)

**Decision:** erro no submit, mensagem específica ("Ainda não temos preço
configurado para esse trajeto — tente outro bairro ou fale com o
suporte."), sem pré-checagem.

**Reason:** segue o padrão já estabelecido no CLAUDE.md (erro esperado →
exibir na UI, não pré-validar). Pré-checagem exigiria uma query nova e
orquestração extra sem pedido explícito de UX melhor.

### Modifiers no formulário v1

**Decision:** fora de escopo — formulário sempre envia `modifiers: []`.

**Reason:** não mencionado no brief (Telas/Acceptance Criteria), e expor
os 6 adicionais exigiria multi-select + quantidade por item, aumentando a
superfície do form e do QA desta task sem pedido explícito. Fica como
task futura isolada (ex.: `S8-T1c`, a avaliar).

## Technical Analysis

**Repositório de geografia (novo, mínimo):** `pricingRepository` só resolve
bairro por id — listagem é responsabilidade diferente (não é sobre preço).
Segue o padrão SRP já usado no projeto (`shipment.repository.ts`,
`pricing.repository.ts`, `proposal.repository.ts` são todos escopados por
domínio):
```ts
export interface GeographyRepository {
  listNeighborhoods(): Promise<
    Array<{ id: string; name: string; cityId: string; cityName: string; stateUf: string }>
  >
}
```

**GraphQL novo (conceitual — arquivos exatos ficam pro Plan):**
- `neighborhoods` query — qualquer principal autenticado (não exclusivo de
  CUSTOMER, dado não é sensível), chama `ctx.repos.geographyRepo.listNeighborhoods()`.
- `myShipments` query — exige `principal.role === 'CUSTOMER'`, resolve
  `CustomerProfile` via `customerProfileRepo.findByUserId`, depois
  `shipmentRepo.listForCustomer(...)` — mesma paginação por cursor da REST
  (`status?`, `cursor?`, `limit?`).
- `shipment(id)` query — mesmo padrão, `shipmentRepo.findByIdForOwner`.
- `createShipment` mutation — input Pothos espelhando `CreateShipmentSchema`
  (sem `modifiers`, ver decisão acima), chama o use-case `createShipment`
  existente com `ctx.repos.*`, mapeia falha com `gqlErrorFromResult`.
- `GraphQLContext.repos` (`context.ts`) ganha `shipmentRepo`,
  `customerProfileRepo`, `pricingRepo`, `geographyRepo`.

**Client GraphQL (greenfield, decisão #3/#4 do brief):**
- `pnpm codegen` — adicionar script em `apps/web/package.json` usando
  `@graphql-codegen/cli` (já instalado); schema apontando pro módulo Pothos
  local (`server/graphql/schema.ts`), documentos em
  `src/graphql/operations/**/*.graphql`.
- `~/lib/graphql-client.ts` (novo) — instância fina de `graphql-request`
  `GraphQLClient` apontando pra `/api/graphql`, `credentials: 'include'`
  (auth por cookie de sessão, mesma origem — sem token bearer).
- `src/graphql/operations/shipment/*.graphql` — documentos das 4
  operações acima.
- `src/graphql/hooks/` — wrappers `useQuery`/`useMutation` (React Query)
  em cima dos documentos tipados gerados.

**Reuso do schema Zod no client:** `CreateShipmentSchema`
(`server/schemas/shipment.schema.ts`) não importa nada server-only (só
`zod` + schemas irmãos) — dá pra importar direto no client component pro
`zodResolver`, sem duplicar. Confirmar no Plan que isso não puxa nenhum
import transitivo de Prisma antes de decidir definitivamente; se puxar,
duplicar uma versão client-only reduzida (sem `modifiers`, ver decisão).

## Edge Cases

| Case | Behavior |
|---|---|
| Customer sem `CustomerProfile` ainda (não deveria acontecer pós-registro, mas o use-case já trata) | `CUSTOMER_PROFILE_NOT_FOUND` → mensagem genérica de erro, não deveria ocorrer no fluxo normal |
| `origin.neighborhoodId` ou `destination.neighborhoodId` não resolvem cluster | `INVALID_ADDRESS` → erro no submit |
| Corredor sem pricing snapshot | `NO_PRICING_AVAILABLE` → mensagem específica (decisão acima) |
| `timeWindow = SPECIFIC` sem `specificTime` | bloqueado no client (Zod `.refine`, mesmo do schema server) antes de chamar a mutation |
| Lista de fretes vazia (customer novo) | `EmptyState` com CTA "Criar meu primeiro frete" |
| Erro de rede/servidor inesperado (não um `ErrorCode` conhecido) | toast genérico via `QueryProvider`'s `MutationCache` (já configurado) |
| `neighborhoods` query falha ou demora | `AdaptiveSelect` mostra skeleton/disabled até resolver; formulário não deixa submeter sem bairro selecionado (Zod required) |

## Blockers

✅ Sem blockers — as 5 decisões fechadas em chat.

## Next Steps

1. Escrever `plan.md` + `todo.md` (Phase 3) — quebrar em sub-steps
   ordenados: (1) repos + context wiring, (2) schema Pothos (enums/types/
   queries/mutations), (3) infra client (codegen, graphql-client, operations),
   (4) hooks, (5) telas (dashboard/lista/form), (6) QA roteiro.
