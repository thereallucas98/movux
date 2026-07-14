/**
 * Seed GLOBAL categories per vertical.
 *
 * Local-only — not wired into CI. Run via `pnpm --filter web db:seed`.
 * Idempotent via ON CONFLICT DO UPDATE using the (scope, vertical, tenant_id,
 * workspace_id, slug) NULLS NOT DISTINCT unique index.
 *
 * Source of truth for slug/name pairs: BUSINESS-FOUNDATION.md §7.3.
 */

import 'dotenv/config'
import { Pool } from 'pg'

type Vertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

const SEED_CATALOG: Record<Vertical, Array<{ slug: string; name: string }>> = {
  HOSPITAL: [
    { slug: 'icu', name: 'UTI' },
    { slug: 'emergency', name: 'Pronto-Socorro' },
    { slug: 'pediatrics', name: 'Pediatria' },
    { slug: 'nursing', name: 'Enfermagem' },
    { slug: 'reception', name: 'Recepção' },
    { slug: 'administrative', name: 'Administrativo' },
    { slug: 'cleaning', name: 'Higienização' },
  ],
  CLINIC: [
    { slug: 'reception', name: 'Recepção' },
    { slug: 'administrative', name: 'Administrativo' },
    { slug: 'cleaning', name: 'Higienização' },
    { slug: 'consultation', name: 'Consultório' },
    { slug: 'exams', name: 'Exames' },
    { slug: 'dental', name: 'Odontologia' },
  ],
  GYM: [
    { slug: 'weights', name: 'Musculação' },
    { slug: 'functional', name: 'Funcional' },
    { slug: 'swimming', name: 'Natação' },
    { slug: 'classes', name: 'Aulas Coletivas' },
    { slug: 'reception', name: 'Recepção' },
    { slug: 'personal', name: 'Personal Training' },
  ],
  OTHER: [{ slug: 'general', name: 'Geral' }],
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({ connectionString })
  try {
    let count = 0
    for (const [vertical, items] of Object.entries(SEED_CATALOG) as Array<
      [Vertical, Array<{ slug: string; name: string }>]
    >) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO "category"
             (id, scope, vertical, slug, name, updated_at)
           VALUES
             (gen_random_uuid(), 'GLOBAL', $1::"WorkspaceVertical", $2, $3, NOW())
           ON CONFLICT (scope, vertical, tenant_id, workspace_id, slug)
           DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
          [vertical, item.slug, item.name],
        )
        count += 1
      }
    }
    // eslint-disable-next-line no-console
    console.log(`Seeded ${count} GLOBAL categories.`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
