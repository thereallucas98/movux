# TODO: S9-T2 — Landing Pública (Reescrita de Conteúdo)

**Date**: 2026-07-21
**Phase**: EXECUTION
**Status**: IN_PROGRESS

---

## Implementation Checklist

### Step 1: Pré-requisito de infraestrutura

- [x] **1.1** `register-form.tsx` — lê `role` (e também `cityId`/`vehicleType`, antecipado do S9-T3) via `useSearchParams`

### Step 2: `page.tsx` (Hero, TrustStrip, ProblemSection, WorkflowSection, PARALLAX_BLOCKS, FinalCta)

- [x] **2.1** `PARALLAX_BLOCKS` — conteúdo real
- [x] **2.2** `Hero` — headline/subheadline/ícones/CTA duplo (`/buscar-transportadores` + `/register?role=CARRIER`)
- [x] **2.3** `TrustStrip` — 4 camadas de segurança progressiva
- [x] **2.4** `ProblemSection` — bullets antes/depois
- [x] **2.5** `WorkflowSection` — 4 passos do lifecycle real
- [x] **2.6** `FinalCta` — CTA duplo replicado
- [x] **2.7** Correção de execução: cores hardcoded verde/azul (`rgba(31,111,67,...)`, `rgba(37,99,235,...)`, resíduo do tema Turnora) trocadas por `color-mix(in srgb, var(--brand-base|--yellow-base) X%, transparent)` — sem hex novo solto, só tokens já mapeados

### Step 3: `landing-hero-preview.tsx`

- [x] **3.1** Tabs (Fretes/Propostas/Em trânsito/Avaliações), sidebar mock e 4 painéis — domínio frete; mesma correção de cor hardcoded aplicada

### Step 4: Cards de diferenciais

- [x] **4.1** `landing-spring-cards.tsx` — array `CARDS` (6 diferenciais) + correção de cor hardcoded
- [x] **4.2** `landing-sticky-cards.tsx` — array `CARDS` (4 recursos)
- [x] **4.3** `landing-roles-accordion.tsx` — array `ROLES` (`CUSTOMER`/`CARRIER`/`ADMIN`)

### Step 5: FAQ e Pricing

- [x] **5.1** `landing-faq.tsx` — 6 perguntas reais
- [x] **5.2** `landing-pricing.tsx` — 3 cards (Cliente/Autônomo/Frota), sem preço fechado nem CTA de checkout, sem inventar números do Sprint 7 (que ainda não existe)

### Step 7: Correções e adições pós-feedback visual (usuário, em chat)

- [x] **7.1** `landing-text-parallax.tsx` — véu escuro do `StickyImage` estava hardcoded em `rgba(18, 75, 43, ...)` (verde do Turnora, comentário enganoso dizia "uses brand-dark"); trocado por `color-mix(in srgb, var(--brand-dark) X%, transparent)`
- [x] **7.2** `landing-testimonials.tsx` (novo) — carrossel infinito de depoimentos (3 fileiras, `framer-motion`), adaptado de referência fornecida pelo usuário; imagens reais de frete/mudança buscadas e confirmadas visualmente (Unsplash), depoimentos mistos (cliente sobre transportador + transportador sobre a plataforma); inserido logo após o `Hero`, antes do `TrustStrip`
- [x] **7.3** `landing-faq.tsx` — texto da pergunta ganha efeito de gradiente (`bg-clip-text` + `color: transparent` no estado aberto), adaptado de referência fornecida pelo usuário; resto do componente (`useMeasure`, altura animada, chevron) mantido como estava
- [x] **7.4** `landing-pricing.tsx` — reescrito com estilo neubrutalista (sombra sólida `boxShadow` no card em destaque, badge "Mais comum" flutuando na borda) e checklist ✓/✗ por item (`CheckCircle2`/`XSquare` do `lucide-react`, sem lib nova), adaptado de referência fornecida pelo usuário. Toggle mensal/anual do exemplo **não** implementado — Movux não tem preço pago real ainda (Sprint 7), então não haveria o que alternar; manteria a mesma decisão do `research.md` de não inventar número de billing

### Step 6: Validation

- [x] **6.1** `pnpm lint` no escopo desta task — 0 erros/warnings novos (confirmado via diff antes/depois; ~249 erros pré-existentes no domínio Turnora/workspace continuam, não relacionados ao Sprint 9)
- [ ] **6.2** `pnpm build` — bloqueado por bug pré-existente não relacionado (`app/api/workspace/select/route.ts` importa `setWorkspaceCookie`, que não existe) — reportado na QA, não corrigido (fora do escopo do Sprint 9)
- [x] **6.3** Grep de confirmação — nenhum resquício de "Hospital"/"plantão"/"escala"/"CLT"/"workspace"/"coordenador"/"colaborador"
- [x] **6.3b** Correção pós-feedback visual (usuário, em chat): badges nunca quebram texto internamente (`whitespace-nowrap` em todo pill: `BrandTag`/`StatusPill`/kind-badge da proposta/"Mais comum"/"em breve"), cards do mock de fretes reestruturados pra layout empilhado (título em linha própria, badge+preço em linha própria) em vez de `flex justify-between` espremido, títulos de frete encurtados, tom `open` (quase invisível) trocado por `done` visível. Confirmado visualmente em 1440px e 375px via browser
- [x] **6.4** QA manual no navegador — feito (ver notas acima); splash confirmada rodando (mark fade+scale sobre `bg-brand-base`), favicon confirmado (`image/svg+xml`), CTAs e prefill de role confirmados
- [ ] **6.5** `validation.md` registrado após aprovação do QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1 | ⬜ | |
| 2.1–2.6 | ⬜ | |
| 3.1 | ⬜ | |
| 4.1–4.3 | ⬜ | |
| 5.1–5.2 | ⬜ | |
| 6.1–6.5 | ⬜ | |
