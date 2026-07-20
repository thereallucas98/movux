# S8-T1 — Exploration

## Current code state

- `Shipment` (Prisma, `schema.prisma:611-654`) já tem todos os campos que a
  tela precisa: `status`, `type`, `description`, pesos/volume opcionais,
  `vehicleTypeRequired`, `scheduledDate`, `timeWindow` (+`specificTime`
  condicional), `customerSlaHours`, `suggestedPriceInCents` (calculado pelo
  servidor, nunca digitado pelo customer). `Shipment.customerId` aponta pra
  `CustomerProfile.id`, não `User.id` direto.
- A lógica de criar/listar/ver frete **já existe e já foi validada** nos
  Sprints 0-2 — REST em `app/api/shipments/route.ts` (POST/GET) e
  `[shipmentId]/route.ts` (GET), Zod em `server/schemas/shipment.schema.ts`
  (`CreateShipmentSchema`, `ListShipmentsQuerySchema`), use-cases em
  `server/use-cases/shipments/` (`createShipment`, `listShipmentsForCustomer`,
  `getShipment`). GraphQL não deve reimplementar essa lógica — as mutations
  Pothos chamam os mesmos use-cases, só trocando a camada de transporte
  (mesmo padrão de `me.mutation.ts`, que já chama `ctx.repos.*` + use-case).
- O setup Pothos existe e funciona (`server/graphql/builder.ts`,
  `context.ts`, `schema.ts`), mas **hoje só cobre domínio Turnora**
  (tenant, workspace, shift, schedule, assignment...). `GraphQLContext.repos`
  não tem `shipmentRepo`/`customerProfileRepo`/`pricingRepo` — precisa ser
  adicionado antes de qualquer query/mutation de shipment funcionar.
- **Não existe client GraphQL nenhum no projeto** — sem `codegen` no
  `package.json` (as libs `@graphql-codegen/*` estão instaladas mas não
  wireadas), sem instância de `graphql-request` em lugar nenhum, sem pastas
  `graphql/hooks`/`graphql/operations`. É greenfield, não "adicionar mais
  uma query" — confirma a Decisão #3 do brief (escopo maior).
- As 3 páginas-alvo são stubs de 7 linhas (`<h1>Título</h1><p>Em breve.</p>`)
  — sem fetch, sem componente. `nav-items.ts` já aponta pras rotas certas
  (Dashboard/Meus fretes/Novo frete), nada a mudar ali.
- `QueryProvider` (React Query) já está no `app/layout.tsx` raiz — não
  precisa de setup novo, só usar `useQuery`/`useMutation`.

## Key files (patterns to mirror)

- `server/graphql/queries/me.query.ts` / `mutations/me.mutation.ts` —
  padrão de `builder.queryField`/`mutationField`, checagem de
  `ctx.principal`, chamada de use-case com `ctx.repos.*`. Seguir esse
  formato pra `myShipments`, `shipment(id)`, `createShipment`.
- `server/graphql/errors.ts` — `gqlError`/`gqlErrorFromResult` já existem
  prontos pra mapear os `ErrorCode`s do use-case (`CUSTOMER_PROFILE_NOT_FOUND`,
  `INVALID_ADDRESS`, `NO_PRICING_AVAILABLE` já estão no `CODE_TO_MESSAGE`)
  — só não são usados ainda (`me.mutation.ts` lança `GraphQLError` inline
  em vez de usar o helper). Decisão de Research: usar o helper (mais
  correto) e deixar de exemplo, ou seguir o padrão inline já em produção.
- `server/use-cases/shipments/create-shipment.use-case.ts` — regra de
  negócio completa: resolve `CustomerProfile`, resolve endereço via
  `pricingRepo.resolveNeighborhood`, busca snapshot de preço por corredor
  (`pricingRepo.findSnapshotForCorridor`), soma modifiers,
  `suggestedPriceInCents` sempre calculado — nunca aceitar preço do
  formulário.
- `components/features/nav/sidebar.tsx` + `nav-items.ts` — já prontos,
  nenhuma mudança necessária pro S8-T1.
- `components/features/auth/register-form.tsx` — único exemplo real de
  form no projeto. **Não usa** os primitivos shadcn `Form`/`FormField` de
  `components/ui/form.tsx` (que existem mas estão sem uso) — usa
  `react-hook-form` cru (`register()`) + um componente customizado
  `AuthField`. Decisão de Research: seguir esse padrão por consistência, ou
  usar `Form`/`FormField` de verdade (o form de frete tem array de
  modifiers e mais campos condicionais — pode se beneficiar da ergonomia).
- `components/ui/date-picker.tsx` — usável direto pra `scheduledDate`.
  `components/ui/money-input.tsx` existe mas **não se aplica** aqui —
  `suggestedPriceInCents` é calculado pelo servidor, não digitado.

## Integration points / gaps found

1. **`GraphQLContext.repos` não tem os repos de shipment** — precisa
   adicionar `shipmentRepo`/`customerProfileRepo`/`pricingRepo` em
   `context.ts`, e importar os novos arquivos de enum/type/query/mutation
   em `schema.ts` (import explícito, não é auto-discovery).
2. **Endereço de origem/destino exige `neighborhoodId`/`cityId` (uuid)**,
   não texto livre — o formulário precisa de algum tipo de busca/seleção
   de bairro (`State`/`City`/`Neighborhood`), não um `<input>` simples.
   Isso não estava explícito no brief e é complexidade real de UI —
   Research/Plan precisa decidir a UX (autocomplete? select em cascata?).
3. **Preço depende de já existir snapshot de pricing pro corredor
   escolhido** (`pricingRepo.findSnapshotForCorridor`) — se não existir
   pro par origem/destino + tipo de frete, o use-case falha
   `NO_PRICING_AVAILABLE` só no submit, sem aviso prévio. Decisão de
   Research: aceitar esse comportamento (erro no submit) ou expor alguma
   sinalização antes.
4. **Erro inconsistente no Pothos hoje** (`GraphQLError` inline vs
   `gqlError`/`gqlErrorFromResult` não usados) — decisão de Research, ver
   acima.
5. **Form pattern inconsistente** (raw `register()` vs `Form`/`FormField`
   shadcn não usados) — decisão de Research, ver acima.

## Risks

- Construir a infra de GraphQL client do zero (codegen script,
  `graphql-request` client, convenção de pastas `graphql/hooks`/
  `graphql/operations`) é trabalho real, não incidental — se o Plan
  subestimar isso, o S8-T1 estoura.
- Sem UX de seleção de bairro, o formulário de criação de frete não
  funciona (customer não sabe nem tem como saber um `neighborhoodId`) —
  isso precisa estar resolvido no Plan antes da Execution, não descoberto
  no meio dela.
- Reusar os use-cases REST direto nas mutations GraphQL é o padrão correto
  (use-cases já são desacoplados de HTTP, `me.mutation.ts` confirma o
  precedente) — risco baixo, mas vale QA explícito garantindo que a
  mutation não duplica nem diverge da regra do use-case existente.
