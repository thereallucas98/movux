'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { WizardInitial } from './compute-initial-step'
import { StepCreateTenant } from './step-create-tenant'
import { StepCreateWorkspace } from './step-create-workspace'
import { StepIndicator } from './step-indicator'
import { StepInviteMembers } from './step-invite-members'
import { StepPickSpecialty } from './step-pick-specialty'

type WizardState =
  | { step: 1 }
  | { step: 2; tenantId: string }
  | { step: 3; tenantId: string; workspaceId: string; membershipId: string }
  | { step: 4; tenantId: string; workspaceId: string }

interface Props {
  initial: WizardInitial
}

export function OnboardingWizard({ initial }: Props) {
  const router = useRouter()
  // computeInitialStep returns at most { step: 1 | 2 } — workspace creation
  // (step 2 → 3) sets membershipId from the API response; on refresh past
  // step 3 the user is already a workspace member and bypasses onboarding
  // entirely via /onboarding/page.tsx redirect.
  const [state, setState] = useState<WizardState>(initial as WizardState)

  return (
    <div data-slot="onboarding-wizard">
      <StepIndicator current={state.step} />

      {state.step === 1 && (
        <StepCreateTenant
          onSuccess={(tenantId) => setState({ step: 2, tenantId })}
        />
      )}

      {state.step === 2 && (
        <StepCreateWorkspace
          tenantId={state.tenantId}
          onSuccess={({ workspaceId, membershipId }) =>
            setState({
              step: 3,
              tenantId: state.tenantId,
              workspaceId,
              membershipId,
            })
          }
        />
      )}

      {state.step === 3 && (
        <StepPickSpecialty
          workspaceId={state.workspaceId}
          membershipId={state.membershipId}
          onSuccess={() =>
            setState({
              step: 4,
              tenantId: state.tenantId,
              workspaceId: state.workspaceId,
            })
          }
        />
      )}

      {state.step === 4 && (
        <StepInviteMembers
          workspaceId={state.workspaceId}
          onDone={() => router.push(`/dashboard?ws=${state.workspaceId}`)}
        />
      )}
    </div>
  )
}
