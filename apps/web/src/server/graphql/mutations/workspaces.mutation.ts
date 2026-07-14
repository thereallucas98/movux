import {
  addWorkspaceMember,
  changeWorkspaceMemberRole,
  createWorkspace,
  removeWorkspaceMember,
  softDeleteWorkspace,
  updateWorkspace,
} from '~/server/use-cases'
import { builder } from '../builder'
import {
  WorkspaceRoleEnum,
  WorkspaceVerticalEnum,
} from '../enums/workspace.enum'
import { gqlError, gqlErrorFromResult } from '../errors'
import { WorkspaceMembershipType } from '../types/workspace-membership.type'
import { WorkspaceType } from '../types/workspace.type'

// ─── Input types ─────────────────────────────────────────────────────────────

const CreateWorkspaceInput = builder.inputType('CreateWorkspaceInput', {
  fields: (t) => ({
    tenantId: t.id({ required: true }),
    name: t.string({ required: true }),
    vertical: t.field({ type: WorkspaceVerticalEnum, required: true }),
    timezone: t.string(),
  }),
})

const UpdateWorkspaceInput = builder.inputType('UpdateWorkspaceInput', {
  fields: (t) => ({
    name: t.string(),
    timezone: t.string(),
    vertical: t.field({ type: WorkspaceVerticalEnum }),
  }),
})

const AddWorkspaceMemberInput = builder.inputType('AddWorkspaceMemberInput', {
  fields: (t) => ({
    email: t.string({ required: true }),
    role: t.field({ type: WorkspaceRoleEnum, required: true }),
    specialtyId: t.id({ required: true }),
  }),
})

// ─── Mutations ───────────────────────────────────────────────────────────────

builder.mutationField('createWorkspace', (t) =>
  t.field({
    type: WorkspaceType,
    args: { input: t.arg({ type: CreateWorkspaceInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await createWorkspace(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.tenantMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          tenantId: String(args.input.tenantId),
          name: args.input.name,
          vertical: args.input.vertical,
          timezone: args.input.timezone ?? undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data.workspace
    },
  }),
)

builder.mutationField('updateWorkspace', (t) =>
  t.field({
    type: WorkspaceType,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateWorkspaceInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const data: {
        name?: string
        timezone?: string
        vertical?: 'HOSPITAL' | 'CLINIC' | 'GYM' | 'OTHER'
      } = {}
      if (args.input.name !== null && args.input.name !== undefined) {
        data.name = args.input.name
      }
      if (args.input.timezone !== null && args.input.timezone !== undefined) {
        data.timezone = args.input.timezone
      }
      if (args.input.vertical !== null && args.input.vertical !== undefined) {
        data.vertical = args.input.vertical
      }
      if (Object.keys(data).length === 0) {
        throw gqlError(
          'VALIDATION_ERROR',
          'At least one field must be provided',
        )
      }

      const result = await updateWorkspace(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { workspaceId: String(args.id), data },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('deleteWorkspace', (t) =>
  t.boolean({
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await softDeleteWorkspace(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { workspaceId: String(args.id) },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return true
    },
  }),
)

builder.mutationField('addWorkspaceMember', (t) =>
  t.field({
    type: WorkspaceMembershipType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      input: t.arg({ type: AddWorkspaceMemberInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await addWorkspaceMember(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.userRepo,
        ctx.repos.auditLogRepo,
        ctx.repos.specialtyRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          email: args.input.email,
          role: args.input.role,
          specialtyId: String(args.input.specialtyId),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return { ...result.data, user: null }
    },
  }),
)

builder.mutationField('changeWorkspaceMemberRole', (t) =>
  t.field({
    type: WorkspaceMembershipType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      memberId: t.arg.id({ required: true }),
      role: t.arg({ type: WorkspaceRoleEnum, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await changeWorkspaceMemberRole(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          memberId: String(args.memberId),
          role: args.role,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return { ...result.data, user: null }
    },
  }),
)

builder.mutationField('removeWorkspaceMember', (t) =>
  t.boolean({
    args: {
      workspaceId: t.arg.id({ required: true }),
      memberId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await removeWorkspaceMember(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          memberId: String(args.memberId),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return true
    },
  }),
)
