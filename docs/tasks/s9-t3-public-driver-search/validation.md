# S9-T3 — Validation

**Status:** ✅ concluído — com ressalvas de débito pré-existente e limitações de escopo aceitas (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `publicCarrierSearch` sem cookie de sessão | Funciona sem autenticação | ✅ testado via `curl` sem cookie |
| 2 | `publicCarrierSearch` com `cityId` inexistente | `[]`, sem erro | ✅ |
| 3 | `publicCarrierSearch` com cidade real, mas nenhum carrier `APPROVED` | `[]` (11 candidatos por histórico, todos `PENDING`/flagged/inativos) | ✅ confirma filtro de elegibilidade funcionando |
| 4 | `publicCarrierSearch` com 1 carrier aprovado manualmente (teste, revertido depois) | Retorna anonimizado: `firstName`, `vehicleType: null` (sem veículo próprio), `avgRating: null` (sem review), `totalShipments: 1` | ✅ end-to-end confirmado, dado revertido após o teste |
| 5 | `publicCities` | Retorna cidades cadastradas (João Pessoa) | ✅ |
| 6 | `/buscar-transportadores` sem cookie | 200, sem redirect | ✅ |
| 7 | `/register?role=CARRIER` | Campo telefone aparece (confirma prefill de role) | ✅ |
| 8 | `favicon`/rotas gerais | 200 | ✅ |
| 9 | `pnpm lint` escopo desta task | 0 erros/warnings novos | ✅ |
| 10 | `pnpm codegen` (2x, após `publicCarrierSearch` e depois `publicCities`) | Sem erro | ✅ confirma schema GraphQL/tipos sintaticamente corretos |

**Não testado** (exige sessão de customer autenticado, não coberto por `curl`): prefill de `vehicleTypeRequired` em `/customer/shipments/new` a partir do redirect pós-cadastro. Revisado por leitura de código (`create-shipment-form.tsx`), não por execução.

## Typecheck / Lint / Build

- **Lint isolado dos arquivos desta task**: limpo.
- **`pnpm lint`/`pnpm build` (projeto inteiro)**: **não passam** — débito pré-existente do domínio Turnora, ver [D-006](../../decisions.md). Nenhum arquivo desse débito foi tocado nesta task.

## Desvios encontrados durante execução

- **Path de relação mais longo que o brief original**: `CarrierProfile.userId → Proposal.carrierId → Shipment.addresses[type=ORIGIN].cityId`, não um `Shipment.origin` direto (corrigido no `exploration.md`).
- **Split em 3 métodos**, não 1: `proposal.repository.ts.findDistinctCarrierIdsAcceptedInCity` + `carrier-profile.repository.ts.findEligiblePublicProfiles` + novo `vehicle.repository.ts.findActiveTypeByOwnerId` — mais granular que o único método `findPublicSearchResults` do `plan.md` inicial.
- **`CarrierProfile.totalShipments` é campo morto** (nunca atualizado, sempre 0, comentário confirmado em `shipment.repository.ts:365`) — `totalShipments` do resultado público vem de `shipmentRepo.countByCarrier`, não do campo do profile.
- **`publicCities` (repositório + query GraphQL nova)** não estava no `plan.md` original — necessário porque não existia nenhuma forma pública de listar cidades pro formulário de busca.
- **Prefill de `cityId` em `create-shipment-form.tsx` não é viável** como o brief supunha — a tela escolhe endereço por bairro (`NeighborhoodSelectField`), não tem campo de cidade solto; só `vehicleTypeRequired` é prefilado de fato.
- **Tipo de veículo do card** só é resolvido pro caso autônomo (`Vehicle.ownerId = userId`); carrier vinculado a uma `Company` (frota) mostra "—" — limitação de escopo aceita, documentada no `research.md`.

## Acceptance criteria (brief.md)

- [x] AC1: `/buscar-transportadores` acessível sem sessão
- [x] AC2: busca retorna só carriers elegíveis (`APPROVED`+`isActive`+`!isFlagged`+histórico na cidade)
- [x] AC3: nenhum campo de PII no payload nem no HTML (tipo `PublicCarrierResult` fisicamente só tem 4 campos)
- [x] AC4: CTA leva pro registro com `role=CUSTOMER` pré-selecionado
- [x] AC5: cadastro com `cityId`/`vehicleType` redireciona pra criação de frete (com a limitação de prefill documentada acima); sem esses params, comportamento atual preservado
- [x] AC6: `pnpm lint`/`pnpm build` — ver ressalva (débito pré-existente)
- [x] AC7: estado vazio com CTA de cadastro
- [x] AC8: responsivo confirmado

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build`/`pnpm lint` completos quebrados | Débito pré-existente do domínio Turnora, ver [D-006](../../decisions.md). |
| Carrier sem histórico de frete nunca aparece na busca | Aceito no `research.md` — resolver exigiria campo de "cidade de atuação" no onboarding de carrier, escopo maior, fora desta rodada. |
| Tipo de veículo de carrier vinculado a empresa (frota) | Mostra "—" — resolver exigiria decidir qual veículo da frota exibir num card anonimizado, ambiguidade não resolvida nesta rodada. |
| Prefill de `cityId` na criação de frete | Não implementado (só `vehicleTypeRequired`) — a tela de criação de frete escolhe endereço por bairro, não por cidade solta; revisar se um campo de cidade direto for adicionado no futuro. |
