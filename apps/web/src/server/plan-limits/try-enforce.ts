import { prisma } from '~/lib/db'

import {
  enforceQuota,
  enforcePerUploadAttachmentSize,
  type EnforceQuotaArgs,
  type TenantContext,
} from './enforce-quota'
import { isPlanLimitError } from './plan-limit-error'
import type { PlanLimitMeta } from './plan-limit-meta'
import type { PlanTier } from './plan-limits.config'

/**
 * Discriminated-union failure shape returned by use-case wiring helpers.
 * Use cases extend their `Result` union with this branch and can return it
 * straight out of `tryEnforce*` with no further mapping.
 */
export interface PlanLimitFailure {
  success: false
  code: 'PLAN_LIMIT_REACHED'
  meta: PlanLimitMeta
}

/** Wraps `enforceQuota` and converts `PlanLimitError` into the failure branch. */
export async function tryEnforce(
  args: EnforceQuotaArgs,
): Promise<PlanLimitFailure | null> {
  try {
    await enforceQuota({ db: prisma }, args)
    return null
  } catch (e) {
    if (isPlanLimitError(e)) {
      return { success: false, code: 'PLAN_LIMIT_REACHED', meta: e.meta }
    }
    throw e
  }
}

/** Variant that synchronously checks per-upload size cap. */
export function tryEnforceAttachmentSize(
  plan: PlanTier,
  sizeBytes: number,
): PlanLimitFailure | null {
  try {
    enforcePerUploadAttachmentSize(plan, sizeBytes)
    return null
  } catch (e) {
    if (isPlanLimitError(e)) {
      return { success: false, code: 'PLAN_LIMIT_REACHED', meta: e.meta }
    }
    throw e
  }
}

/**
 * Convenience: load the tenant and shape it as a `TenantContext` consumable by
 * `enforceQuota`. Caller-provided `db` is honored if passed (for tx-scoped reads).
 */
export async function loadTenantContext(
  tenantId: string,
): Promise<TenantContext | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, isActive: true },
    select: {
      id: true,
      plan: true,
      gracePeriodUntil: true,
      timezone: true,
    },
  })
  if (!tenant) return null
  return tenant
}

/**
 * Variant that resolves the tenant via a workspaceId. Returns the workspace's
 * timezone (which `enforceQuota` prefers for monthly counters) alongside the
 * tenant context.
 */
export async function loadTenantContextByWorkspaceId(
  workspaceId: string,
): Promise<(TenantContext & { workspaceTimezone: string }) | null> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, isActive: true },
    select: {
      timezone: true,
      tenant: {
        select: {
          id: true,
          plan: true,
          gracePeriodUntil: true,
          timezone: true,
        },
      },
    },
  })
  if (!workspace) return null
  return { ...workspace.tenant, workspaceTimezone: workspace.timezone }
}
