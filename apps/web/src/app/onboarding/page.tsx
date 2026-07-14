import { redirect } from 'next/navigation'

import { OnboardingWizard } from '~/components/features/onboarding/onboarding-wizard'
import { computeInitialStep } from '~/components/features/onboarding/compute-initial-step'
import { prisma } from '~/lib/db'
import { getServerPrincipal } from '~/lib/get-server-principal'
import { workspaceRepository } from '~/server/repositories'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const principal = await getServerPrincipal()
  if (!principal) redirect('/login')

  const wsPage = await workspaceRepository.listForUser(
    principal.userId,
    null,
    100,
  )
  if (wsPage.data.length > 0) redirect('/dashboard')

  // Find tenants where this user is an active SUPER_ADMIN — those are the
  // ones step 2 (createWorkspace) will accept.
  const ownedTenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
      memberships: {
        some: {
          userId: principal.userId,
          isActive: true,
          role: 'SUPER_ADMIN',
        },
      },
    },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })

  const initial = computeInitialStep(ownedTenants)
  return <OnboardingWizard initial={initial} />
}
