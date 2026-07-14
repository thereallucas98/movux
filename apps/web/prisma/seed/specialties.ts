/**
 * Seed GLOBAL specialties per vertical.
 *
 * Local-only — not wired into CI. Run via `pnpm --filter web db:seed`
 * (composite with categories.ts).
 * Idempotent via ON CONFLICT DO UPDATE using the (scope, vertical, tenant_id,
 * workspace_id, slug) NULLS NOT DISTINCT unique index.
 *
 * Source of truth: BUSINESS-FOUNDATION.md §7.4 (HOSPITAL + GYM) +
 * Task 05 Q2 Good (CLINIC 7 slugs) + Task 05 Q3 Fast (OTHER 1 slug).
 */

import 'dotenv/config'
import { Pool } from 'pg'

type Vertical = 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'

const SPECIALTY_SEED_CATALOG: Record<
  Vertical,
  Array<{ slug: string; name: string }>
> = {
  HOSPITAL: [
    { slug: 'nurse', name: 'Enfermeiro(a)' },
    { slug: 'nurse_tech', name: 'Técnico(a) de Enfermagem' },
    { slug: 'nursing_intern', name: 'Estagiário(a) de Enfermagem' },
    { slug: 'doctor', name: 'Médico(a)' },
    { slug: 'medical_intern', name: 'Estagiário(a) de Medicina' },
    { slug: 'receptionist', name: 'Recepcionista' },
    { slug: 'cleaning_staff', name: 'Limpeza/Higienização' },
    { slug: 'admin_staff', name: 'Administrativo' },
  ],
  CLINIC: [
    { slug: 'doctor', name: 'Médico(a)' },
    { slug: 'dentist', name: 'Dentista' },
    { slug: 'nurse', name: 'Enfermeiro(a)' },
    { slug: 'nurse_tech', name: 'Técnico(a) de Enfermagem' },
    { slug: 'receptionist', name: 'Recepcionista' },
    { slug: 'cleaning_staff', name: 'Limpeza/Higienização' },
    { slug: 'admin_staff', name: 'Administrativo' },
  ],
  GYM: [
    { slug: 'weights_instructor', name: 'Instrutor(a) de Musculação' },
    { slug: 'functional_instructor', name: 'Instrutor(a) Funcional' },
    { slug: 'swim_instructor', name: 'Instrutor(a) de Natação' },
    { slug: 'group_instructor', name: 'Professor(a) de Aulas Coletivas' },
    { slug: 'personal_trainer', name: 'Personal Trainer' },
    { slug: 'instructor_intern', name: 'Estagiário(a) de Instrutor' },
    { slug: 'receptionist', name: 'Recepcionista' },
  ],
  OTHER: [{ slug: 'general_staff', name: 'Geral' }],
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const pool = new Pool({ connectionString })
  try {
    let count = 0
    for (const [vertical, items] of Object.entries(
      SPECIALTY_SEED_CATALOG,
    ) as Array<[Vertical, Array<{ slug: string; name: string }>]>) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO "specialty"
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
    console.log(`Seeded ${count} GLOBAL specialties.`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
