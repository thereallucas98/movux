import {
  createWorkspaceCategory,
  softDeleteWorkspaceCategory,
  updateWorkspaceCategory,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { WorkspaceCategoryType } from '../types/category.type'

const CreateWorkspaceCategoryInput = builder.inputType(
  'CreateWorkspaceCategoryInput',
  {
    fields: (t) => ({
      slug: t.string({ required: true }),
      name: t.string({ required: true }),
      description: t.string(),
    }),
  },
)

const UpdateWorkspaceCategoryInput = builder.inputType(
  'UpdateWorkspaceCategoryInput',
  {
    fields: (t) => ({
      name: t.string(),
      description: t.string(),
    }),
  },
)

builder.mutationField('createWorkspaceCategory', (t) =>
  t.field({
    type: WorkspaceCategoryType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      input: t.arg({
        type: CreateWorkspaceCategoryInput,
        required: true,
      }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await createWorkspaceCategory(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          slug: args.input.slug,
          name: args.input.name,
          description: args.input.description ?? undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('updateWorkspaceCategory', (t) =>
  t.field({
    type: WorkspaceCategoryType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      categoryId: t.arg.id({ required: true }),
      input: t.arg({
        type: UpdateWorkspaceCategoryInput,
        required: true,
      }),
    },
    resolve: async (_root, args, ctx) => {
      const data: { name?: string; description?: string | null } = {}
      if (args.input.name !== null && args.input.name !== undefined) {
        data.name = args.input.name
      }
      if (
        args.input.description !== null &&
        args.input.description !== undefined
      ) {
        data.description = args.input.description
      }
      if (Object.keys(data).length === 0) {
        throw gqlError(
          'VALIDATION_ERROR',
          'At least one field must be provided',
        )
      }

      const result = await updateWorkspaceCategory(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          categoryId: String(args.categoryId),
          data,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('deleteWorkspaceCategory', (t) =>
  t.boolean({
    args: {
      workspaceId: t.arg.id({ required: true }),
      categoryId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await softDeleteWorkspaceCategory(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.categoryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          categoryId: String(args.categoryId),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return true
    },
  }),
)
