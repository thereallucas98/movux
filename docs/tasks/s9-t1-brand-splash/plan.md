# S9-T1 — Plan

## 1. Favicon — `apps/web/src/app/icon.svg` (novo)

ViewBox quadrado `0 0 88 88` (padding lateral em torno do mark original, viewBox `80×88`), mesmos 2 paths de `Logotipo.svg`, amarelo normalizado pro token `--yellow-base` (`#FFC042`):

```svg
<svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(4, 0)">
    <path d="M70.9175 46.1365L79.415 39.6726..." fill="white"/>
    <path d="M61.9523 55.8396L36.0578 68.8397..." fill="#FFC042"/>
  </g>
</svg>
```
(paths completos copiados de `Logotipo.svg`, só envolvidos pelo `<g transform>` de centralização)

## 2. `MovuxMark` + `iconOnly` — `components/ui/logo.tsx` (modificado)

```tsx
import type { ComponentProps } from 'react'
import { cn } from '~/lib/utils'

function MovuxMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 88" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M70.9175 46.1365L79.415 39.6726..." fill="white" />
      <path d="M61.9523 55.8396L36.0578 68.8397..." fill="#FFC042" />
    </svg>
  )
}

interface LogoProps extends ComponentProps<'div'> {
  iconOnly?: boolean
}

function Logo({ className, iconOnly = false, ...props }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2 text-xl font-extrabold tracking-tight', className)} {...props}>
      {iconOnly && <MovuxMark className="size-6" />}
      Movux
    </div>
  )
}

export { Logo, MovuxMark }
```

Nota: `iconOnly` hoje virou "ícone + texto" (não substitui o texto) — ver decisão do `research.md`; nenhum call site pediu ícone sem texto, então o nome do prop fica levemente impreciso, mas a interface pública (`iconOnly?: boolean`) não muda pra não quebrar os 4 call sites que vão ativá-lo. Se um caso de "só ícone, sem texto" surgir depois, adiciona-se um segundo prop então.

## 3. `AppSplashScreen` — `components/features/splash/app-splash-screen.tsx` (novo)

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { MovuxMark } from '~/components/ui/logo'

const STORAGE_KEY = 'movux:splash-seen'
const SAFETY_TIMEOUT_MS = 2000
const HOLD_MS = 400

export function AppSplashScreen() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = true
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      seen = false
    }
    if (seen) return

    setShow(true)
    const hide = () => {
      setShow(false)
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {}
    }
    const holdTimer = setTimeout(hide, HOLD_MS)
    const safetyTimer = setTimeout(hide, SAFETY_TIMEOUT_MS)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(safetyTimer)
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="bg-brand-base fixed inset-0 z-[999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <MovuxMark className="size-16" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

## 4. Montagem — `apps/web/src/app/layout.tsx` (modificado)

```tsx
import { AppSplashScreen } from '~/components/features/splash/app-splash-screen'
// ...
<QueryProvider>
  <AppSplashScreen />
  {children}
</QueryProvider>
```

## 5. Aplicar `iconOnly` nos 4 call sites decididos

- `app/page.tsx:111` (`SiteHeader`) → `<Logo iconOnly className="text-foreground" />`
- `app/(auth)/layout.tsx:26` (painel roxo) → `<Logo iconOnly className="text-primary-foreground text-3xl" />`
- `components/features/nav/sidebar.tsx:57` → `<Logo iconOnly className="text-foreground mb-6" />`
- `components/features/nav/mobile-header.tsx:28` → `<Logo iconOnly className="text-foreground" />`
- `app/page.tsx:511` (footer) e `(auth)/layout.tsx:33` (coluna mobile) — **sem alteração**, continuam só texto

---

## Ordem de execução (sub-steps)

1. `icon.svg` (favicon) — sem dependência
2. `MovuxMark` + `iconOnly` em `logo.tsx` — sem dependência
3. `AppSplashScreen` — depende de 2 (`MovuxMark`)
4. Montagem em `layout.tsx` — depende de 3
5. Aplicar `iconOnly` nos 4 call sites — depende de 2
6. Lint/build + QA manual (ver Test Strategy do brief)

## Test Strategy (detalhe)

**UI**: aba do navegador mostra o mark em todas as rotas; primeira visita de sessão mostra splash (~900ms) antes do conteúdo; segunda navegação/rota não repete; `sessionStorage` limpo manualmente reproduz a splash de novo; responsivo 375px/1440px sem overflow durante a splash; timeout de 2s testável simulando CPU throttling no DevTools.
