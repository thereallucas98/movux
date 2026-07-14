import {
  createWorkspaceSpecialty,
  softDeleteWorkspaceSpecialty,
  updateWorkspaceSpecialty,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import { SpecialtyType } from '../types/specialty.type'

const CreateWorkspaceSpecialtyInput = builder.inputType(
  'CreateWorkspaceSpecialtyInput',
  {
    fields: (t) => ({
      slug: t.string({ required: true }),
      name: t.string({ required: true }),
      description: t.string(),
    }),
  },
)

const UpdateWorkspaceSpecialtyInput = builder.inputType(
  'UpdateWorkspaceSpecialtyInput',
  {
    fields: (t) => ({
      name: t.string(),
      description: t.string(),
    }),
  },
)

builder.mutationField('createWorkspaceSpecialty', (t) =>
  t.field({
    type: SpecialtyType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      input: t.arg({
        type: CreateWorkspaceSpecialtyInput,
        required: true,
      }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await createWorkspaceSpecialty(
        ctx.repos.workspaceRepo,
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.specialtyRepo,
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
      // Non-nullable source required on type; WORKSPACE-scope for creates.
      return { ...result.data, source: 'WORKSPACE' as const }
    },
  }),
)

builder.mutationField('updateWorkspaceSpecialty', (t) =>
  t.field({
    type: SpecialtyType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      specialtyId: t.arg.id({ required: true }),
      input: t.arg({
        type: UpdateWorkspaceSpecialtyInput,
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

      const result = await updateWorkspaceSpecialty(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.specialtyRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          specialtyId: String(args.specialtyId),
          data,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return { ...result.data, source: 'WORKSPACE' as const }
    },
  }),
)

builder.mutationField('deleteWorkspaceSpecialty', (t) =>
  t.boolean({
    args: {
      workspaceId: t.arg.id({ required: true }),
      specialtyId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await softDeleteWorkspaceSpecialty(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.specialtyRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.repos.shiftCompositionRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          specialtyId: String(args.specialtyId),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return true
    },
  }),
)
