# Task Brief: Taxonomia de Frota — Categoria/Especificação de Veículo com Capacidade Real

**Created**: 2026-07-22
**Status**: Draft
**Complexity**: Complex
**Type**: New Feature (Schema + API + UI)
**Estimated Effort**: 10-14 hours

---

## Feature Overview

### User Story
Como transportador, quero cadastrar meu(s) veículo(s) com informações reais de capacidade (categoria, porte, peso/volume máximo) em vez de escolher só um tipo genérico — e como cliente, quero que o frete registre a exigência real de carga de forma que sirva de base pra um match de verdade (a checagem de elegibilidade em si é uma task separada, S10-T2).

### Problem Statement
Hoje `VehicleType` (`prisma/schema.prisma:52-58`) é um enum achatado de 5 valores (`ANY, MOTORCYCLE, VAN, TRUCK_SMALL, TRUCK_LARGE`) sem nenhuma noção de capacidade real (peso/volume/dimensão). Cada `Vehicle` tem exatamente um `type` — não existe forma de um transportador declarar que atende múltiplos portes. Pior: **não existe nenhum jeito de um transportador cadastrar um veículo hoje** — `VehicleRepository` (`server/repositories/vehicle.repository.ts`) só tem `findActiveTypeByOwnerId` (leitura), não há `create`, nenhuma mutation GraphQL, nenhuma tela; as únicas linhas de `Vehicle` no banco vêm de `prisma/seed/dev-public-search-fixture.ts`. O campo `Shipment.vehicleTypeRequired` é gravado na criação do frete mas nunca lido em nenhum use-case de fila/proposta/matching (só aparece em `create-shipment.use-case.ts` e no resolver de mutation) — hoje é puramente decorativo. Os campos `Shipment.estimatedWeightKg`/`estimatedVolumeM3` já existem no schema mas também nunca são comparados contra capacidade de veículo nenhuma.

### Scope

**In Scope:**
- Taxonomia de categoria de veículo substituindo o enum achatado — decisão de forma exata (quantos níveis, enum vs. tabela, onde vive a capacidade numérica) fica pra `research.md`, mas a direção já definida em chat é: hierárquica (categoria → especificação/porte), não um enum maior, não só números soltos sem categoria
- Capacidade real por especificação (peso máximo, volume máximo) — os pares `estimatedWeightKg`/`estimatedVolumeM3` do `Shipment` já existem e devem passar a ser comparáveis contra a capacidade declarada de uma especificação de veículo
- CRUD de veículo pro transportador — hoje inexistente; nova mutation/tela pra um carrier cadastrar, editar e desativar seu(s) veículo(s) (placa, marca, modelo, ano — campos que já existem em `Vehicle` — mais a nova categoria/especificação)
- Migração dos pontos que hoje leem `VehicleType`/`vehicleTypeRequired` pro modelo novo: `create-shipment-form.tsx` (seleção de exigência do frete), `search-public-carriers.use-case.ts` (filtro da busca pública), `register-form.tsx` (prefill de `vehicleType` vindo da busca pública, S9-T3)
- Seed/dados iniciais da taxonomia (categorias reais de frete/mudança — motos, vans, caminhões por porte — com capacidade de referência por especificação)

**Out of Scope:**
- Algoritmo de match/elegibilidade em si (comparar frota do carrier contra exigência do frete na fila/proposta) — é o objetivo de **S10-T2**, que depende deste task estar pronto primeiro
- Outros filtros de match (distância/raio, nota, disponibilidade, faixa de preço) — também ficam pra S10-T2
- UI de gestão de frota em nível de `Company` (múltiplos veículos sob uma empresa/frota, `Vehicle.companyId` já existe no schema mas não tem tela) — fica como follow-up; esta task cobre só o veículo individual do carrier autônomo (`Vehicle.ownerId`)
- Alteração de precificação (`PricingTemplate`/`CarrierPricingConfig`) por porte de veículo — não pedido, fora de escopo
- Verificação/aprovação de documento de veículo (CRLV) — `crlvUrl`/`crlvApproved` já existem no schema e no fluxo de `CarrierDocument`; esta task não mexe nesse fluxo, só adiciona os campos de categoria/capacidade ao cadastro

---

## Current State

**Key Files:**
- `apps/web/prisma/schema.prisma:52-58` (`enum VehicleType`) — 5 valores achatados, sem capacidade
- `apps/web/prisma/schema.prisma:418-436` (`model Vehicle`) — `type VehicleType`, `plate/brand/model/year`, `crlvUrl/crlvApproved`, `ownerId`/`companyId` (exatamente um dos dois, enforced na camada de use-case)
- `apps/web/prisma/schema.prisma:615-619` (`model Shipment`, campos relevantes) — `type ShipmentType`, `estimatedWeightKg`, `estimatedVolumeM3`, `vehicleTypeRequired VehicleType`
- `apps/web/src/server/repositories/vehicle.repository.ts` — só `findActiveTypeByOwnerId(ownerId)`; **sem create/update/list**
- `apps/web/src/server/use-cases/carriers/search-public-carriers.use-case.ts:57-59` — filtro de busca pública compara `r.vehicleType === input.vehicleType` (igualdade exata de enum)
- `apps/web/src/server/use-cases/shipments/create-shipment.use-case.ts:34,139` — grava `vehicleTypeRequired` no frete, nunca mais lido depois
- `apps/web/src/server/graphql/mutations/shipments.mutation.ts:29,61` — único ponto onde `VehicleTypeEnum` é usado numa mutation (só na criação do frete)
- `apps/web/src/components/features/shipments/create-shipment-form.tsx` — form do cliente que escolhe `vehicleTypeRequired` (select simples do enum)
- `apps/web/src/components/features/auth/register-form.tsx` — lê `vehicleType` da query string (prefill vindo de S9-T3) e reenvia como parte do fluxo de criação de frete pós-cadastro
- `apps/web/prisma/seed/dev-public-search-fixture.ts` — única fonte de linhas de `Vehicle` hoje (fixture de dev, não fluxo real)
- `apps/web/prisma/schema.prisma:372-392` (`model Company`) — já tem `vehicles Vehicle[]`, ou seja, o schema já suporta frota multi-veículo por empresa; não há UI nem use-case pra isso hoje

**Current Behavior:**
`VehicleType` funciona só como um enum de exibição/seleção — usado na criação do frete (exigência do cliente) e no filtro da busca pública (S9-T3), mas nunca cruzado contra nada real de capacidade, e nunca preenchido por um transportador de verdade (só existe via seed).

**Gaps/Issues:**
- Nenhum CRUD de veículo pro carrier — bloqueador raiz; sem isso, qualquer profundidade de dado nunca tem entrada real
- `vehicleTypeRequired` do frete é write-only — não gera nenhuma consequência de elegibilidade
- Nenhuma noção de capacidade real (peso/volume) ligada a um tipo de veículo — `estimatedWeightKg`/`estimatedVolumeM3` do frete não têm contraparte no lado do veículo
- Um carrier só pode ter um `type` de veículo por linha de `Vehicle` — não há problema estrutural em ter múltiplas linhas (um carrier pode ter vários `Vehicle`), mas não há tela pra isso, então na prática nunca acontece

---

## Requirements

### Functional Requirements

**FR1: Taxonomia de categoria/especificação de veículo**
- **Description**: Modelo de dados novo representando categoria de veículo (ex. "Caminhão") e especificação/porte dentro dela (ex. "Caminhão 3/4", "Caminhão Toco", "Caminhão Truck"), cada especificação com capacidade de referência (peso máximo, volume máximo)
- **Trigger**: Seed inicial na migration; consultada por qualquer tela/query que hoje usa `VehicleType`
- **Expected Outcome**: Uma especificação de veículo carrega capacidade numérica real, não só um rótulo
- **Edge Cases**: Migração dos dados existentes (`Vehicle.type`, `Shipment.vehicleTypeRequired` como `VehicleType` hoje) pro modelo novo sem perder histórico — estratégia exata fica pra `research.md`

**FR2: Cadastro de veículo pelo transportador**
- **Description**: Nova mutation GraphQL + tela pro carrier criar/editar/desativar um veículo (placa, marca, modelo, ano, categoria/especificação)
- **Trigger**: Carrier acessa "Meus veículos" (nova rota) e cadastra um veículo
- **Expected Outcome**: Veículo persistido e vinculado ao `ownerId` do carrier logado
- **Edge Cases**: Carrier tenta cadastrar sem verificação aprovada — decisão de bloquear ou permitir (e só liberar depois) fica pra `research.md`; placa duplicada já é `@unique` implícito? (confirmar em `research.md` — hoje `plate` não tem `@unique` no schema, comportamento atual permite duplicata)

**FR3: Exigência do frete comparável com capacidade de veículo**
- **Description**: Cliente continua declarando o que precisa (categoria/porte, mais os já-existentes `estimatedWeightKg`/`estimatedVolumeM3`), mas agora de um jeito que uma futura checagem de elegibilidade (S10-T2) consiga comparar contra a especificação de um veículo real
- **Trigger**: Criação de frete (`create-shipment-form.tsx`)
- **Expected Outcome**: `Shipment` referencia uma especificação da taxonomia nova em vez do enum achatado
- **Edge Cases**: Fretes já existentes com `vehicleTypeRequired` no enum antigo — migração de dados, não quebrar fretes em andamento

**FR4: Migração dos consumidores existentes do enum antigo**
- **Description**: `search-public-carriers.use-case.ts`, `create-shipment-form.tsx`, `register-form.tsx` (prefill S9-T3) passam a usar a taxonomia nova
- **Trigger**: Qualquer leitura/escrita que hoje usa `VehicleType`
- **Expected Outcome**: Nenhuma referência a `VehicleType` sobrevive fora de uma eventual coluna de compatibilidade (se `research.md` decidir manter uma por transição)
- **Edge Cases**: Busca pública (S9-T3) filtra por igualdade exata de enum hoje — vira comparação por categoria/especificação nova, mantendo o mesmo comportamento de busca pro usuário final

---

## Technical Approach

**Chosen Approach:**
A definir em `research.md` — a direção geral (taxonomia hierárquica tipo `SpecialtyGroup`/`SpecialtyItem` do build-track, adaptada pra categoria/especificação de veículo com capacidade numérica) já foi decidida em chat; a forma exata de tabelas, se o enum antigo é removido ou mantido como coluna de compatibilidade, e a estratégia de migração de dados existentes ficam para o Research.

**Alternatives Considered:**
1. **Só enriquecer o enum atual** (mais valores em `VehicleType`, comparar contra `estimatedWeightKg`/`estimatedVolumeM3` com uma tabela de capacidade fixa por valor de enum) — descartado em chat: continua rígido, um veículo só tem 1 tipo, sem representar frota mista
2. **Capacidade contínua sem taxonomia nomeada** (só números, sem categoria) — descartado em chat: perde a UX de "tipo de veículo" que cliente/transportador já usam pra se comunicar

**Rationale:**
Decisão do usuário em chat (2026-07-22): taxonomia hierárquica é a única opção que permite frota mista por transportador e mantém a comunicação por categoria nomeada, além de ser o padrão estrutural já validado no repo-irmão `build-track-api` (`SpecialtyGroup → SpecialtyItem`, many-to-many com o que precisa ser atendido).

---

## Files to Change

### New Files
- [ ] Modelo(s) Prisma novo(s) de taxonomia (nome exato definido em `research.md`)
- [ ] `src/server/graphql/mutations/vehicles.mutation.ts` — criar/editar/desativar veículo
- [ ] `src/server/graphql/queries/vehicles.query.ts` — listar veículos do carrier logado
- [ ] `src/server/use-cases/vehicles/*.use-case.ts` — create/update/deactivate/list
- [ ] `src/components/features/vehicles/*` — tela "Meus veículos" (carrier)
- [ ] `src/graphql/hooks/use-*-vehicle*.ts` — hooks React Query correspondentes

### Modified Files
- [ ] `apps/web/prisma/schema.prisma` — nova taxonomia, `Vehicle` e `Shipment` passam a referenciá-la
- [ ] `src/server/repositories/vehicle.repository.ts` — ganha create/update/list, não só a leitura atual
- [ ] `src/server/use-cases/carriers/search-public-carriers.use-case.ts` — filtro migrado pra taxonomia nova
- [ ] `src/components/features/shipments/create-shipment-form.tsx` — seleção de exigência migrada
- [ ] `src/components/features/auth/register-form.tsx` — prefill migrado
- [ ] `src/server/use-cases/shipments/create-shipment.use-case.ts` — grava a exigência no formato novo

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: Transportador consegue cadastrar, editar e desativar veículo(s) próprio(s) com categoria/especificação e ver a capacidade de referência
- [ ] **AC2**: Criação de frete usa a taxonomia nova pra exigência de veículo, incluindo peso/volume estimado já existentes
- [ ] **AC3**: Busca pública de transportadores (S9-T3) continua filtrando por tipo de veículo, agora contra a taxonomia nova, sem regressão visível pro usuário
- [ ] **AC4**: Nenhuma referência funcional ao `VehicleType` antigo sobrevive fora de uma eventual coluna de compatibilidade explicitamente decidida em `research.md`
- [ ] **AC5**: Seed inclui taxonomia real de categorias/especificações de frete/mudança usável em QA manual

### Should Have (P1)
- [ ] **AC6**: Admin consegue ver a taxonomia (mesmo que só leitura nesta rodada — CRUD de admin da taxonomia em si pode ser follow-up)

### Could Have (P2)
- [ ] **AC7**: Transportador com múltiplos veículos de portes diferentes visível de forma clara na tela "Meus veículos"

---

## Test Strategy

**API endpoints/mutations:**
- Criar veículo — happy path com categoria/especificação válida
- Criar veículo — categoria/especificação inválida → 400
- Criar veículo sem sessão de carrier → 401/403
- Editar/desativar veículo de outro carrier → 403/404
- Frete criado com exigência da taxonomia nova — happy path
- Busca pública filtrando por categoria — resultado equivalente ao comportamento atual

**UI components:**
- Tela "Meus veículos" — lista vazia, lista com 1+ veículo, form de criação/edição
- `create-shipment-form.tsx` — seleção de exigência com o novo componente (Select/Drawer conforme breakpoint, por CLAUDE.md)
- `register-form.tsx` — prefill vindo da busca pública continua funcionando

---

## Dependencies

**Blocks:** S10-T2 (algoritmo de match depende deste modelo de dados existir)
**Blocked By:** None
**Related Work:** S9-T3 (busca pública de transportadores, consumidor do enum atual)
**New Libraries:** None esperado

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migração de dados existentes (`Vehicle.type`, `Shipment.vehicleTypeRequired`) perder informação ou quebrar fretes em andamento | Med | Alto | Estratégia de migração explícita no `research.md`, testada em ambiente local antes de qualquer deploy |
| Escopo inflar pra incluir gestão de frota em nível de `Company` (fora do que foi pedido) | Med | Med | Explicitamente listado em Out of Scope; follow-up separado se pedido depois |
| `plate` sem `@unique` hoje — cadastro novo pode introduzir duplicatas silenciosas | Baixo | Baixo | Decisão de adicionar constraint fica pra `research.md`, tratada como edge case do FR2 |

---

## Complexity Estimate

**Overall**: Complex
- Backend: Complex (nova taxonomia, migration, CRUD novo, 4 pontos de consumo migrados)
- Frontend: Medium (1 tela nova + 2 telas existentes ajustadas)

**Estimated Effort**: 10-14 hours
**Confidence**: Medium — depende das decisões técnicas de `research.md` (forma exata da taxonomia, estratégia de migração)

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-22

- [ ] Requirements clear and complete
- [ ] Technical approach sound
- [ ] Acceptance criteria testable
- [ ] Risks understood

**Notes:** Escopo e direção geral da abordagem técnica decididos em chat (2026-07-22): S10-T1 (este) antes de S10-T2 (algoritmo de match); taxonomia hierárquica como direção, referência estrutural do build-track (`SpecialtyGroup`/`SpecialtyItem`).

---

## References

- **Design**: N/A
- **Related Issues**: `docs/decisions.md` (a registrar como D-010 ao final desta rodada de decisões)
