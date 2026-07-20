# S4-T3 — Plan

## `prisma/seed/review-tags.ts` (novo)

```ts
import { prisma } from '~/lib/db'
import type { ReviewerRole } from '~/generated/prisma/client'

interface ReviewTagSeed {
  code: string
  label: string
  targetRole: ReviewerRole
}

const REVIEW_TAGS: ReviewTagSeed[] = [
  { code: 'CAREFUL_WITH_ITEMS', label: 'Cuidadoso com os itens', targetRole: 'CARRIER' },
  { code: 'PUNCTUAL_CARRIER', label: 'Pontual', targetRole: 'CARRIER' },
  { code: 'COMMUNICATIVE', label: 'Comunicativo', targetRole: 'CARRIER' },
  { code: 'CLEAN_VEHICLE', label: 'Veículo limpo', targetRole: 'CARRIER' },
  { code: 'PROFESSIONAL', label: 'Profissional', targetRole: 'CARRIER' },
  { code: 'PUNCTUAL_CUSTOMER', label: 'Pontual', targetRole: 'CUSTOMER' },
  { code: 'CLEAR_DESCRIPTION', label: 'Descrição clara dos itens', targetRole: 'CUSTOMER' },
  { code: 'EASY_ACCESS', label: 'Acesso fácil', targetRole: 'CUSTOMER' },
  { code: 'RESPECTFUL', label: 'Respeitoso', targetRole: 'CUSTOMER' },
  { code: 'ITEMS_READY', label: 'Itens prontos pra coleta', targetRole: 'CUSTOMER' },
]

async function main() {
  for (const tag of REVIEW_TAGS) {
    await prisma.reviewTag.upsert({
      where: { code: tag.code },
      create: { ...tag, isActive: true },
      update: { label: tag.label, targetRole: tag.targetRole, isActive: true },
    })
  }

  console.log('[seed:review-tags] done', { count: REVIEW_TAGS.length })
}

main()
  .catch((error) => {
    console.error('[seed:review-tags] failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

## `package.json` — registrar no `db:seed`

```diff
- "db:seed": "dotenv -e .env -- tsx prisma/seed/geography.ts && dotenv -e .env -- tsx prisma/seed/pricing.ts",
+ "db:seed": "dotenv -e .env -- tsx prisma/seed/geography.ts && dotenv -e .env -- tsx prisma/seed/pricing.ts && dotenv -e .env -- tsx prisma/seed/review-tags.ts",
```

## Ordem de execução

1. `prisma/seed/review-tags.ts`
2. Registrar em `package.json#db:seed`
3. QA: rodar `pnpm db:seed` (roda os 3 seeds encadeados), verificar as 10 tags no banco; rodar de novo pra confirmar idempotência (sem erro, sem duplicata)
4. `pnpm exec tsc --noEmit` sem filtro, diff contra a baseline da S4-T2
