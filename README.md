# Movux

**Scheduled freight and moving marketplace with progressive safety layers.**

> *"Chama um Movux."*

Match customers who need to move their belongings with verified independent carriers — with trust and safety built in from day one.

📘 **Read the product foundation first:** [`docs/BUSINESS-FOUNDATION.md`](docs/BUSINESS-FOUNDATION.md)

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL + Prisma |
| Auth | JWT (httpOnly cookie) + CASL RBAC |
| GraphQL | graphql-yoga + Pothos + graphql-request + codegen |
| Validation | Zod |
| Forms | React Hook Form + zodResolver |
| Data fetching | React Query |
| State | Zustand |
| UI | shadcn/ui (Radix) + TailwindCSS |

---

## Getting started

```bash
pnpm install
docker compose up -d
cp .env.example apps/web/.env
cd apps/web && pnpm db:generate && pnpm db:migrate
pnpm dev
```

Visit [http://localhost:3001](http://localhost:3001).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (port 3001) |
| `pnpm build` | Production build |
| `pnpm lint` | tsc + ESLint (0 warnings) |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Prisma Studio |

## Docs

- [docs/BUSINESS-FOUNDATION.md](docs/BUSINESS-FOUNDATION.md) — Product decisions and domain
- [docs/CLAUDE-INSTRUCTIONS.md](docs/CLAUDE-INSTRUCTIONS.md) — AI assistant instructions
