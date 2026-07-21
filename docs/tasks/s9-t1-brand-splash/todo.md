# TODO: S9-T1 — Marca (Mark, Favicon, Splash)

**Date**: 2026-07-21
**Phase**: EXECUTION
**Status**: IN_PROGRESS

---

## Implementation Checklist

### Step 1: Favicon

- [x] **1.1** `apps/web/src/app/icon.svg` (novo) — mark com viewBox quadrado, amarelo normalizado, fundo `#4C33CC` adicionado durante execução (correção: outline branco ficaria invisível sem fundo em chrome de navegador claro)

### Step 2: Mark reutilizável

- [x] **2.1** `components/ui/logo.tsx` — `MovuxMark` (SVG inline) + implementar `iconOnly`

### Step 3: Splash screen

- [x] **3.1** `components/features/splash/app-splash-screen.tsx` (novo)
- [x] **3.2** `app/layout.tsx` — montar `<AppSplashScreen />`

### Step 4: Aplicar mark nos call sites

- [x] **4.1** `app/page.tsx:111` (`SiteHeader`) — `iconOnly`; removido badge manual redundante com `HeartPulse` que já simulava um ícone de marca
- [x] **4.2** `app/(auth)/layout.tsx:26` (painel roxo) — `iconOnly`
- [x] **4.3** `components/features/nav/sidebar.tsx:57` — `iconOnly`
- [x] **4.4** `components/features/nav/mobile-header.tsx:28` — `iconOnly`

### Step 5: Validation

- [x] **5.1** `pnpm lint` no escopo desta task — 0 erros/warnings novos (~249 erros pré-existentes no domínio Turnora/workspace continuam, não relacionados)
- [ ] **5.2** `pnpm build` — bloqueado por bug pré-existente não relacionado (`app/api/workspace/select/route.ts`) — ver S9-T2/todo.md 6.2, reportado na QA
- [ ] **5.3** QA manual: favicon em todas as rotas, splash na primeira visita de sessão, sem repetição em navegação subsequente, responsivo 375px/1440px — pendente (ver QA em chat)
- [ ] **5.4** `validation.md` registrado após aprovação do QA

---

## Progress Notes

| Step | Status | Notes |
|------|--------|-------|
| 1.1 | ⬜ | |
| 2.1 | ⬜ | |
| 3.1 | ⬜ | |
| 3.2 | ⬜ | |
| 4.1–4.4 | ⬜ | |
| 5.1–5.4 | ⬜ | |
