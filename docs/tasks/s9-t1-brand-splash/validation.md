# S9-T1 — Validation

**Status:** ✅ concluído — com ressalva de débito pré-existente (ver Follow-ups)

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Favicon (`/icon.svg`) em qualquer rota | Mark oficial (fundo `#4C33CC` + asa branca/amarela) | ✅ `Content-Type: image/svg+xml`, 753 bytes |
| 2 | `<Logo iconOnly>` — header da landing, painel de auth, sidebar, mobile header | Mark + texto "Movux" | ✅ confirmado visualmente nos 4 call sites |
| 3 | `<Logo>` sem `iconOnly` — footer da landing, coluna mobile do auth | Só texto (comportamento preservado) | ✅ |
| 4 | Splash na primeira visita de sessão | Overlay `bg-brand-base` + mark fade/scale (~900ms) antes do conteúdo | ✅ capturada em screenshot mid-animação |
| 5 | Navegação subsequente (mesma sessão) | Sem repetição da splash | ✅ (`sessionStorage` gate) |
| 6 | `pnpm lint` escopo desta task | 0 erros/warnings | ✅ |

## Typecheck / Lint / Build

- **Lint isolado dos arquivos desta task**: limpo.
- **`pnpm lint`/`pnpm build` (projeto inteiro)**: **não passam** — débito pré-existente do domínio Turnora não migrado, ver [D-006](../../decisions.md). Nenhum arquivo desse débito foi tocado nesta task.

## Desvios encontrados durante execução

- `icon.svg` ganhou um `<rect>` de fundo `#4C33CC` não previsto no `plan.md` original — sem ele, o outline branco do mark ficaria invisível em favicon sobre chrome de navegador claro.
- `page.tsx:104` tinha um badge manual (`<span>` com `HeartPulse`) simulando um ícone de marca ao lado do `<Logo>` — removido, já que `Logo iconOnly` cobre essa função de forma correta (sem duplicar ícone).

## Acceptance criteria (brief.md)

- [x] AC1: favicon oficial em qualquer rota
- [x] AC2: `<Logo iconOnly>` com cores corretas
- [x] AC3: splash animada na primeira visita de sessão
- [x] AC4: sem repetição em navegação subsequente
- [x] AC5: `pnpm lint`/`pnpm build` — ver ressalva no Quality Gates (débito pré-existente, não desta task)
- [x] AC6: timeout de segurança de 2s implementado (`SAFETY_TIMEOUT_MS`)
- [x] AC7: responsivo confirmado em 375px e 1440px

## Follow-ups

| Item | Descrição |
|---|---|
| `pnpm build`/`pnpm lint` completos quebrados | Débito pré-existente do domínio Turnora, ver [D-006](../../decisions.md) — não corrigido nesta rodada, decisão explícita do usuário. |
| Viewport não-quadrado do favicon original | Normalizado manualmente (padding + `<g transform>`) — validar visualmente se algum navegador aplicar crop/scale inesperado ao SVG. |
