# S9-T1 — Exploration

**Date**: 2026-07-21
**Status**: Complete

---

## Call sites atuais de `<Logo>` (6 no total)

| Local | Componente | Fundo | Tamanho | Client/Server |
|---|---|---|---|---|
| `app/page.tsx:111` | `SiteHeader` | `bg-background/80` (claro) | default (`text-xl`) | Server |
| `app/page.tsx:511` | `SiteFooter` | claro | `text-sm` | Server |
| `app/(auth)/layout.tsx:26` | painel decorativo `aside` | `bg-primary` (roxo/brand) | `text-3xl` | Server |
| `app/(auth)/layout.tsx:33` | coluna de formulário | `bg-background` (claro) | default | Server |
| `components/features/nav/mobile-header.tsx:28` | header mobile | claro | default | Client (`'use client'`) |
| `components/features/nav/sidebar.tsx:57` | sidebar desktop | tema (claro hoje) | default | Client (`'use client'`) |

Único contexto de fundo **escuro/brand** hoje é `(auth)/layout.tsx:26` (painel roxo). Todo o resto roda em fundo claro — `MovuxMark` (outline branco) só é seguro nesse painel e na splash (`bg-brand-base`), conforme já previsto no brief (Risk table).

---

## `layout.tsx` — ponto de montagem confirmado

`RootLayout` (Server Component) → `<body>` → `<QueryProvider>{children}</QueryProvider>` + `<Toaster>` como irmão. Nenhum Client Component hoje envolve `{children}` diretamente. `AppSplashScreen` pode envolver `{children}` no mesmo nível de `QueryProvider` sem quebrar nenhum Server Component existente.

---

## Dark mode — infraestrutura órfã, não afeta o escopo

Existe `providers/theme-provider.tsx` (wraps `next-themes`) e `.dark { ... }` já definido em `globals.css:152` (tokens `--brand-dark`, `--yellow-dark` etc.) — mas `ThemeProvider` **não é importado em nenhum lugar** (`layout.tsx` não o usa). `suppressHydrationWarning` no `<html>` sugere que foi cogitado e abandonado. Na prática, o app roda sempre em tema claro hoje. **Não afeta esta task** — não há toggle ativo pra se preocupar com o mark em modo escuro além do painel roxo já mapeado.

---

## Favicon (`app/icon.svg`) — confirmado parcialmente

`next/dist/lib/metadata/is-metadata-route.js` lista `svg` como extensão válida pra `app/icon.svg` (`STATIC_METADATA_IMAGES.icon.extensions`), sem checagem de `viewBox`/dimensões nesse módulo de detecção de rota. **Não foi possível confirmar** (loader de processamento de imagem bloqueado no ambiente de exploração) se há algum redimensionamento/normalização de viewBox em runtime — tratar como risco baixo a validar na Execution (renderizar e checar visualmente a aba do navegador; se o viewBox 80×88 não-quadrado cortar/distorcer, ajustar o SVG com padding pra ficar quadrado antes do favicon final).

---

## Primeiro uso confirmado: `sessionStorage`

`grep -rn "sessionStorage\|localStorage"` no projeto inteiro: **zero ocorrências**. O gate de splash-por-sessão será o primeiro uso de Web Storage no código — não há padrão local a seguir, mas é uma API simples e não introduz dependência.

---

## `framer-motion` — não é o primeiro uso de `AnimatePresence`

Versão instalada: `^12.38.0` (`package.json:69`). `AnimatePresence` já é usado em `_landing/landing-roles-accordion.tsx:3,218,275` e `_landing/landing-hero-preview.tsx:3,93,107` — **padrão existente a seguir**, não pioneiro. Easing de referência: `motion-section.tsx:27` (`ease: [0.22, 1, 0.36, 1]`).

---

## Riscos confirmados / atualizados

- Nenhum bloqueio técnico encontrado. Único ponto de atenção: comportamento exato do favicon SVG com viewBox não-quadrado precisa de verificação visual na Execution (não é um blocker de plano, é um item de QA).

## Next Steps

Seguir para `research.md` — decisão de escolha de easing/duração exata da splash e confirmação final de onde o `MovuxMark` recebe `iconOnly` vs. texto em cada um dos 6 call sites (ex.: sidebar/mobile-header provavelmente ganham ícone+texto; footer continua só texto pequeno).
