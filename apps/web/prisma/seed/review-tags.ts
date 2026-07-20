import type { ReviewerRole } from '~/generated/prisma/client'
import { prisma } from '~/lib/db'

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
