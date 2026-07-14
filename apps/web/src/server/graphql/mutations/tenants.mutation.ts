import {
  addTenantMember,
  changeTenantPlan,
  createTenant,
  removeTenantMember,
  softDeleteTenant,
  updateTenant,
} from '~/server/use-cases'
import { builder } from '../builder'
import { PlanTierEnum } from '../enums/plan-tier.enum'
import { gqlError } from '../errors'
import { TenantMembershipType } from '../types/tenant-membership.type'
import { TenantPlanChangeResultType, TenantType } from '../types/tenant.type'

// ─── Input types ─────────────────────────────────────────────────────────────

const CreateTenantInput = builder.inputType('CreateTenantInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    timezone: t.string(),
  }),
})

const UpdateTenantInput = builder.inputType('UpdateTenantInput', {
  fields: (t) => ({
    name: t.string(),
    timezone: t.string(),
  }),
})

const AddTenantMemberInput = builder.inputType('AddTenantMemberInput', {
  fields: (t) => ({
    userId: t.id({ required: true }),
    role: t.string({ required: true }),
  }),
})

// ─── Mutations ───────────────────────────────────────────────────────────────

builder.mutationField('createTenant', (t) =>
  t.field({
    type: TenantType,
    args: { input: t.arg({ type: CreateTenantInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await createTenant(
        ctx.repos.tenantRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          name: args.input.name,
          timezone: args.input.timezone ?? undefined,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.tenant
    },
  }),
)

builder.mutationField('updateTenant', (t) =>
  t.field({
    type: TenantType,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateTenantInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const data: { name?: string; timezone?: string } = {}
      if (args.input.name !== null && args.input.name !== undefined) {
        data.name = args.input.name
      }
      if (args.input.timezone !== null && args.input.timezone !== undefined) {
        data.timezone = args.input.timezone
      }
      if (Object.keys(data).length === 0) {
        throw gqlError(
          'VALIDATION_ERROR',
          'At least one field must be provided',
        )
      }

      const result = await updateTenant(
        ctx.repos.tenantRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { tenantId: String(args.id), data },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.mutationField('deleteTenant', (t) =>
  t.boolean({
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await softDeleteTenant(
        ctx.repos.tenantRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { tenantId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)

builder.mutationField('addTenantMember', (t) =>
  t.field({
    type: TenantMembershipType,
    args: {
      tenantId: t.arg.id({ required: true }),
      input: t.arg({ type: AddTenantMemberInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (args.input.role !== 'SUPER_ADMIN') {
        throw gqlError('VALIDATION_ERROR', 'role must be SUPER_ADMIN')
      }
      const result = await addTenantMember(
        ctx.repos.tenantMembershipRepo,
        ctx.repos.userRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          tenantId: String(args.tenantId),
          userId: String(args.input.userId),
          role: 'SUPER_ADMIN',
        },
      )
      if (!result.success) throw gqlError(result.code)
      return { ...result.data, user: null }
    },
  }),
)

builder.mutationField('removeTenantMember', (t) =>
  t.boolean({
    args: {
      tenantId: t.arg.id({ required: true }),
      memberId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await removeTenantMember(
        ctx.repos.tenantMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          tenantId: String(args.tenantId),
          memberId: String(args.memberId),
        },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)

builder.mutationField('changeTenantPlan', (t) =>
  t.field({
    type: TenantPlanChangeResultType,
    args: {
      tenantId: t.arg.id({ required: true }),
      plan: t.arg({ type: PlanTierEnum, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await changeTenantPlan(
        ctx.repos.tenantRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          tenantId: String(args.tenantId),
          plan: args.plan,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return {
        tenant: result.data.tenant,
        previousPlan: result.data.previousPlan,
        gracePeriodUntil: result.data.gracePeriodUntil,
        violations: result.data.violations.map((v) => ({
          resource: v.resource,
          workspaceId: v.workspaceId ?? null,
          current: v.current,
          newLimit: v.newLimit,
        })),
      }
    },
  }),
)
