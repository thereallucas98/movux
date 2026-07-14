# Frontend Architecture (SOLID + Composition)

How to create or modify pages, features, and components in this app.

## Principles

- **S (Single Responsibility)**: Pages compose; feature components own a single user-facing concern; primitives (shadcn/ui) own a single interaction.
- **O (Open/Closed)**: New variants via `cva()`; new behaviors via composition (children, slots), not by editing existing components.
- **L (Liskov)**: Anything accepting `Button` props works with any size/variant; controlled/uncontrolled forms work without consumer code knowing.
- **I (Interface Segregation)**: Hooks are narrow (`useShiftDetail` ≠ `useShiftList`); RHF schemas type only the fields they validate.
- **D (Dependency Inversion)**: Components consume data via React Query hooks, not by importing the API client directly. Server actions live behind hooks too.

---

## Folder structure

```
apps/web/src/
├── app/
│   ├── (auth)/                 # Public auth pages (no app shell)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                  # Authed product pages (app shell)
│   │   ├── layout.tsx          # Sidebar / topbar / drawer wiring
│   │   ├── dashboard/page.tsx
│   │   ├── schedules/[id]/page.tsx
│   │   ├── shifts/[id]/
│   │   │   ├── page.tsx
│   │   │   ├── timeline/page.tsx
│   │   │   └── error.tsx
│   │   ├── workspaces/[id]/settings/(...)
│   │   └── time-entries/page.tsx
│   ├── dev/styleguide/page.tsx # Live preview of the design system
│   ├── api/                    # REST routes (Phase 1a — backend)
│   ├── layout.tsx              # Root layout: <html>, font, toaster
│   ├── globals.css             # Financy tokens
│   ├── error.tsx               # Top-level error boundary
│   └── not-found.tsx
├── components/
│   ├── ui/                     # Primitives (Button, Input, Tag, IconButton, etc.) — Financy
│   └── features/               # Domain compositions (auth, nav, schedules, shifts, requests, time-tracking, timeline)
│       ├── auth/
│       ├── nav/
│       ├── schedules/
│       ├── shifts/
│       ├── requests/
│       ├── time-tracking/
│       └── timeline/
├── graphql/
│   ├── hooks/                  # use-<query|mutation>.ts wrapping React Query
│   ├── operations/             # *.graphql files (codegen input)
│   └── client.ts               # graphql-request instance with cookie credentials
├── hooks/                      # Cross-feature hooks (use-media-query, use-adaptive-modal, ...)
├── lib/                        # Utilities (cn, api-client, schemas, t())
├── i18n/                       # locales/pt-BR.ts + helpers
├── providers/                  # QueryProvider (RQ + DevTools)
└── server/                     # Backend layer (Phase 1a)
```

---

## Page composition flow

```
Page (RSC)
  ├─ prefetchQuery + HydrationBoundary  ← server data hydrated to RQ cache
  └─ <FeatureScreen>  (client component)
       ├─ useFeatureData()              ← React Query hook (read)
       ├─ useFeatureAction()            ← React Query mutation (write)
       ├─ <FeatureForm />               ← RHF + Zod schema
       └─ <FeatureList /> | <Empty /> | <Skeleton />  ← derived from query state
```

The server-component shell stays as light as possible. Heavy logic, forms, and interactivity live in client components. Loading states use `loading.tsx`; errors use `error.tsx` per segment.

---

## How to create a new page

1. **Pick the segment** — `(auth)` or `(app)`. New top-level segments need their own `layout.tsx`.
2. **Wire pre-fetch** in `page.tsx` (RSC):
   ```tsx
   const queryClient = new QueryClient()
   await queryClient.prefetchQuery({ queryKey: ['shifts', id], queryFn })
   return (
     <HydrationBoundary state={dehydrate(queryClient)}>
       <ShiftDetail id={id} />
     </HydrationBoundary>
   )
   ```
3. **Build the client component** — `'use client'` directive, consume the same query key with `useQuery`.
4. **Add `loading.tsx`** for the suspense boundary; **`error.tsx`** for graceful recovery.
5. **PT-BR copy** through `t()` helpers; never hardcode user-facing strings.
6. **Mobile-first** — design at 375px, scale up via `md:` and `lg:`.

---

## How to create a new feature component

1. **Folder** — `src/components/features/<domain>/<name>.tsx`. Keep the test alongside in `__tests__/<name>.test.tsx`.
2. **Single responsibility** — one user-facing concern (a list, a form, a confirmation modal). Compose from `~/components/ui/*` primitives.
3. **Variants via `cva()`** — never inline conditional class strings beyond ~3 cases.
4. **`cn()` from `~/lib/utils`** to merge classes.
5. **`focus-visible:ring-ring`** on interactive elements.
6. **`aria-label` on icon-only controls** (CLAUDE.md hard rule).
7. **Drawer (mobile) vs Dialog (desktop)** — `useMediaQuery('(max-width: 720px)')` drives the choice. The wrapper hook `useAdaptiveModal()` owns this.
8. **Named export** — never `export default` (except Next.js page/layout files).

---

## How to fetch data

### Server component (default)

```tsx
// app/(app)/schedules/page.tsx
import { headers } from 'next/headers'
import { fetchSchedules } from '~/lib/api-client'

export default async function Page() {
  const data = await fetchSchedules({ headers: await headers() })
  return <SchedulesScreen initial={data} />
}
```

Use the typed `~/lib/api-client` (HTTP wrapper over `fetch`, no Axios). No React Query needed when the server can render the entire response.

### Client component with caching / refetch

```tsx
// graphql/hooks/use-shift-timeline.ts
export function useShiftTimeline(shiftId: string, opts?: { since?: Date }) {
  return useQuery({
    queryKey: ['shift-timeline', shiftId, opts?.since?.toISOString()],
    queryFn: () => sdk.shiftTimeline({ shiftId, since: opts?.since }),
    staleTime: 30_000,
  })
}
```

The hook is the only coupling point between UI and API. Components import the hook, never the SDK directly.

### Mutation with optimistic update

```tsx
export function useAddTimelineNote(shiftId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note: string) => sdk.addShiftTimelineNote({ shiftId, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shift-timeline', shiftId] }),
  })
}
```

For high-frequency interactions (toggles, queue position), add `onMutate` for optimistic state + rollback on error.

---

## How to build a form

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AddShiftTimelineNoteBodySchema } from '~/server/schemas/shift-timeline.schema'

export function AddNoteForm({ shiftId }: { shiftId: string }) {
  const { mutate, isPending } = useAddTimelineNote(shiftId)
  const form = useForm({
    resolver: zodResolver(AddShiftTimelineNoteBodySchema),
    defaultValues: { note: '' },
  })

  const onSubmit = form.handleSubmit((values) => {
    mutate(values.note, {
      onError: (err) =>
        form.setError('root', { message: friendlyError(err) }),
      onSuccess: () => form.reset(),
    })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        {...form.register('note')}
        error={!!form.formState.errors.note}
      />
      {form.formState.errors.note && (
        <Type variant="danger">{form.formState.errors.note.message}</Type>
      )}
      {form.formState.errors.root && (
        <Type variant="danger">{form.formState.errors.root.message}</Type>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Salvando…' : 'Adicionar nota'}
      </Button>
    </form>
  )
}
```

**Rules:**
- `defaultValues` per field (no `undefined` controlled inputs).
- `formState.isSubmitting` (or mutation `isPending`) for loading state.
- API errors → `setError('root', { message })`; render via the `Type` component.
- Reuse the server's Zod schema via `import { ... } from '~/server/schemas/...'`. The bundler tree-shakes it.

---

## State management

| Kind of state | Where it lives |
|---|---|
| Server data | React Query — never duplicate in Zustand |
| Local UI (modal open, filter, multi-step wizard step) | Zustand (single store per feature is fine) |
| Form state | RHF |
| URL-shareable filters | `useSearchParams` |
| Derived from props | `useMemo` — never `useState + useEffect` |

---

## Error handling

1. **Expected errors** (validation, business rule) → render in UI. Never throw.
2. **Unexpected errors** (5xx, network) → throw or let the mutation reject; segment-level `error.tsx` catches it.
3. **Map backend `code` to friendly messages** in a single helper (`~/lib/error-messages.ts`):
   ```ts
   export function friendlyError(err: unknown): string {
     const code = extractErrorCode(err)
     return t(`errors.${code}`) ?? t('errors.generic')
   }
   ```
4. Add new entries in `i18n/locales/pt-BR.ts` under `errors.<code>`. Mirrors the `ErrorCode` union from `~/server/http/error-response.ts`.

---

## Mobile-first checklist (per page)

| Check | Mechanism |
|---|---|
| Renders at 375px (iPhone SE) | Manual + Playwright `mobile-webkit` |
| Renders at 720px / 1024px / 1440px | Same |
| Touch targets ≥ 44px | `min-h-12` on inputs, `h-12` on buttons (`size="md"`) |
| `Drawer` (not `Dialog`) on ≤720px | `useAdaptiveModal()` |
| No horizontal scroll | `overflow-x-auto` only on intentional scrollers; `min-w-0` on flex children |
| Sticky bottom action bar on forms | `sticky bottom-0 bg-background pt-3 -mx-4 px-4 border-t` |
| Safe-area respect | `pb-safe`, `pt-safe` helpers (defined in `globals.css`, optional) |

---

## TypeScript conventions

- `import type` for type-only imports.
- Never `React.FC`, never `any`.
- Component props: extend `ComponentProps<'element'>` + `VariantProps<typeof variants>`.
- Infer types from Zod via `z.infer<typeof Schema>` where possible.
- Discriminated unions for component states (`type LoadingResult = ...`).

---

## When in doubt

- Read [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) for tokens / components / spacing.
- Read [`INTEGRATION-FLOW.md`](INTEGRATION-FLOW.md) for end-to-end data flow.
- Read CLAUDE.md `Frontend Coding Standards` for the canonical style rules.
- When the API contract is unclear, [`API-ROADMAP.md`](API-ROADMAP.md) is the source of truth.
