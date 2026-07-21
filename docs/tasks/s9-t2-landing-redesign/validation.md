# S9-T2 — Validation

**Status:** ✅ concluído — com ressalva de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Grep por domínio antigo (`Hospital`/`plantão`/`escala`/`CLT`/`workspace`/`coordenador`/`colaborador`) | Zero ocorrências em `page.tsx`/`_landing/*` | ✅ |
| 2 | Hero — headline/subheadline/CTA duplo | "Chama um Movux." + CTAs "Buscar transportadores"/"Sou transportador" | ✅ confirmado visualmente |
| 3 | CTA "Buscar transportadores" | Leva pra `/buscar-transportadores` | ✅ (rota existe, S9-T3) |
| 4 | CTA "Sou transportador" | Leva pro registro com `role=CARRIER` pré-selecionado | ✅ (campo "Telefone" aparece, confirmando prefill) |
| 5 | Mock interativo (Fretes/Propostas/Em trânsito/Avaliações) | 4 tabs navegáveis, conteúdo de domínio frete | ✅ testado clicando nas 4 |
| 6 | TrustStrip, ProblemSection, WorkflowSection, RolesAccordion, FAQ, Pricing | Conteúdo real do domínio, sem resíduo | ✅ |
| 7 | Usuário logado acessando `/` | Redireciona pro dashboard do role | ✅ comportamento preservado (não alterado) |
| 8 | Responsivo 375px/1440px | Sem overflow horizontal, sem quebra visual | ✅ |
| 9 | `pnpm lint` escopo desta task | 0 erros/warnings novos | ✅ |

### Correção pós-feedback visual (usuário, em chat durante a QA)

| Problema encontrado | Correção |
|---|---|
| Cards do mock de fretes: título + badge + preço espremidos numa linha só, badge quebrando (`Em trânsito` virando 2 linhas dentro do próprio pill) | Layout empilhado (título em linha própria, badge+preço em linha própria abaixo); títulos encurtados |
| Badge "Mais comum" (pricing) quebrando em 2 linhas dentro do pill quando o nome do plano é longo | Header do card vira `flex-wrap` — badge desce inteiro pra linha própria em vez de quebrar internamente |
| Badge "em breve" (features do pricing) "sobrando" à esquerda quando a linha quebrava | Reestruturado pra sempre ficar numa segunda linha indentada, deliberada — nunca um wrap acidental |
| Tom `open` do `StatusPill` (cinza quase invisível, badge "Entregue" parecia texto sem estilo) | Renomeado pra `done`, cor com contraste visível |
| Regra geral aplicada | `whitespace-nowrap` em todo pill/badge da landing — nenhum texto de badge quebra internamente nunca mais |

Confirmado novamente em 1440px e 375px após a correção.

### Segunda rodada de feedback visual (usuário, em chat)

| Item | Ação |
|---|---|
| Véu do parallax (`landing-text-parallax.tsx`) com tom verde, não roxo | Bug real: `rgba(18, 75, 43, ...)` hardcoded (resíduo Turnora) com comentário enganoso "uses brand-dark" — corrigido pra `color-mix(...var(--brand-dark)...)`. Confirmado visualmente (véu agora roxo). |
| Novo bloco de depoimentos (`landing-testimonials.tsx`) | Carrossel infinito de 3 fileiras, logo após o Hero — adaptado de referência do usuário (`framer-motion` em vez do `motion/react` do exemplo, já é dependência do projeto). Imagens buscadas no Unsplash e confirmadas visualmente uma a uma antes de usar (evitar imagem genérica/errada). Depoimentos mistos: cliente avaliando transportador + transportador avaliando a plataforma, conforme pedido ("misturando com avaliações de fretistas"). |
| FAQ com texto em gradiente | Adicionado `bg-clip-text` + toggle `color: transparent`/`var(--gray-800)` no título da pergunta ao abrir/fechar — resto do componente inalterado, sem nova dependência de ícone. |

Confirmado visualmente (carrossel rolando, imagens corretas, gradiente aparecendo na pergunta aberta).

### Terceira rodada — pricing neubrutalista (usuário, em chat)

| Item | Ação |
|---|---|
| Pricing reescrito com card neubrutalista (sombra sólida `boxShadow`, borda 2px no destaque) + checklist ✓/✗ por item | Adaptado de referência do usuário (`NeuPricing`); ícones `CheckCircle2`/`XSquare` do `lucide-react` (já dependência), sem lib nova. Confirmado visualmente — badge "Mais comum" não quebra linha (regressão do fix anterior evitada), ícone `XSquare` renderiza corretamente. |
| Toggle mensal/anual do exemplo | Deliberadamente **não** implementado — Movux não tem plano pago real (Sprint 7 ainda não existe); um toggle sem nada real pra alternar seria enganoso, mesma lógica já registrada no `research.md` sobre não inventar número de billing. |

## Typecheck / Lint / Build

- **Lint isolado dos arquivos desta task**: limpo.
- **`pnpm lint`/`pnpm build` (projeto inteiro)**: **não passam** — débito pré-existente do domínio Turnora, ver [D-006](../../decisions.md). Nenhum arquivo desse débito foi tocado nesta task.

## Desvios encontrados durante execução

- `page.tsx` tinha mais conteúdo inline (`TrustStrip`, `ProblemSection`, `WorkflowSection` como seções completas, não só os 8 arquivos de `_landing/`) do que o `brief.md` original supunha — sem impacto no esforço estimado, só na distribuição do trabalho entre arquivos.
- Cores hardcoded verde/azul (`rgba(31,111,67,...)`, `rgba(37,99,235,...)`, resíduo do tema Turnora) substituídas por `color-mix(in srgb, var(--brand-base|--yellow-base) X%, transparent)` em `page.tsx` e `landing-hero-preview.tsx`/`landing-spring-cards.tsx` — não estava explicitamente no plano original mas é consequência direta da decisão de "só tokens já mapeados" do `research.md`.

## Acceptance criteria (brief.md)

- [x] AC1: nenhum texto/ícone do domínio hospitalar remanescente
- [x] AC2: Hero com CTA duplo funcional
- [x] AC3: seção de segurança progressiva presente
- [x] AC4: `Logo iconOnly` no header
- [x] AC5: `pnpm lint`/`pnpm build` — ver ressalva (débito pré-existente)
- [x] AC6: responsivo confirmado
- [x] AC7: usuário logado continua redirecionado

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build`/`pnpm lint` completos quebrados | Débito pré-existente do domínio Turnora, ver [D-006](../../decisions.md). |
| Landing pricing | Copy de "em breve" sem preço fechado — revisar quando Sprint 7 (Billing) definir os planos reais. |
