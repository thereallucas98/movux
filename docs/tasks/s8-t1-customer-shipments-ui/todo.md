# S8-T1 — Todo

- [x] `server/repositories/geography.repository.ts` (novo)
- [x] Registrar `geographyRepository` em `server/repositories/index.ts`
- [x] `GraphQLContext.repos` (`context.ts`) — `shipmentRepo`, `customerProfileRepo`, `pricingRepo`, `geographyRepo`
- [x] `server/graphql/enums/shipment.enum.ts` (novo)
- [x] `server/graphql/types/neighborhood.type.ts` (novo)
- [x] `server/graphql/types/shipment.type.ts` (novo)
- [x] `server/graphql/queries/neighborhoods.query.ts` (novo)
- [x] `server/graphql/queries/shipments.query.ts` (novo) — `myShipments` + `shipment`
- [x] `UNAUTHENTICATED` em `server/graphql/errors.ts` — já existia, nada a fazer
- [x] `server/graphql/mutations/shipments.mutation.ts` (novo) — `createShipment`
- [x] Wiring em `server/graphql/schema.ts` (enum → types → queries → mutation)
- [x] `apps/web/scripts/export-graphql-schema.ts` (novo)
- [x] `apps/web/codegen.ts` (novo)
- [x] Script `codegen` em `apps/web/package.json` (+ `@graphql-codegen/typed-document-node` e `@graphql-typed-document-node/core` adicionados como devDependency — necessários pra documentos executáveis, não só tipos, e pra resolução de tipos do pnpm)
- [x] `lib/graphql-client.ts` (novo) — + `getGraphQLErrorCode` helper, URL absoluta (graphql-request v7 rejeita path relativo)
- [x] `graphql/operations/shipments/*.graphql` (4 arquivos)
- [x] `pnpm codegen` — com `enumsAsTypes: true` (combina com o padrão `z.enum([...])` do resto do projeto, em vez de TS `enum`)
- [x] `graphql/hooks/*.ts` (4 hooks) — generics explícitos em `graphqlClient.request<T,V>()` (inferência automática falhou)
- [x] `components/features/shipments/*` — badge, lista (mobile cards/desktop table), form
- [x] `lib/format-price.ts`, `lib/via-cep.ts` (já existia, conectado ao form), `lib/zod-locale.ts` (novo)
- [x] 3 páginas (`dashboard`, `shipments`, `shipments/new`)
- [x] `components/ui/adaptive-date-picker.tsx` (novo) — calendário custom (não é wrapper do react-day-picker), usa `components/ui/adaptive-dialog.tsx` (já existia no scaffold, nunca tinha sido usado)
- [x] `components/ui/masked-input.tsx` — `CepInput` conectado (máscara `00000-000`)
- [x] `prisma/seed/geography.ts` — expandido de 17 para os 64 bairros oficiais de João Pessoa (mesmos 5 clusters de pricing)
- [x] Correção de bug pré-existente fora do escopo original: `context.ts` selecionava `isActive` (campo que não existe mais no model `User`) — GraphQL inteiro ficava sempre `UNAUTHENTICATED`; trocado por `deletedAt` (mesmo padrão do REST)

## Correções feitas durante a QA (não previstas no plan)

- [x] Peso/Volume: `type="number"` rejeitava vírgula decimal (BR) e descartava o valor sem avisar — trocado por seleção de faixas (`AdaptiveSelect`)
- [x] CEP: sem máscara — conectado `CepInput` existente
- [x] Calendário: reconstruído do zero (spacing/grid maiores, modal largo, cores da marca) — ver decisão de paleta abaixo
- [x] Data agendada: `toISOString()` no submit causava off-by-one em fusos negativos — trocado por formatação local; exibição na lista também corrigida (`formatInTimeZone` UTC em vez de local)
- [x] Mensagens de validação do Zod saíam em inglês — `z.config(z.locales.pt())` aplicado globalmente
- [x] Botão "Criar frete" não desabilitava com form inválido — `mode: 'onChange'` + `form.trigger()` no mount
- [x] `form.setValue()` do autofill de CEP não limpava erro visual — faltava `{ shouldValidate: true }`
- [x] **Paleta de cores do design system trocada de verde para roxo** (`globals.css` + `docs/DESIGN-SYSTEM.md` atualizados) — decisão do usuário, fora do escopo original do S8-T1, afeta o app inteiro

## QA manual local (passo a passo, com o usuário)

- [x] `docker compose up -d movux-postgres`, `pnpm db:generate`, dev server (`pnpm dev`, porta 3001)
- [x] Login como customer (registrado `s8t1.qa@cliente.dev` via `/register`)
- [x] `/customer/dashboard` mostra atalho de criar frete + últimos fretes
- [x] `/customer/shipments` com lista vazia → `EmptyState` com CTA (testado antes de criar o 1º frete)
- [x] Criar frete em `/customer/shipments/new` com dado válido → sucesso, aparece na lista (2x, incluindo CEP autofill real)
- [x] Validação de campo obrigatório vazio → erro em tempo real, botão desabilitado
- [ ] Corredor sem pricing (não teve CEP de teste que caísse nesse caso — comportamento coberto no research, não exercitado ao vivo)
- [ ] `timeWindow = SPECIFIC` sem `specificTime` — não testado explicitamente nesta rodada
- [x] Responsivo: 375px (mobile, bottom sheet) e desktop confirmados; 720/1024/1440px não testados individualmente
- [ ] `pnpm lint` — não passa (débito pré-existente da migração Turnora→Movux, não relacionado ao S8-T1; escopo isolado confirmado limpo via lint por arquivo)
- [ ] `pnpm build` — não passa (`workspace/select/route.ts`, mesmo débito pré-existente, não relacionado)
