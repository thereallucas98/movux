# CLAUDE.md

This file is loaded automatically at the start of every conversation.

---

## Foundation (Arché)

Este projeto adere ao **Arché** — os princípios inviáveis de violar que governam o comportamento do assistente. Fonte vendada (SSOT): [`docs/foundation/arche.md`](docs/foundation/arche.md). **Não reproduza os princípios aqui; estenda-os lá.**

Eixos (detalhe na fonte):
- **Anti-Duplication** — fonte única da verdade; referencie, não repita
- **Anti-Precocity** — respeite o modo do usuário; não pule para código antes do sinal
- **Anti-Babysitting** — dentro de uma fase/sub-step aprovado, execute até o fim; gates só nas fronteiras + QA
- **LLM Conciseness** — máximo sinal, mínimo ruído
- **Principle Enforcement** — pesquise antes de criar; detecte o modo antes de responder

Decisões de definição vão em [`docs/decisions.md`](docs/decisions.md) (ADR enxuto).

---

## Project Overview

**Movux** — marketplace de fretes e mudanças com camadas progressivas de segurança.

Tagline: *"Chama um Movux."*

**Core:** conectar clientes que precisam mover seus pertences a transportadores independentes verificados — com confiança e segurança progressiva como diferencial.

🔖 **Source of truth for product decisions:** [`docs/BUSINESS-FOUNDATION.md`](docs/BUSINESS-FOUNDATION.md) — domínio, roadmap por fase, camadas de segurança, canal de petições.

- **Package manager**: pnpm — **always use `pnpm`**, never `npm` or `yarn`
- **Main app**: `apps/web/`
- **Language**: Portuguese-first (UI, comments, error messages, product copy)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 (strict) |
| Database | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Auth | JWT (`jsonwebtoken`) + bcryptjs, httpOnly cookie `session` |
| RBAC | CASL via `@movux/auth` package |
| Validation | Zod 4 |
| Forms | React Hook Form 7 + `@hookform/resolvers` (zodResolver) |
| GraphQL Server | `graphql-yoga` + `@pothos/core` + `@pothos/plugin-simple-objects` |
| GraphQL Client | `graphql-request` + `@graphql-codegen` (types) |
| Data fetching | `@tanstack/react-query` 5 |
| State | Zustand 5 (client/UI state only) |
| UI | **shadcn/ui** (Radix UI primitives, New York style) + TailwindCSS 4 |
| Styling utils | `class-variance-authority` (`cva`) + `cn()` from `~/lib/utils` |
| Icons | `lucide-react` |
| Toasts | `sonner` |
| HTTP | `api` client (`~/lib/api-client`) — typed wrapper over native `fetch`, **no Axios** |
| Error boundaries | React 19 built-in (`error.tsx`) |
| Routing | Next.js App Router |

---

## Monorepo Structure

```
apps/web/src/
  app/
    api/             # REST API routes (thin layer)
    api/graphql/     # GraphQL endpoint (Yoga handler)
    (auth)/          # Auth pages (login, register, verify, reset)
  server/
    graphql/         # Pothos schema, context, types, queries, mutations
    repositories/    # Data access (Prisma) — interface + factory fn
    use-cases/       # Business logic — return discriminated unions
    schemas/         # Zod validation schemas
  graphql/
    hooks/           # React Query hooks
    operations/      # .graphql operation files
  lib/               # Utilities (auth, db, graphql-client, swagger, cookies)
  components/
    ui/              # Primitive/shared components (Button, Card, Input…)
    features/        # Feature-specific (auth/, nav/, tenants/, workspaces/, shifts/, schedules/, requests/, time-tracking/, …)
  providers/         # QueryProvider
packages/
  auth/              # CASL RBAC definitions (@movux/auth)
  env/               # Env validation (@movux/env)
config/
  eslint-config/     # Shared ESLint config (@movux/eslint-config)
  prettier/          # Shared Prettier config (@movux/prettier)
  typescript-config/ # Shared tsconfig (@movux/tsconfig)
docs/                # Documentation and task tracking
  BUSINESS-FOUNDATION.md   # ⭐ Product source of truth
  API-ARCHITECTURE.md      # Backend patterns
  CLAUDE-INSTRUCTIONS.md   # AI workflow
```

---

## Core Domain Glossary (from BUSINESS-FOUNDATION.md)

- **Customer** — person or business requesting a shipment
- **Carrier** — independent driver offering freight/moving services
- **Shipment** — core transaction: freight or moving request with lifecycle
- **Proposal** — carrier's bid on an open shipment
- **Route** — origin → destination with estimated distance/duration
- **Review** — post-job rating from customer about carrier
- **SafetyContact** — emergency contact linked to a shipment (Phase 3)
- **Roles:** `CUSTOMER` / `CARRIER` / `ADMIN`

**Shipment lifecycle:**
```
DRAFT → OPEN → PROPOSALS_RECEIVED → CARRIER_SELECTED → IN_TRANSIT → DELIVERED → REVIEWED
```

Full domain model in [docs/BUSINESS-FOUNDATION.md §6](docs/BUSINESS-FOUNDATION.md).

---

## API Architecture

**Flow**: `Route → parse/validate (Zod) → UseCase(repos, principal, input) → Repository (Prisma) → Response`

### Routes (`app/api/`) — thin layer
1. `getPrincipal(req)` — extract auth context (returns null if unauthenticated)
2. `SomeSchema.safeParse(body)` — validate with Zod
3. Call use case
4. Map error codes → HTTP status and return `NextResponse.json(...)`

### Use cases (`server/use-cases/`) — business logic
- Receive repos as parameters (no direct Prisma access)
- Return discriminated unions: `{ success: true; data: T } | { success: false; code: string }`

### Repositories (`server/repositories/`) — data access
- Encapsulate Prisma; export interface + factory function
- No business logic here

### Error code → HTTP
- `UNAUTHENTICATED` → 401, `FORBIDDEN` → 403, `NOT_FOUND` → 404, conflicts → 409

### Zod rules
- `z.email()` — NOT `z.string().email()`
- `z.uuid()` — NOT `z.string().uuid()`
- Validation error response: `{ message: 'Invalid payload', details: parsed.error.issues }`

---

## Responsive Design Rules (MOBILE-FIRST)

### Breakpoints

| Size | Range | Priority |
|---|---|---|
| **Mobile** | `≤ 720px` | 🥇 Primary — main focus, test first |
| **Tablet / iPad** | `721 – 1024px` | 🥈 Secondary |
| **Desktop** | `≥ 1025px` | 🥉 Tertiary |

### Priority browsers (in order)

1. **Safari iOS** (iPhone) — primary test target
2. **Chrome Android**
3. **Safari iPad**
4. Chrome / Firefox desktop

### Mobile UI patterns (`≤720px`)

Replace desktop patterns with mobile equivalents on small viewports:

| Desktop | Mobile replacement |
|---|---|
| `Dialog` (modal) | **`Drawer`** (shadcn bottom sheet) |
| `Select` | **`Drawer`** with list |
| `DropdownMenu` | **`Drawer`** with list of actions |
| `Table` | **Card-based** list layout |
| Horizontal top nav | Bottom tab bar OR hamburger drawer |

### Rules

- Use **`useMediaQuery('(max-width: 720px)')`** hook to drive conditional rendering
- **Full-width inputs** on mobile (`w-full`) with `min-h-12` minimum touch target (44–48px)
- **Respect iOS safe-areas**: `pb-safe`, `pt-safe` helpers for notch/home indicator
- **Sticky bottom action bar** on mobile forms — primary CTA always reachable
- **No hover-only interactions** on mobile — every action must be tappable
- **Large typography**: default `text-base` (16px) or larger on mobile; never `text-xs` for body copy
- **Test on real Safari iOS** (not only Chrome devtools) before closing Phase 4
- Use Tailwind mobile-first syntax: base = mobile, `md:` = tablet, `lg:` = desktop

### Component checklist (on top of existing checklist)
- [ ] Renders correctly at 375px viewport (iPhone SE width)
- [ ] Renders correctly at 720px viewport
- [ ] Renders correctly at 1024px viewport
- [ ] Renders correctly at 1440px viewport
- [ ] Touch targets ≥ 44px on mobile
- [ ] No horizontal scroll on mobile
- [ ] Uses `Drawer` (not `Dialog`) on mobile for modals/selects
- [ ] Sticky actions visible without scrolling on mobile forms

---

## Frontend Coding Standards

### Components & Styling

**Variants with `cva()` from `class-variance-authority`:**
```tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '~/lib/utils'
import * as React from 'react'

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'rounded-button bg-primary text-primary-foreground shadow hover:bg-primary/90',
        secondary: 'rounded-button border border-input bg-background hover:bg-muted',
        ghost: 'rounded-button hover:bg-muted',
        destructive: 'rounded-button bg-destructive text-destructive-foreground shadow-sm hover:opacity-90',
        outline: 'rounded-button border border-input bg-background shadow-sm hover:bg-muted',
        link: 'underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm [&_svg]:size-4',
        sm: 'h-8 px-3 text-xs [&_svg]:size-3.5',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)
```

**Rules:**
- **Always `cn()`** from `~/lib/utils` — never raw `twMerge()` or `clsx()`
- **Always `cva()`** for variants — never `tv()` from tailwind-variants
- **`focus-visible`** on every interactive element
- **`aria-label`** on every icon-only button
- **`{...props}` always last** in JSX spread
- **Colors via CSS variables only** — never hardcoded hex/rgb

### Architecture
- Single responsibility per component/function
- One abstraction level per function
- Composition over props — pass server components as `children` to client wrappers
- Feature-based folder organization

### State
- **React Query** → server/async state (never duplicate in Zustand)
- **Zustand** → client/UI state (filters, toggles, modals)
- Derive values during render with `useMemo` instead of `useState + useEffect`
- URL state for shareable filters (`useSearchParams`)

### Forms
- `useForm` with `resolver: zodResolver(schema)` and explicit `defaultValues` per field
- `formState.isSubmitting` for loading/disabling; `formState.errors` for messages
- `setError('root', { message })` for API-level form errors

### Data Fetching (Next.js App Router)
- Server components: `await fetch(...)` directly
- Client with refetch/infinite: React Query
- RSC → client hydration: `queryClient.prefetchQuery` + `HydrationBoundary`

### Error Handling
- Expected errors: return/display in UI — do not throw
- Unexpected errors: `error.tsx` files in Next.js App Router segments
- Do not store tokens in localStorage or JS-accessible cookies

### TypeScript
- `import type` for all type-only imports
- Never `React.FC`, never `any`
- Extend `ComponentProps<'element'>` + `VariantProps<typeof variants>` for component props
- Infer types from Zod: `z.infer<typeof Schema>`

---

## Commands

```bash
pnpm dev              # Dev server (port 3001)
pnpm build            # Prisma generate + Next.js build
pnpm lint             # tsc --noEmit + ESLint (max-warnings: 0)
pnpm lint-fix         # Auto-fix
pnpm prettier-format  # Format
pnpm codegen          # Export GraphQL schema + generate TS types
pnpm db:generate      # Generate Prisma client
cd apps/web && pnpm db:migrate   # Run migrations (from apps/web)
pnpm db:push          # Push schema without migration (dev)
pnpm db:studio        # Prisma Studio UI
```

Validation before marking execution complete:
```bash
pnpm lint    # Must pass (0 warnings)
pnpm build   # Must succeed
```

---

## Dev Environment

- **Database**: PostgreSQL via Docker — `docker compose up -d` (from repo root)
- **Container**: `movux-postgres` | **DB**: `movux` | **User**: `postgres` | **Password**: `docker`
- **Swagger UI**: `http://localhost:3001/api-docs`
- **GraphiQL**: `http://localhost:3001/api/graphql` (dev only)
- **DB direct access**: `docker exec movux-postgres psql -U postgres -d movux -c "..."`
- **Cookie jar for tests**: `/tmp/movux_cookies.txt`
- **Auth cookie name**: `session`

---

## Development Workflow

Full instructions: [docs/CLAUDE-INSTRUCTIONS.md](docs/CLAUDE-INSTRUCTIONS.md)

### Language Rules (STRICT)

| Scope | Language |
|---|---|
| Conversation with user (chat, questions, explanations) | **Portuguese (PT-BR)** |
| Code (variables, functions, comments, types) | **English** |
| File names, repo names, branch names | **English** |
| Commit messages, PR titles, PR descriptions | **English** |
| GitHub issues, labels, project board | **English** |
| Documentation files (.md) | **English** — unless explicitly product copy |
| UI strings / product copy / error messages shown to end users | **Portuguese** (Movux is PT-BR product) |

### ROADMAP — pre-feature phase (project-level, once per product)

Before any feature-level docs, the project MUST have a `docs/ROADMAP.md` identifying:
- **Phase breakdown** (aligned with BUSINESS-FOUNDATION.md §15)
- **Technical gaps** (libs missing, config needed, integrations)
- **Approach decisions** (patterns, architectural choices that span multiple features)
- **Feature sequencing** (what unblocks what)
- **Per-feature folder mapping** (`docs/tasks/<slug>/` for each)

ROADMAP is the **map of all features**. Each feature gets its own 5-phase folder.

### Per-feature workflow (5 phases, strict gates)

```
Phase 0: BRIEF        → User story, scope, acceptance criteria
Phase 1: EXPLORATION  → Read-only, document current state
Phase 2: RESEARCH     → Approach options, decision, edge cases
Phase 3: PLAN + TODO  → Ordered sub-steps, granular checklist
Phase 4: EXECUTION    → Implement, one sub-step at a time
Phase 5: QA + VALIDATION → Run QA checklist in chat, then persist results
```

### HARD rules (never violate)

1. **Never start a new phase without explicit user approval.** Each gate is a hard stop:
   - `brief.md` done → ask *"Posso passar para Exploration?"* — wait for "sim"
   - Same for every transition
2. **Never put questions, uncertainties, or TBDs in docs.** All clarifications happen in **chat** during construction. Docs are records of **decisions already made**, not thinking-out-loud. See §"Fast / Good / Ideal decision shape" below.
3. **Never write code before Phase 3 (PLAN) is approved.**
4. **Never run `git` commands unless explicitly asked.**
5. **Never skip the ROADMAP for new projects.** ROADMAP exists before any feature brief.
6. **QA is in chat, not in docs.** Phase 5 runs the QA checklist interactively in the prompt; `validation.md` is written only AFTER the user sees the QA results and approves.

### Task documentation (MANDATORY per feature)

Every feature/fix MUST have a task folder at `docs/tasks/<feature-slug>/` with these files — **each written only at its phase, not before**:

| File | Phase | Contents | Questions allowed? |
|---|---|---|---|
| `brief.md` | 0 | User story, scope, acceptance criteria | ❌ — ask in chat |
| `exploration.md` | 1 | Current code state, key files, integration points, risks | ❌ — ask in chat |
| `research.md` | 2 | Approach options, decision, edge cases | ❌ — ask in chat |
| `plan.md` | 3 | Ordered sub-steps, files to change, test strategy | ❌ — ask in chat |
| `todo.md` | 3 | Granular checklist (checked off during Phase 4) | ❌ — ask in chat |
| `validation.md` | 5 | QA results (after chat QA approved) | ❌ — results only |

Use templates in `docs/_templates/`.

### Phase transition prompts (required literal phrases in Portuguese)

At the end of each phase:
```
Brief pronto. Posso passar para Exploration? (sim/não)
Exploration concluída. Posso passar para Research? (sim/não)
Research concluída. Posso passar para Plan + Todo? (sim/não)
Plan aprovado. Posso começar Execution? (sim/não)
Execution concluída. Rodando QA — posso começar?
QA passou. Posso registrar em validation.md? (sim/não)
```

**Hard-stop rule for Research → Plan:** Do **not** advance from `research.md` → `plan.md` while any Fast/Good/Ideal question is unanswered. Stop and ask.

### Fast / Good / Ideal decision shape (MANDATORY)

When a phase (especially Research) needs a decision, **ask in chat**, never embed the question in a doc. Use this exact prompt shape:

```
I need a decision before writing <phase>.md §<section>:

Question: <concrete question, one sentence>

Context from repo:
- <file/path evidence 1>
- <file/path evidence 2>

Options:
- Fast   → <smallest change, shortest time>. Tradeoff: <what you give up>
- Good   → <balanced, matches existing patterns like X>. Tradeoff: <what you give up>
- Ideal  → <long-term correct, more work>. Tradeoff: <what you give up>

My recommendation: <one of the three> because <reason tied to this repo>.
```

Rules:
1. **Ask in chat first.** Never write the question into the doc.
2. **Always offer a Fast / Good / Ideal triad**, grounded in this repo (cite files from `apps/web/src/`, `packages/`, etc.).
3. **Name the tradeoff** for each (latency vs consistency, dev speed vs correctness, vendor-lock vs flexibility, etc.).
4. **Only after the user answers**, write the decision into the doc as a resolved item. The doc records the choice and the reason — never the question.

### Doc anti-patterns (explicitly forbidden)

| Bad | Why |
|---|---|
| "Open questions: should we use CUID2 or UUID?" | Unresolved — ask user, record the answer. |
| "TODO: confirm with David" | Chat is for that; the doc is for the decision. |
| "Option A or B — TBD" | Pick one with a Fast/Good/Ideal triad and a recommendation, then ask. |
| "Assumption: we'll use Supabase Storage" | If it's an assumption, it's a question. Confirm before writing. |
| "??? revisit later" | Decide now with evidence, or defer with a follow-up entry in `validation.md`'s Follow-ups table. |

If a decision genuinely cannot be made now (e.g., depends on an external approval), record it in the relevant `validation.md`'s **Follow-ups** table — not inline in the phase doc.

### QA checklist (Phase 5 — in chat)

After implementation finishes, Claude runs a QA checklist in chat:
- ✅ All `plan.md` sub-steps complete
- ✅ `pnpm lint` passes (0 warnings)
- ✅ `pnpm build` passes
- ✅ Manual curl/UI test of happy path
- ✅ Manual curl/UI test of 401/403/404/400/409 edge cases
- ✅ DB side-effects verified (if applicable)
- ✅ Acceptance criteria from `brief.md` all pass
- ✅ No regressions in existing features

Results shown as table in chat. Only AFTER user approves → `validation.md` is written with the passed results.

### Commit Message Format

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

Rules: one line, imperative mood, 72 chars max.

---

## Naming Conventions

### Code
- Files: `kebab-case` (e.g., `register-user.use-case.ts`, `user-card.tsx`)
- Functions/variables: `camelCase`
- Types/Interfaces/Classes/Enums: `PascalCase`
- Enum values: `UPPER_SNAKE_CASE`
- Hooks: prefix `use`
- Be explicit: `createProjectFormSchema`, not `formSchema`
- Always named exports — never `export default` (except Next.js pages/layouts)
- No barrel files (`index.ts`) for internal component/feature folders

### Database (Prisma ⇄ PostgreSQL) — MANDATORY

| Layer | Convention | How |
|---|---|---|
| Prisma model name | `PascalCase` singular | `model TenantMembership { ... }` |
| Prisma field name | `camelCase` | `isActive Boolean` |
| **DB table name** | **`camelCase` singular** | `@@map("tenantMembership")` |
| **DB column name** | **`snake_case`** | `isActive Boolean @map("is_active")` |

**Rules:**
- Every multi-word Prisma model MUST have an `@@map("camelCaseTableName")` pointing to a camelCase table (singular).
- Every camelCase Prisma field MUST have `@map("snake_case_column_name")`.
- Enum values stay `UPPER_SNAKE_CASE` (Postgres and Prisma agree).
- Do **not** use `snake_case` for tables or `camelCase` for columns in the DB.
- `id`, `name`, `slug` and other single-word fields don't need `@map` (the names are identical in both conventions).

**Example:**
```prisma
model TenantMembership {
  id        String     @id @default(uuid())
  tenantId  String     @map("tenant_id")
  userId    String     @map("user_id")
  role      TenantRole
  isActive  Boolean    @default(true) @map("is_active")
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  @@unique([tenantId, userId])
  @@index([userId])
  @@map("tenantMembership")
}
```

Rationale: Prisma conventions (camelCase fields in TypeScript) + Postgres conventions (snake_case columns for SQL readability) — each side of the boundary stays idiomatic.

---

## Reference

- [docs/BUSINESS-FOUNDATION.md](docs/BUSINESS-FOUNDATION.md) — ⭐ Product source of truth
- [docs/CLAUDE-INSTRUCTIONS.md](docs/CLAUDE-INSTRUCTIONS.md) — Full AI workflow
- [docs/README.md](docs/README.md) — Human guide
- [docs/API-ARCHITECTURE.md](docs/API-ARCHITECTURE.md) — Backend patterns
- [docs/_templates/](docs/_templates/) — Task doc templates
- [apps/web/src/app/api/](apps/web/src/app/api/) — API routes
- [apps/web/src/server/](apps/web/src/server/) — Repositories, use-cases, schemas
- [packages/auth/](packages/auth/) — RBAC definitions
