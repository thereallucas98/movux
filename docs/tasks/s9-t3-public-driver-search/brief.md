# Task Brief: Busca Pública de Transportadores + Continuidade pro Cadastro

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Medium
**Type**: New Feature (API + UI)
**Estimated Effort**: 6-8 hours

---

## Feature Overview

### User Story
Como visitante anônimo (sem conta) interessado em contratar um frete/mudança, quero buscar transportadores disponíveis numa cidade sem precisar me cadastrar antes, pra decidir se vale a pena criar conta — e, ao decidir, quero que o cadastro já venha com o contexto da minha busca (cidade, tipo de veículo) em vez de recomeçar do zero.

### Problem Statement
Hoje toda busca de transportador (`browse-shipments`, S8-T2) exige conta de carrier logado e é o carrier buscando fretes — não existe o caminho inverso (visitante buscando transportadores). Não há rota pública nenhuma no domínio de negócio; toda rota sob `/customer`, `/carrier`, `/admin` exige sessão (confirmado pelo padrão de `getServerPrincipal`/redirect usado em todas as páginas de app). O pedido do usuário é uma rota pública nova que mostra transportadores (dado anonimizado, decisão já tomada em chat) e, ao clicar em cadastrar, leva pro registro com o contexto da busca aplicado.

### Scope

**In Scope:**
- Rota pública `/buscar-transportadores` (sem `getServerPrincipal`/redirect — acessível sem sessão), com busca por cidade (obrigatório) e filtro opcional de tipo de veículo (`VehicleType`)
- Resultado: lista de transportadores **anonimizados** — primeiro nome, tipo de veículo, rating médio (`CarrierProfile.avgRating`), total de fretes concluídos (`CarrierProfile.totalShipments`) — sem foto, telefone, CPF ou qualquer documento
- Fonte dos dados: apenas carriers com `verificationStatus = 'APPROVED'`, `isActive = true`, `isFlagged = false`, que tenham ao menos 1 `Proposal` com `status = 'ACCEPTED'` ligada a um `Shipment` cuja cidade de origem bate com a cidade buscada (não existe campo de cidade direto em `CarrierProfile`/`Vehicle` hoje — inferência via histórico de fretes atendidos, sem migration nova)
- Estado vazio (nenhum carrier encontrado pra cidade/filtro): mensagem + CTA de cadastro mesmo assim (não é um beco sem saída)
- CTA "Quero contratar" em cada resultado (ou no estado vazio) leva pro registro com prefill simples via query string: `/register?role=CUSTOMER&cityId=<id>&vehicleType=<type>`
- `RegisterForm` (ou a página de registro) lê `cityId`/`vehicleType` da query string e, após cadastro bem-sucedido de um `CUSTOMER`, redireciona pra `/customer/shipments/new?cityId=<id>&vehicleTypeRequired=<type>` em vez do dashboard genérico — `CreateShipmentForm` já aceita `origin.cityId`/`vehicleTypeRequired` como campos do form (`create-shipment-form.tsx:47-56`), só falta ler os query params iniciais
- Nova query GraphQL pública (sem exigir `ctx.principal`) ou rota REST pública em `app/api/` — decisão de qual camada usar fica pro `research.md` (o domínio de shipment/carrier já migrou pra GraphQL no Sprint 8, mas esta é a primeira rota **pública** de qualquer camada; padrão de auth precisa ser revisitado, não é reaproveitável 1:1 dos resolvers existentes que sempre assumem `ctx.principal`)

**Out of Scope:**
- Persistência de lead (`PublicSearchLead` ou equivalente) — decisão já tomada em chat: prefill simples via query param, sem nova tabela nem token assinado/JWT
- Busca por bairro/geolocalização precisa (raio em km, mapa) — só cidade nesta rodada; `NeighborhoodCluster`/`City` já existem no schema, mas granularidade de bairro fica pra follow-up se pedido
- Qualquer dado de contato direto do carrier (telefone, chat) — nunca exposto sem conta, mesmo depois desta task
- Rate limiting/anti-scraping dedicado — rota pública de leitura, mesmo nível de exposição que a landing; hardening de abuso fica como risco registrado (ver Risks), não implementado nesta rodada
- Cadastro de carrier a partir dessa rota (o fluxo é sempre "visitante busca carrier → quer contratar → vira customer") — se visitante quiser virar carrier, usa o CTA já existente da landing, sem prefill de cidade (make sense: carrier não "busca a si mesmo")

---

## Current State

**Key Files:**
- `apps/web/src/server/use-cases/shipments/browse-open-shipments.use-case.ts` + `browse-shipments.query.ts` — padrão de query GraphQL de listagem mais próximo, mas assume `ctx.principal.role === 'CARRIER'` — não reaproveitável direto, serve de referência estrutural
- `apps/web/prisma/schema.prisma:345-366` (`CarrierProfile`) — tem `avgRating`, `totalShipments`, `verificationStatus`, `isActive`, `isFlagged`; **não tem campo de cidade**
- `apps/web/prisma/schema.prisma:417-434` (`Vehicle`) — tem `type` (`VehicleType`), ligado a `ownerId`/`companyId`; **não tem campo de cidade**
- `apps/web/prisma/schema.prisma:217-259` (`State`/`City`/`Neighborhood`/`NeighborhoodCluster`) — geografia só aparece ligada a `Shipment` (origem/destino) e `PricingTemplate`, não a carrier diretamente
- `apps/web/src/components/features/shipments/create-shipment-form.tsx:47,56` — `defaultValues` já tem `cityId`/`vehicleTypeRequired`, prontos pra receber prefill
- `apps/web/src/components/features/auth/register-form.tsx` — form atual só lê/seta `role` (`CUSTOMER`/`CARRIER`); não lê query string hoje
- `apps/web/src/app/(auth)/register/page.tsx` — Server Component, só faz `getServerPrincipal` + redirect se já logado; sem leitura de `searchParams` hoje

**Current Behavior:**
Não existe nenhuma rota pública de busca de carrier. Todo acesso a dado de carrier (perfil, documentos, propostas) exige sessão de customer/carrier/admin.

**Gaps/Issues:**
- **Carrier não tem cidade própria no schema** — a única forma de inferir "carrier atende a cidade X" é via histórico de `Proposal.status='ACCEPTED'` → `Shipment.origin` (join, sem migration), o que significa que um carrier recém-verificado sem nenhum frete concluído nunca aparece na busca pública, mesmo estando ativo. Isso é uma limitação aceita nesta rodada (ver Risks) — resolver com um campo de "cidade de atuação" declarado no cadastro é um follow-up de escopo maior (mudaria o form de onboarding de carrier), não desta task
- Nenhuma rota hoje (GraphQL ou REST) é pública — todo padrão de resolver/rota assume principal autenticado; a primeira implementação pública precisa decidir explicitamente o que impedir (nenhum dado de PII, nenhuma mutation, só leitura agregada) — tratado como decisão de `research.md`, não um risco de segurança não endereçado

---

## Requirements

### Functional Requirements

**FR1: Busca pública por cidade**
- **Description**: Página pública com campo de busca de cidade (autocomplete, reaproveitando o padrão já usado em `create-shipment-form.tsx` pra bairro/cidade) + filtro opcional de tipo de veículo
- **Trigger**: Visitante acessa `/buscar-transportadores` e submete uma cidade
- **Expected Outcome**: Lista de transportadores anonimizados que atenderam fretes naquela cidade
- **Edge Cases**: Cidade sem nenhum carrier com histórico → estado vazio com CTA de cadastro (não erro)

**FR2: Card de transportador anonimizado**
- **Description**: Card com primeiro nome, tipo de veículo, rating médio (ou "—" se nulo, mesmo tratamento do S8-T7), total de fretes concluídos
- **Trigger**: Resultado de busca com ao menos 1 carrier
- **Expected Outcome**: Nenhum dado de PII (foto/telefone/CPF/documento) exposto
- **Edge Cases**: `avgRating` nulo (carrier sem review ainda, mas com frete concluído) → "—"

**FR3: CTA prefila cadastro**
- **Description**: Botão "Quero contratar" em cada card (e no estado vazio) linka pra `/register?role=CUSTOMER&cityId=<id>&vehicleType=<type>`
- **Trigger**: Clique no CTA
- **Expected Outcome**: Página de registro abre com `role=CUSTOMER` já selecionado (reaproveita o toggle existente do `RegisterForm`)
- **Edge Cases**: Visitante sem JS ou removendo query params manualmente → registro funciona normalmente sem prefill (grau de degradação aceitável, não é uma falha)

**FR4: Cadastro → criação de frete prefilada**
- **Description**: Após `RegisterForm` completar o cadastro de um `CUSTOMER` que chegou com `cityId`/`vehicleType` na URL, o redirect pós-cadastro vai pra `/customer/shipments/new?cityId=<id>&vehicleTypeRequired=<type>` em vez de `/customer/dashboard`
- **Trigger**: Cadastro bem-sucedido com os query params presentes
- **Expected Outcome**: `CreateShipmentForm` já abre com origem/tipo de veículo pré-preenchidos, reduzindo fricção do primeiro pedido
- **Edge Cases**: Cadastro sem os query params (fluxo normal, não veio da busca) → redirect continua pro dashboard, comportamento atual preservado

---

## Technical Approach

**Chosen Approach:**
Nova query GraphQL pública `publicCarrierSearch(cityId, vehicleType)` — resolver que **não lê `ctx.principal`** (primeira exceção explícita ao padrão atual), retornando um tipo novo e enxuto (`PublicCarrierResult`: firstName, vehicleType, avgRating, totalShipments — nunca o tipo `Carrier`/`User` completo, pra impedir vazamento futuro de campo por engano). Use-case novo (`search-public-carriers.use-case.ts`) faz o join `CarrierProfile` → `Proposal(status=ACCEPTED)` → `Shipment(origin.cityId)`, filtra `verificationStatus/isActive/isFlagged`, agrupa por carrier (distinct), mapeia só os 4 campos permitidos antes de retornar — nunca serializa o model Prisma completo. Rota `/buscar-transportadores` como Server Component simples (sem `getServerPrincipal`) + client component de formulário/lista.

**Alternatives Considered:**
1. **REST em vez de GraphQL** (`app/api/public/carriers/route.ts`) — considerado; GraphQL foi escolhido pra manter consistência com D-004 (Sprint 8 já migrou o domínio de shipment/carrier pra GraphQL) e reaproveitar o React Query hook pattern já estabelecido
2. **Adicionar campo de cidade direto em `CarrierProfile`** (migration nova) — descartado nesta rodada; muda o fluxo de onboarding de carrier (pede decisão de produto sobre quando/como o carrier declara área de atuação, fora do escopo pedido) — a inferência via histórico de proposta aceita resolve o pedido atual sem tocar em onboarding
3. **Expor a query existente `browseOpenShipments` sem autenticação** — descartado; ela lista *fretes*, não *carriers*, e vazaria dados de shipment (que pertence ao customer) pra visitante anônimo — direção errada de dado

**Rationale:**
Resolve o pedido (busca pública + prefill) sem tocar em onboarding de carrier nem introduzir uma tabela de lead nova, mantendo o princípio de "nenhum dado de PII sai sem conta" com um tipo de retorno propositalmente restrito (não é filtro de campo na hora de serializar — é um tipo GraphQL que fisicamente não tem os campos sensíveis).

---

## Files to Change

### New Files
- [ ] `apps/web/src/app/(public)/buscar-transportadores/page.tsx` (ou path equivalente decidido no `plan.md`) — rota pública
- [ ] `apps/web/src/components/features/public-search/carrier-search-form.tsx` — form de busca (cidade + veículo)
- [ ] `apps/web/src/components/features/public-search/carrier-search-results.tsx` — lista de cards anonimizados
- [ ] `apps/web/src/server/use-cases/carriers/search-public-carriers.use-case.ts`
- [ ] `apps/web/src/server/graphql/queries/public-carrier-search.query.ts`
- [ ] `apps/web/src/server/graphql/types/public-carrier-result.type.ts`
- [ ] `apps/web/src/graphql/operations/carriers/public-carrier-search.graphql`
- [ ] `apps/web/src/graphql/hooks/use-public-carrier-search.ts`

### Modified Files
- [ ] `apps/web/src/server/repositories/proposal.repository.ts` (ou `shipment.repository.ts`) — método novo de busca agregada por cidade
- [ ] `apps/web/src/app/(auth)/register/page.tsx` — leitura de `searchParams` (`cityId`, `vehicleType`) repassada pro form
- [ ] `apps/web/src/components/features/auth/register-form.tsx` — recebe `cityId`/`vehicleType` opcionais, redirect condicional pós-cadastro
- [ ] `apps/web/src/app/_landing/*` — CTA da landing pode linkar pra `/buscar-transportadores` (ajuste de copy, não estrutural — coordenar com `s9-t2-landing-redesign`)

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/buscar-transportadores` acessível sem sessão (cookie removido/aba anônima)
- [ ] **AC2**: Busca por cidade retorna só carriers `APPROVED`+`isActive`+`!isFlagged` com histórico de frete concluído naquela cidade
- [ ] **AC3**: Nenhum campo de PII (foto, telefone, CPF, documento, sobrenome completo, email) aparece na resposta da query nem no HTML renderizado
- [ ] **AC4**: CTA de resultado/estado-vazio leva pro registro com `role=CUSTOMER` pré-selecionado
- [ ] **AC5**: Cadastro completado com `cityId`/`vehicleType` na URL redireciona pra criação de frete prefilada; sem esses params, redireciona pro dashboard (comportamento atual preservado)
- [ ] **AC6**: `pnpm lint`/`pnpm build` passam

### Should Have (P1)
- [ ] **AC7**: Estado vazio (cidade sem carrier) mostra CTA de cadastro, não uma tela sem saída
- [ ] **AC8**: Responsivo 375px/1024px/1440px

---

## Test Strategy

**GraphQL:**
- Cidade com carriers elegíveis → retorna lista anonimizada correta
- Cidade sem nenhum carrier → lista vazia, sem erro
- Carrier com `isFlagged=true` ou `verificationStatus != APPROVED` → nunca aparece, mesmo com histórico de frete na cidade
- Inspeção do payload de resposta → confirmar ausência física de campos de PII no schema (não só na UI)

**UI:**
- Acesso sem cookie de sessão não redireciona (diferente de toda outra rota do app)
- Fluxo completo: busca → resultado → CTA → registro prefilado → criação de frete prefilada
- Fluxo sem prefill (registro direto, sem vir da busca) continua igual ao atual

**Segurança:**
- Confirmar que a query pública não expõe nenhum resolver de campo sensível por herança acidental de tipo (o `PublicCarrierResult` deve ser um tipo Pothos próprio, não uma view parcial do tipo `Carrier` existente)

---

## Dependencies

**Blocks:** Nenhum
**Blocked By:** Nenhum (independente de S9-T1/S9-T2, ainda que a landing possa linkar pra cá)
**Related Work:** `docs/tasks/s9-t2-landing-redesign/` (CTA de linkagem), `docs/tasks/s8-t7-metrics-dashboard/` (tratamento de rating nulo reaproveitado)
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Carrier verificado sem nenhum frete concluído nunca aparece na busca (inferência via histórico) | Alta (todo carrier novo começa assim) | Médio | Aceito nesta rodada — resolver exigiria campo de "cidade de atuação" no onboarding, escopo maior; registrar como follow-up em `validation.md` quando a task fechar |
| Rota pública sem rate limiting vira alvo de scraping de rating/volume de carrier por cidade | Média | Baixo | Aceito nesta rodada (mesmo nível de exposição da landing, que já é pública); sem PII exposta, o dado agregado tem baixo valor de abuso — rate limiting fica como follow-up se abuso for observado |
| Novo padrão de resolver "sem principal" ser copiado por engano pra rotas que deveriam continuar autenticadas | Baixa | Alto | Nome do use-case/query explicitamente prefixado `public*`, revisão de PR deve checar que nenhum outro resolver remove a checagem de `ctx.principal` sem justificativa |

---

## Complexity Estimate

**Overall**: Medium
- Backend: Medium (1 use-case novo com join por relação, 1 query GraphQL pública — primeiro precedente de rota sem auth no projeto)
- Frontend: Medium (1 rota nova + form + lista + ajuste no fluxo de registro)

**Estimated Effort**: 6-8 hours
**Confidence**: Média (a inferência de cidade via histórico de proposta é um padrão de query novo, não validado antes neste projeto)

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Decisões batidas em chat: dado público = perfil anonimizado (não agregado-só, não diretório completo); continuidade pro cadastro = prefill via query param, sem lead persistido nem JWT.

---

## References

- `docs/BUSINESS-FOUNDATION.md` — camadas de segurança/verificação citadas no card de resultado
- `docs/tasks/s8-t7-metrics-dashboard/` — tratamento de rating nulo (`"—"`) reaproveitado
- `apps/web/prisma/schema.prisma:345-366,417-434,217-259` — modelos consultados (`CarrierProfile`, `Vehicle`, geografia)
