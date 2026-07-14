import { GraphQLError } from 'graphql'

import { changePassword, updateMe } from '~/server/use-cases'
import { builder } from '../builder'
import { UserType } from '../types/user.type'

const UpdateMeInput = builder.inputType('UpdateMeInput', {
  fields: (t) => ({
    fullName: t.string(),
    phone: t.string(),
    avatarUrl: t.string(),
    dateOfBirth: t.field({ type: 'DateTime' }),
    bio: t.string(),
    whatsappOptIn: t.boolean(),
    emergencyContactName: t.string(),
    emergencyContactPhone: t.string(),
  }),
})

const ChangePasswordInput = builder.inputType('ChangePasswordInput', {
  fields: (t) => ({
    currentPassword: t.string({ required: true }),
    newPassword: t.string({ required: true }),
  }),
})

builder.mutationField('updateMe', (t) =>
  t.field({
    type: UserType,
    args: {
      input: t.arg({ type: UpdateMeInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) {
        throw new GraphQLError('Não autenticado', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const result = await updateMe(
        ctx.repos.userRepo,
        ctx.repos.auditLogRepo,
        {
          userId: ctx.principal.userId,
          fullName: args.input.fullName ?? undefined,
          phone: args.input.phone ?? undefined,
          avatarUrl: args.input.avatarUrl ?? undefined,
          dateOfBirth:
            args.input.dateOfBirth === null ||
            args.input.dateOfBirth === undefined
              ? (args.input.dateOfBirth as Date | null | undefined)
              : new Date(args.input.dateOfBirth as Date | string),
          bio: args.input.bio ?? undefined,
          whatsappOptIn: args.input.whatsappOptIn ?? undefined,
          emergencyContactName: args.input.emergencyContactName ?? undefined,
          emergencyContactPhone: args.input.emergencyContactPhone ?? undefined,
        },
      )

      return result.data
    },
  }),
)

builder.mutationField('changePassword', (t) =>
  t.boolean({
    args: {
      input: t.arg({ type: ChangePasswordInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) {
        throw new GraphQLError('Não autenticado', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const result = await changePassword(ctx.repos.userRepo, {
        userId: ctx.principal.userId,
        email: ctx.principal.email,
        currentPassword: args.input.currentPassword,
        newPassword: args.input.newPassword,
      })

      if (!result.success) {
        throw new GraphQLError('Senha atual incorreta', {
          extensions: { code: result.code },
        })
      }

      return true
    },
  }),
)
