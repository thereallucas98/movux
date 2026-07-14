import { getTenantPlanLimits, getWorkspacePlanLimits } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import {
  TenantPlanLimitsType,
  WorkspacePlanLimitsType,
} from '../types/plan-limits.type'

builder.queryField('tenantPlanLimits', (t) =>
  t.field({
    type: TenantPlanLimitsType,
    args: {
      tenantId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await getTenantPlanLimits(
        ctx.repos.tenantRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.principal,
        { tenantId: String(args.tenantId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.queryField('workspacePlanLimits', (t) =>
  t.field({
    type: WorkspacePlanLimitsType,
    args: {
      workspaceId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await getWorkspacePlanLimits(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.tenantRepo,
        ctx.principal,
        { workspaceId: String(args.workspaceId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
