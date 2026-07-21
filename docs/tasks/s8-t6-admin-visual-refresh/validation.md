# S8-T6 — Validation

**Status:** ✅ concluído — com ressalvas de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | `/admin/verifications` — filtro "Pendentes" | Cards com ícone circular por tipo de documento | ✅ (CPF/azul, CNH frente/roxo) |
| 2 | `/admin/verifications` — filtro "Aprovados" | Idem, mais tipos visíveis | ✅ (CPF, CNH frente, CNH verso, Selfie, Comprovante de endereço — cada um com cor distinta) |
| 3 | `/admin/verifications` — filtro "Rejeitados" | Idem + motivo de rejeição exibido | ✅ |
| 4 | `/admin/dashboard` | Reflete o mesmo visual automaticamente (reaproveita `DocumentList`) | ✅ sem trabalho extra |
| 5 | Ação "Checagem externa" (dialog) | Abre normalmente, sem regressão | ✅ |
| 6 | Filtro por status (`AdaptiveSelect`) | Continua funcionando, sem alteração de comportamento | ✅ |
| 7 | Responsivo 375px | Cards em coluna única, bottom tab bar, sem scroll horizontal | ✅ |
| 8 | Responsivo desktop (1280px) | Sidebar, grid de cards | ✅ |
| 9 | Console do navegador | Sem erros do app (1 hydration warning é o mesmo falso-positivo de extensão do Chrome já documentado no S8-T4 — `cz-shortcut-listen`) | ✅ |

**Cobertura de tipos**: 5 dos 7 `CarrierDocumentType` têm dado de teste real (CPF, CNH_FRONT, CNH_BACK, SELFIE, ADDRESS_PROOF). `CNPJ` e `SOCIAL_CONTRACT` não têm documento de teste no banco atual, mas o mapeamento é um `Record<CarrierDocumentType, ...>` exaustivo — `tsc` não compila se faltar uma chave, então os 2 tipos restantes estão cobertos por construção, só não foram vistos visualmente.

## Typecheck / Lint / Build

- **Lint isolado** (`document-type-icon.tsx`, `document-card.tsx`): limpo (0 erros/warnings).
- **`pnpm typecheck` isolado**: sem erros.
- **`pnpm lint` / `pnpm build` (projeto inteiro)**: **não passam** — mesmo débito pré-existente já registrado no S8-T1/S8-T4/S8-T5 (migração Turnora→Movux incompleta, `workspace/select/route.ts`). Nenhum arquivo desse débito foi tocado nesta task.

## Desvios encontrados durante execução

Nenhum. Task pequena, escopo aditivo puro (1 componente novo + 1 header modificado), sem tocar em mutations/dialogs/lógica de negócio. QA não encontrou nenhum bug.

## Acceptance criteria (brief.md)

- [x] AC1: `/admin/verifications` mostra ícone por tipo de documento em cada card
- [x] AC2: `/admin/dashboard` reflete o mesmo visual automaticamente
- [x] AC3: `pnpm lint`/`pnpm typecheck` passam no escopo isolado
- [x] AC4: Responsivo confirmado em 375px e desktop
- [x] AC5: Nenhuma regressão nas ações existentes

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build` quebrado | Mesmo débito pré-existente já registrado no S8-T1/S8-T4/S8-T5 (`workspace/select/route.ts` + domínio Turnora não migrado). |
| `CNPJ`/`SOCIAL_CONTRACT` sem verificação visual | Cobertos por tipagem exaustiva, não vistos na tela por falta de dado de teste — revisar visualmente se/quando um carrier PJ passar pelo fluxo real. |
| Sprint 8 (UI) | Com S8-T6, as 3 rodadas mapeadas do redesign visual (customer, carrier, admin) estão concluídas — `docs/design-references-notes.md` fica como referência pra qualquer tela nova que entrar depois. |
