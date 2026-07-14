import {
  setWorkspaceMemberSpecialty,
  unsetWorkspaceMemberSpecialty,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'

// Returns the full userSpecialty row as Boolean-OK; frontend refetches member detail
// for authoritative state. Keeping Boolean keeps the surface small.

builder.mutationField('setWorkspaceMemberSpecialty', (t) =>
  t.boolean({
    args: {
      workspaceId: t.arg.id({ required: true }),
      memberId: t.arg.id({ required: true }),
      specialtyId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await setWorkspaceMemberSpecialty(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.repos.specialtyRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          memberId: String(args.memberId),
          specialtyId: String(args.specialtyId),
        },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)

builder.mutationField('unsetWorkspaceMemberSpecialty', (t) =>
  t.boolean({
    args: {
      workspaceId: t.arg.id({ required: true }),
      memberId: t.arg.id({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await unsetWorkspaceMemberSpecialty(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.userSpecialtyRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          memberId: String(args.memberId),
        },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)
