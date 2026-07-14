export interface OwnedTenant {
  id: string
  createdAt: Date
}

export type WizardInitial = { step: 1 } | { step: 2; tenantId: string }

/**
 * Server-computed entry point for the onboarding wizard. Picks the most-recent
 * SUPER_ADMIN tenant when one exists so the user resumes on step 2 after a
 * partial completion + reload.
 */
export function computeInitialStep(ownedTenants: OwnedTenant[]): WizardInitial {
  if (ownedTenants.length === 0) return { step: 1 }
  const sorted = [...ownedTenants].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )
  return { step: 2, tenantId: sorted[0].id }
}
