# S8-T1 — Validation

**Status:** ✅ concluído — com ressalvas de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `/customer/dashboard` logado, sem fretes | Atalho "Criar frete" + "Nenhum frete ainda" | ✅ |
| 2 | `/customer/shipments` sem fretes | `EmptyState` com CTA "Criar meu primeiro frete" | ✅ |
| 3 | Criar frete com CEP real (58010-000, Varadouro/JP) | Rua e bairro preenchidos automaticamente via ViaCEP | ✅ |
| 4 | Criar frete com CEP real (58037-000, Manaíra/JP) | Idem, segundo bairro diferente | ✅ |
| 5 | Submit com formulário completo | Redireciona pra `/customer/shipments`, frete aparece com status `Rascunho` e preço calculado | ✅ (testado 2x) |
| 6 | Submit com campos vazios | Erros em tempo real por campo, botão "Criar frete" desabilitado | ✅ |
| 7 | Preencher todos os campos | Erros somem, botão habilita | ✅ |
| 8 | Peso/Volume com vírgula decimal (`12,5`) | `type="number"` descartava o valor sem avisar (bug real encontrado) | ✅ corrigido → seleção de faixas |
| 9 | Data agendada, fuso -03:00 | Selecionar 17/07 salvava/exibia como 16/07 (bug real, off-by-one) | ✅ corrigido |
| 10 | Mensagens de validação do Zod | Saíam em inglês (bug real, viola regra de UI em PT-BR) | ✅ corrigido (`z.locales.pt()`) |
| 11 | Autofill de CEP limpando erro visual | Campo ficava com borda vermelha mesmo com valor válido (bug real) | ✅ corrigido (`shouldValidate: true`) |
| 12 | Auth GraphQL (`me`, `myShipments` etc.) | Sempre `UNAUTHENTICATED` mesmo logado (bug real, pré-existente, quebrava GraphQL inteiro) | ✅ corrigido (`context.ts`: `isActive` → `deletedAt`) |
| 13 | Responsivo 375px (mobile) | Bottom sheet no calendário, cards na lista, tab bar inferior, sem scroll horizontal | ✅ |
| 14 | Responsivo desktop (1280px) | Modal centralizado no calendário, tabela na lista | ✅ |
| 15 | Console do navegador | Sem erros do app (só ruído de extensão do Chrome) | ✅ |

## Typecheck / Lint / Build

- **Lint isolado aos arquivos do S8-T1**: limpo (0 erros/warnings), rodado arquivo por arquivo.
- **`pnpm typecheck` isolado**: limpo nos arquivos do S8-T1.
- **`pnpm lint` / `pnpm build` (projeto inteiro)**: **não passam** — bloqueados por débito pré-existente da migração Turnora→Movux (múltiplos repositórios com `Property 'x' does not exist on type 'DbClient'`, e `workspace/select/route.ts` importando um export que não existe). Confirmado via `git diff` que nenhum desses arquivos foi tocado nesta task. Investigado: não é fix simples — o domínio `workspace` inteiro está quebrado, escopo de uma migração separada.

## Desvios encontrados durante execução

Esta task teve bem mais desvios que o normal porque o QA foi feito ao vivo, testando no navegador de verdade — vários bugs só apareceram nesse processo, não no plan original:

1. **Bug de auth pré-existente desbloqueado**: `context.ts` selecionava `isActive` (campo removido do model `User` na migração) e o Prisma lançava erro, capturado silenciosamente pelo `catch` → `principal: null` sempre. Corrigido pra `deletedAt`, mesmo padrão do `getPrincipal` REST. Sem isso, GraphQL não funcionava pra ninguém, não só pro S8-T1.
2. **Peso/Volume viraram seleção de faixas** em vez de número livre (decisão original do brief) — `type="number"` rejeita vírgula BR e descarta o valor sem avisar; decisão tomada em chat durante a QA.
3. **Calendário reconstruído do zero** — a primeira versão (baseada no `Calendar`/react-day-picker existente) não ficou no padrão visual esperado; pesquisei os componentes `Dialog`/`Sheet`/`AdaptiveDialog` já existentes em 3 projetos irmãos (copa-bolao, financial-driver, turnora) e reconstruí usando `date-fns` puro + o `AdaptiveDialog` que já existia no scaffold do Movux (nunca tinha sido usado).
4. **Paleta de cores do design system trocada** de verde (`#1F6F43`) para roxo (`#4C33CC`) — pedido explícito do usuário, fora do escopo do S8-T1, atualizado em `globals.css` e `docs/DESIGN-SYSTEM.md`.
5. **Seed de geografia expandido** de 17 para os 64 bairros oficiais de João Pessoa — pedido explícito, necessário pro autofill de CEP funcionar com endereços reais.
6. **CEP com máscara** — conectado o `CepInput` que já existia em `masked-input.tsx`, sem uso até então.

Nenhum desvio de arquitetura da Research original (GraphQL + `graphql-request` + React Query seguiu como decidido).

## Acceptance criteria (brief.md)

- [x] Customer logado vê `/customer/dashboard` com atalho de criar frete
- [x] `/customer/shipments` lista os fretes do customer autenticado (vazio → empty state; com dados → cards mobile / tabela desktop)
- [x] `/customer/shipments/new` cria um frete válido e redireciona
- [x] Formulário valida campos obrigatórios com Zod + react-hook-form, mostra erro de campo
- [x] Erro de rede/servidor mostrado sem quebrar a tela (toast global do `QueryProvider`)
- [x] Responsivo: 375px e desktop confirmados; 720px/1024px/1440px não testados individualmente (ver Follow-ups)
- [ ] `pnpm lint` e `pnpm build` passam — **não no projeto inteiro** (débito pré-existente não relacionado); passam no escopo isolado do S8-T1

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build` quebrado | `workspace/select/route.ts` + `workspaceMembershipRepository` — domínio Turnora não migrado. Bloqueia o build de produção do app inteiro, não só do S8-T1. Precisa de uma task própria. |
| Breakpoints 720px/1024px/1440px | Só 375px e desktop (1280px) foram testados visualmente nesta rodada. |
| Classificação dos bairros novos no seed | 47 dos 64 bairros de João Pessoa foram classificados (UPSCALE/MIDDLE/POPULAR) por conhecimento geográfico geral, não dado oficial de zoneamento — revisar se algum preço de corredor parecer estranho. |
| Modifiers no formulário | Fora do v1 por decisão da Research — formulário sempre envia `modifiers: []`. |
| Página de detalhe do frete | Não construída nesta task (fora do escopo do brief) — fica pra S8-T1b ou task futura. |
| `timeWindow = SPECIFIC` sem `specificTime` | Comportamento implementado (bloqueio client-side via Zod `.refine`) mas não exercitado manualmente nesta rodada de QA. |
