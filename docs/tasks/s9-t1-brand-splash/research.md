# S9-T1 — Research

**Date**: 2026-07-21
**Status**: Complete

---

## Decisão: uso de `iconOnly` por call site

| Local | Decisão | Motivo |
|---|---|---|
| `(auth)/layout.tsx:26` (painel roxo) | `iconOnly` + texto lado a lado, tamanho grande | Único fundo escuro/brand hoje — o mark com outline branco funciona nativamente aqui, é a vitrine natural da marca completa |
| `components/features/nav/sidebar.tsx:57` | `iconOnly` + texto lado a lado, tamanho default | Padrão comum de sidebar (ícone + wordmark), reforça identidade no app autenticado |
| `components/features/nav/mobile-header.tsx:28` | `iconOnly` + texto | Mesmo motivo da sidebar; header mobile tem pouca largura, mas mark é pequeno (SVG 80×88 escala bem em `size-6`/`size-8`) |
| `app/page.tsx:111` (`SiteHeader` da landing) | `iconOnly` + texto | Primeira impressão de marca pro visitante anônimo |
| `app/page.tsx:511` (`SiteFooter`) | Só texto (sem ícone) | Footer já é discreto (`text-sm`); ícone duplicado no rodapé não agrega, mantém hierarquia visual (header como único lugar de destaque do mark) |
| `(auth)/layout.tsx:33` (coluna de formulário, mobile) | Só texto (sem ícone) | Fundo claro — outline branco do mark não teria contraste sem uma variante de cor alternativa, fora de escopo (ver Out of Scope do brief); texto já cumpre a função de identificação nessa coluna |

Resultado prático: `MovuxMark` (ícone) aparece em 4 dos 6 call sites; os outros 2 continuam texto-only sem qualquer regressão (comportamento idêntico ao atual).

---

## Decisão: coreografia e timing da splash

- **Duração total**: ~900ms (curto o bastante pra não incomodar em navegação repetida, longo o bastante pra ser percebido como intencional)
- **Sequência**: `opacity 0→1` + `scale 0.85→1` no mark (300ms, `ease: [0.22, 1, 0.36, 1]` — mesmo easing de `motion-section.tsx:27`) → hold de 400ms → fade-out do overlay inteiro (200ms) revelando `{children}`
- **Implementação**: `AnimatePresence` + `motion.div` (padrão já usado em `landing-hero-preview.tsx`/`landing-roles-accordion.tsx`), sem introduzir API nova de animação
- **Timeout de segurança (AC6 do brief)**: `setTimeout` de 2s que força `setShow(false)` independente do estado da animação — cobre o caso de o navegador pausar rAF em aba em background durante o boot

---

## Decisão: favicon — viewBox

`Logotipo.svg` tem viewBox `0 0 80 88` (não-quadrado). Decisão: envolver os 2 paths originais num novo `app/icon.svg` com viewBox quadrado `0 0 88 88` (usando a maior dimensão), centralizando o mark com padding lateral (~4px cada lado) — evita qualquer risco de distorção/corte que o Next.js possa aplicar ao normalizar pra um ícone quadrado (ponto não confirmável em código, ver `exploration.md`). Abordagem conservadora, zero-custo, remove o risco por completo em vez de só mitigar.

---

## Decisão: cor do amarelo

Usar `--yellow-base` (`#FFC042`, já em `DESIGN-SYSTEM.md` §1.4) em vez do hex original do arquivo (`#FFBE00`) — diferença de luminância imperceptível, mantém o SVG consistente com os tokens categóricos já documentados. O outline branco do mark usa `currentColor` fixo em `#FFFFFF` (não é um token de brand, é a cor literal do desenho).

---

## Edge cases confirmados

- **`sessionStorage` indisponível** (modo privado extremo/navegador bloqueando Storage API): `try/catch` ao redor do `getItem`/`setItem` — se falhar, assume "não visto" e mostra a splash a cada load (degradação aceitável, não é erro visível ao usuário)
- **Usuário navega direto pra uma rota profunda (ex. `/customer/dashboard`) sem passar pela home**: a splash mostra igual, porque o gate está no `RootLayout` (nível global), não em `page.tsx` da home — comportamento correto e pretendido (é "boot do app", não "boot da home")

## Next Steps

Seguir para `plan.md` — ordenar sub-steps de execução (favicon → `MovuxMark`/`Logo` → `AppSplashScreen` → integração nos 6 call sites).
