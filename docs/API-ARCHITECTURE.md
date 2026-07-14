# API Architecture (SOLID + Clean)

How to create or modify endpoints in this template.

## Principles

- **S (Single Responsibility)**: Routes only parse, validate, call use cases, and format HTTP responses
- **O (Open/Closed)**: New behaviors come from new use cases, not from editing existing ones
- **L (Liskov)**: Repositories implement interfaces; can be swapped (e.g., mocks in tests)
- **I (Interface Segregation)**: Repositories expose specific methods, not "god objects"
- **D (Dependency Inversion)**: Use cases receive repositories as parameters; do not import Prisma directly

## Folder structure

```
apps/web/src/
├── server/
│   ├── repositories/       # Data access (encapsulates Prisma)
│   │   ├── user.repository.ts
│   │   └── index.ts        # Exports instances with injected prisma
│   ├── use-cases/          # Business logic
│   │   ├── auth/
│   │   ├── me/
│   │   └── index.ts
│   ├── schemas/            # Shared Zod schemas
│   │   ├── auth.schema.ts
│   │   └── me.schema.ts
│   └── http/               # HTTP helpers (cookies, etc.)
│       └── cookie.ts
├── lib/                    # Utilities (auth, db, session, get-principal)
└── app/api/                # Next.js routes (thin layer)
```

## Request flow

```
Request → Route (parse + validate Zod) → Use Case (business logic) → Repository (data) → Route (format response)
```

## How to create a new endpoint

### 1. Schema (if body is needed)

Create or extend in `server/schemas/`:

```ts
// server/schemas/my-domain.schema.ts
import { z } from 'zod'

export const MySchema = z.object({
  field: z.string().min(1),
  email: z.email(),
})
```

### 2. Repository (if new methods are needed)

Create in `server/repositories/` or extend an existing one:

```ts
// Interface defines the contract
export interface MyRepository {
  findById(id: string): Promise<MyModel | null>
}

// createMyRepository(prisma) returns implementation
export function createMyRepository(prisma: PrismaClient): MyRepository {
  return {
    async findById(id) {
      return prisma.myModel.findUnique({ where: { id } })
    },
  }
}
```

Register in `server/repositories/index.ts`.

### 3. Use Case

Create in `server/use-cases/my-domain/`:

```ts
// server/use-cases/my-domain/my-use-case.ts
import type { MyRepository } from '../../repositories/my.repository'

export interface MyUseCaseInput { ... }

export type MyUseCaseResult =
  | { success: true; data: ... }
  | { success: false; code: 'UNAUTHENTICATED' | 'FORBIDDEN' | ... }

export async function myUseCase(
  myRepo: MyRepository,
  principal: Principal | null,
  input: MyUseCaseInput
): Promise<MyUseCaseResult> {
  if (!principal) return { success: false, code: 'UNAUTHENTICATED' }
  // business rules...
  const data = await myRepo.findById(input.id)
  return { success: true, data }
}
```

Export in `server/use-cases/index.ts`.

### 4. Route

The route stays thin:

```ts
// app/api/my-domain/route.ts
import { NextResponse } from 'next/server'
import { getPrincipal } from '~/lib/get-principal'
import { myRepository } from '~/server/repositories'
import { myUseCase } from '~/server/use-cases'
import { MySchema } from '~/server/schemas/my-domain.schema'

export async function POST(req: Request) {
  const principal = await getPrincipal(req)

  const body = await req.json().catch(() => null)
  const parsed = MySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid payload', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const result = await myUseCase(myRepository, principal, parsed.data)

  if (!result.success) {
    const status = mapCodeToStatus(result.code)
    return NextResponse.json({ message: mapCodeToMessage(result.code) }, { status })
  }

  return NextResponse.json(result.data, { status: 201 })
}
```

## Authentication

- **getPrincipal(req)** in `lib/get-principal.ts`: returns `{ userId, role }` or `null`
- Protected routes: `if (!principal) return 401`
- Role rules: check `principal.role` in the use case

## Error response pattern

Use cases return `{ success: false, code: '...' }`. Routes map common codes:

| code                  | HTTP status |
|-----------------------|-------------|
| UNAUTHENTICATED       | 401         |
| FORBIDDEN             | 403         |
| NOT_FOUND             | 404         |
| VALIDATION_ERROR      | 400         |
| CONFLICT              | 409         |

Extend this mapping per domain as new codes are introduced.

## Zod

- Use `z.email()` and `z.uuid()` (Zod 4) — NOT `z.string().email()` / `z.string().uuid()`
- Validation in the route; use case receives already-validated data
- Error response: `{ message: 'Invalid payload', details: parsed.error.issues }` with status 400
