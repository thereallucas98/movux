import { GraphQLError } from 'graphql'

import { getMe } from '~/server/use-cases'
import { builder } from '../builder'
import { UserType } from '../types/user.type'

builder.queryField('me', (t) =>
  t.field({
    type: UserType,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) {
        throw new GraphQLError('Não autenticado', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      const result = await getMe(ctx.repos.userRepo, ctx.principal.userId)

      if (!result.success) {
        throw new GraphQLError('Não autenticado', {
          extensions: { code: result.code },
        })
      }

      return result.user
    },
  }),
)
