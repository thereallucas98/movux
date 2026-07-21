# Task Brief: Marca — Mark Oficial, Favicon e Splash Screen Animada

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Simple
**Type**: UI Change
**Estimated Effort**: 2-3 hours

---

## Feature Overview

### User Story
Como usuário abrindo o Movux (web), quero ver a marca oficial (mark roxo/amarelo) no ícone da aba do navegador e uma tela de abertura animada com a marca, em vez do favicon padrão do Next.js e de um "flash" direto pro conteúdo — pra transmitir identidade de produto desde o primeiro instante.

### Problem Statement
O projeto usa "Movux" só como texto (`Logo`, `components/ui/logo.tsx:9-17`) — não existe favicon próprio (nenhum arquivo `favicon.ico`/`icon.*` em `apps/web/src/app/` ou `apps/web/public/`, confirmado por busca) e não existe nenhuma tela de splash. O usuário forneceu os assets oficiais da marca (`~/Downloads/Splash/Logotipo.svg` — mark isolado; `Loading.svg` + 4 PNGs — referência de splash mobile) e pediu que a marca substitua "tudo que tiver como logo" e que a abertura do app ganhe uma splash animada.

### Scope

**In Scope:**
- Favicon oficial via convenção nativa do Next.js App Router (`apps/web/src/app/icon.svg`), usando o mark de `Logotipo.svg`
- `Logo` (`components/ui/logo.tsx`) ganha variante com o mark (ícone), implementando o prop `iconOnly` já reservado na interface (hoje sem efeito, comentário "Reserved for parity with template callers")
- Todo lugar que hoje renderiza `<Logo />` continua funcionando sem alteração de import (mesma API pública do componente) — o app shell (sidebar/nav autenticado), páginas de auth e a landing passam a mostrar o mark junto ou no lugar do texto, conforme cada contexto de layout já usa
- Splash screen animada: overlay full-screen client-side sobre `bg-brand-base` (`#4C33CC`) com o mark entrando por fade+scale a partir do centro (padrão observado nos PNGs de referência — canvas vazio → mark em tamanho final), usando `framer-motion` (já é dependência, `apps/web/package.json:69`)
- Splash aparece uma vez por sessão de navegador (gate via `sessionStorage`), não a cada navegação client-side entre rotas
- Duração curta (~800ms-1.2s) — não bloqueia indefinidamente nem em conexão lenta (timeout de segurança que segue pro conteúdo mesmo se a animação não puder rodar)

**Out of Scope:**
- Ícones de PWA/manifest.json completo (192x192, 512x512, maskable) — não pedido; se o Movux virar PWA instalável, entra como task própria
- Splash nativa de app mobile (o app é web-only hoje, `docs/BUSINESS-FOUNDATION.md` não lista app nativo no roadmap atual) — os assets de referência são mobile (viewBox 375×812) mas a splash implementada aqui é a versão web/first-load
- Wordmark de texto customizado (fonte especial pro "Movux") — o SVG fornecido (`Logotipo.svg`) não contém texto, só o mark; o texto continua sendo a tipografia já definida (`font-sans`/Inter)
- Open Graph image (`opengraph-image`) — não pedido nesta rodada

---

## Current State

**Key Files:**
- `apps/web/src/components/ui/logo.tsx:4-18` — `Logo` é `<div>` com texto "Movux", prop `iconOnly?: boolean` já na interface mas não implementado
- `apps/web/src/app/layout.tsx` — `RootLayout`, sem `<html><head>` customizado além de `metadata` (title/description), ponto de montagem natural pro overlay de splash (envolvendo `{children}`)
- Nenhum arquivo de favicon existe hoje — confirmado (`find apps/web/src/app apps/web/public -iname "*favicon*" -o -iname "*icon*"` retorna vazio); navegador usa favicon padrão do Next.js
- `apps/web/public/` só tem SVGs de template do Next (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — nenhum asset de marca

**Current Behavior:**
Aba do navegador mostra o ícone padrão do Next.js/nenhum ícone customizado. Ao carregar o app, o conteúdo aparece direto, sem transição/splash.

**Gaps/Issues:**
- `Logo` não tem nenhuma forma de renderizar um ícone — precisa de um componente de mark novo (SVG inline) antes de o prop `iconOnly` fazer sentido
- O amarelo do mark fornecido (`#FFBE00`) não bate exatamente com o token categórico já mapeado (`--yellow-base: #FFC042`, `DESIGN-SYSTEM.md` §1.4) — decisão tomada abaixo (Technical Approach)

---

## Requirements

### Functional Requirements

**FR1: Favicon oficial**
- **Description**: Aba do navegador mostra o mark oficial (asa roxa/amarela) em vez do ícone padrão do Next.js
- **Trigger**: Qualquer carregamento de página do app
- **Expected Outcome**: `apps/web/src/app/icon.svg` presente, servido automaticamente pela convenção de metadata do Next.js App Router — sem precisar tocar em `layout.tsx`
- **Edge Cases**: Navegadores sem suporte a favicon SVG (raro, Safari antigo) — aceitável, Next.js já lida com fallback de metadata

**FR2: Mark reutilizável no componente `Logo`**
- **Description**: `Logo` ganha uma sub-parte de ícone (SVG do mark inline, não `<img>`, pra herdar `currentColor`/permitir animação futura) renderizada quando `iconOnly` for `true`; quando `false` (default atual), mantém o texto "Movux" — decisão de exibir ícone+texto junto ou só texto em cada tela específica fica pro `plan.md` (varia por contexto: sidebar compacta vs. header de auth vs. landing)
- **Trigger**: Uso de `<Logo iconOnly />` em qualquer lugar do app
- **Expected Outcome**: Mark renderizado com as cores oficiais (outline branco + preenchimento amarelo), escalável via `className` (`size-*` do Tailwind), sem perda de nitidez (SVG, não raster)
- **Edge Cases**: Fundo escuro vs. claro — o outline branco do mark pressupõe fundo roxo/escuro; em fundo claro (ex. header de auth com `--surface-bg`), decidir contorno/cor de fallback é detalhe de implementação do `plan.md`

**FR3: Splash screen animada no boot**
- **Description**: Ao primeiro carregamento da sessão do navegador, um overlay full-screen `bg-brand-base` com o mark centralizado aparece, anima (fade+scale) e desaparece, revelando o conteúdo normal do app
- **Trigger**: Primeiro mount do `RootLayout` na sessão do navegador (sem entrada em `sessionStorage`)
- **Expected Outcome**: Overlay visível por ~800ms-1.2s, depois fade-out revelando a página; navegações subsequentes (SPA) e novas abas na mesma sessão não repetem a splash
- **Edge Cases**: JS desabilitado/erro no client component — o conteúdo do app (Server Components) já está no DOM por baixo do overlay, então falha do splash não bloqueia acesso ao conteúdo; usuário voltando depois de fechar o navegador (nova sessão) vê a splash de novo — comportamento esperado, não um bug

---

## Technical Approach

**Chosen Approach:**
- Favicon: `apps/web/src/app/icon.svg` com o conteúdo de `Logotipo.svg` (paths ajustados pro viewBox de ícone padrão) — convenção nativa do Next 16 App Router, resolvida em build time, sem código de runtime
- Mark: novo componente `MovuxMark` (SVG inline com os 2 paths do `Logotipo.svg`) em `components/ui/logo.tsx`, consumido por `Logo` quando `iconOnly`
- Cor do amarelo: usar o token já existente `--yellow-base` (`#FFC042`) em vez do hex solto `#FFBE00` do arquivo original — mantém consistência com `DESIGN-SYSTEM.md`, diferença visual imperceptível (~1% de luminância)
- Splash: componente client `AppSplashScreen` (novo, em `components/features/splash/`) montado em `layout.tsx` envolvendo `{children}`; usa `useState` + `useEffect` pra checar `sessionStorage.getItem('movux:splash-seen')`, anima com `framer-motion` (`AnimatePresence` + `motion.div`, mesmo padrão de easing já usado em `motion-section.tsx:27`), seta a flag no fim da animação

**Alternatives Considered:**
1. **Ícones PNG multi-tamanho + `<link rel="icon">` manual no `<head>`** — descartado; a convenção `app/icon.svg` do Next.js já resolve isso automaticamente e o asset fornecido é vetorial, sem motivo pra rasterizar
2. **Splash via CSS puro (sem framer-motion)** — descartado; o projeto já paga o custo de bundle do `framer-motion` (usado na landing), reutilizar é mais simples que reimplementar keyframes CSS equivalentes
3. **Splash em toda navegação (sem gate de sessão)** — descartado; splash repetida a cada troca de rota é intrusiva e não é o padrão do app (SPA client-side routing), machuca UX no fluxo já autenticado

**Rationale:**
Menor mudança possível que resolve os 3 sintomas (favicon ausente, `Logo` só-texto, sem splash) reaproveitando 100% de dependências e convenções já existentes no projeto — nenhuma lib nova, nenhuma migration, sem risco de regressão em outras telas (o texto "Movux" continua o default do `Logo`).

---

## Files to Change

### New Files
- [ ] `apps/web/src/app/icon.svg` — favicon (mark oficial)
- [ ] `apps/web/src/components/features/splash/app-splash-screen.tsx` — overlay animado + gate de sessão

### Modified Files
- [ ] `apps/web/src/components/ui/logo.tsx` — adiciona `MovuxMark` (SVG inline) e implementa o prop `iconOnly`
- [ ] `apps/web/src/app/layout.tsx` — monta `<AppSplashScreen>` envolvendo `{children}`

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: Aba do navegador mostra o mark oficial em qualquer rota do app (favicon)
- [ ] **AC2**: `<Logo iconOnly />` renderiza o mark com as cores corretas (outline branco, preenchimento `--yellow-base`)
- [ ] **AC3**: Primeiro carregamento da sessão mostra a splash animada (`bg-brand-base` + mark + fade/scale) antes do conteúdo
- [ ] **AC4**: Navegação subsequente (troca de rota client-side, nova aba na mesma sessão) NÃO repete a splash
- [ ] **AC5**: `pnpm lint` e `pnpm build` passam sem warnings/erros

### Should Have (P1)
- [ ] **AC6**: Splash tem timeout de segurança (ex. 2s) que revela o conteúdo mesmo se a animação falhar/travar
- [ ] **AC7**: Splash testada em viewport mobile (375px) e desktop (1440px) sem overflow/scroll horizontal

---

## Test Strategy

**UI components:**
- `MovuxMark`/`Logo iconOnly`: renderiza em fundo escuro (sidebar) e fundo claro (header de auth), sem quebra visual
- `AppSplashScreen`: primeira visita (sessionStorage limpo) mostra overlay; segunda navegação na mesma aba não mostra; nova aba com sessionStorage compartilhado (mesma origem) não repete (comportamento correto de `sessionStorage`, escopado por aba — vale confirmar na QA se o esperado é por aba ou por sessão de browser, já que `sessionStorage` é per-tab)
- Favicon: inspeção visual da aba em Chrome e Safari

---

## Dependencies

**Blocks:** Nenhum
**Blocked By:** Nenhum
**Related Work:** `docs/tasks/s9-t2-landing-redesign/` (landing consome `<Logo iconOnly />` no header) — não bloqueante, pode ser feito em paralelo
**New Libraries:** None (`framer-motion` já instalado)

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `sessionStorage` é per-tab (não per-browser-session) — usuário abrindo várias abas vê a splash mais de uma vez | Média | Baixo | Comportamento aceitável pro escopo pedido ("splash animada" no boot); documentar a nuance na QA, sem mitigação adicional (evitar `localStorage`, que persistiria entre reinícios do navegador e nunca mais mostraria a splash) |
| Outline branco do mark ficar invisível em fundo claro se `iconOnly` for usado fora de contexto roxo | Baixa | Baixo | `MovuxMark` só é usado em contextos já validados no `plan.md` (sidebar escura, splash `bg-brand-base`) — não é um componente de uso livre em qualquer fundo nesta rodada |

---

## Complexity Estimate

**Overall**: Simple
- Backend: None
- Frontend: Simple (1 componente novo pequeno, 1 favicon estático, 1 edit de componente existente)

**Estimated Effort**: 2-3 hours
**Confidence**: Alta

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Assets de marca fornecidos pelo usuário em `~/Downloads/Splash/` (`Logotipo.svg`, `Loading.svg`, `Loading-1/2/3.png`). Escopo restrito a web (sem PWA/manifest, sem app nativo) — decisão implícita pelo estado atual do roadmap (nenhuma menção a app nativo).

---

## References

- `docs/design-references-notes.md` §"Fonte: assets de marca" — leitura detalhada dos arquivos originais
- `docs/DESIGN-SYSTEM.md` §1.4 — token `--yellow-base` usado em vez do hex solto do arquivo original
