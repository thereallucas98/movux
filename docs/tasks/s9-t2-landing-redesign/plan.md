# S9-T2 — Plan

Conteúdo exato de cada seção já está decidido no `research.md` §"Decisão: conteúdo real por seção" — este plano só ordena os sub-steps de execução e aponta os pontos de código que mudam além do copy puro (ícones, `href`s, o ajuste de `RegisterForm`).

## 1. `apps/web/src/app/page.tsx` — maior concentração de conteúdo

- `PARALLAX_BLOCKS` (L31-54): substituir imagens/headings pelo conteúdo real do fluxo (usar imagens de frete/mudança do Unsplash, mesmo padrão de URL já usado)
- `Hero` (L178): novo headline/subheadline (`research.md`), ícones `Hospital`→`Truck`, `HeartPulse`→`ShieldCheck`
- CTA duplo do Hero: `href="/buscar-transportadores"` (cliente) e `href="/register?role=CARRIER"` (transportador) — decisão do `research.md`
- `TrustStrip` (L242-247): array `verticals` → 4 camadas de segurança progressiva
- `ProblemSection` (L285-353): bullets antes/depois reais
- `WorkflowSection` (L364-389): array `steps` → 4 passos do lifecycle real, ícones `CalendarCheck`/`GitBranch` → `PackageCheck`/`MapPin` (ajustar conforme o passo)
- `FinalCta`: replica o mesmo `href` duplo do Hero

## 2. `apps/web/src/app/_landing/landing-hero-preview.tsx`

- `TABS` (L28-48): "Escalas/Solicitações/Notificações/Ponto" → "Fretes/Propostas/Em trânsito/Avaliações"
- `items` do sidebar mock (L120-137) e dados de cada painel (L180-433): trocar nomes/contexto pra frete (ex. "João Pessoa — Mudança residencial" em vez de "Hospital Acme — Centro")

## 3. `apps/web/src/app/_landing/landing-spring-cards.tsx` e `landing-sticky-cards.tsx`

- Arrays `CARDS` de cada arquivo: 6 diferenciais reais / 4 recursos reais (lista fechada no `research.md`)
- Ícones: `Truck`, `ShieldCheck`, `MapPin`, `PackageCheck`, `Star`, `Mail`

## 4. `apps/web/src/app/_landing/landing-roles-accordion.tsx`

- Array `ROLES` (L33-88): 3 roles reais (`CUSTOMER`/`CARRIER`/`ADMIN`) com o conteúdo decidido, ícones `HeartPulse`→`ShieldCheck` (ou similar por role)

## 5. `apps/web/src/app/_landing/landing-faq.tsx`

- Array `FAQ` (L15-40): 6 perguntas reais (lista fechada no `research.md`)

## 6. `apps/web/src/app/_landing/landing-pricing.tsx`

- Array `TIERS` (L26-80): mantém estrutura de 3 cards, copy "em breve"/sem preço fechado, remove qualquer CTA de checkout

## 7. `apps/web/src/components/features/auth/register-form.tsx` (ajuste pequeno, fora de `_landing/`)

```tsx
import { useSearchParams } from 'next/navigation'
// ...
const searchParams = useSearchParams()
const roleFromQuery = searchParams.get('role')
// defaultValues.role usa roleFromQuery === 'CARRIER' ? 'CARRIER' : 'CUSTOMER'
```
Necessário pro CTA `/register?role=CUSTOMER`/`?role=CARRIER` funcionar de fato (hoje o form ignora query string, confirmado no `exploration.md`).

---

## Ordem de execução (sub-steps)

1. `register-form.tsx` — habilita leitura de `role` via query string (pré-requisito pros CTAs funcionarem de ponta a ponta)
2. `page.tsx` — Hero, TrustStrip, ProblemSection, WorkflowSection, PARALLAX_BLOCKS, FinalCta (maior bloco, feito primeiro)
3. `landing-hero-preview.tsx`
4. `landing-spring-cards.tsx`, `landing-sticky-cards.tsx`, `landing-roles-accordion.tsx` (independentes entre si)
5. `landing-faq.tsx`
6. `landing-pricing.tsx`
7. Lint/build + QA manual

## Test Strategy (detalhe)

**UI**: renderização anônima da home mostra 100% do conteúdo novo (nenhum texto/ícone do domínio hospitalar remanescente — grep final por "Hospital"/"plantão"/"escala"/"CLT" antes de fechar); CTAs do Hero/FinalCta levam pro destino certo com `role` pré-selecionado no form de registro (`/buscar-transportadores` só funcional depois que S9-T3 também estiver mergeado — ver risco registrado no `research.md`); usuário logado continua redirecionado; responsivo 375px/720px/1024px/1440px.
