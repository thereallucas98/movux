import { gqlError } from '../errors'
import { builder } from '../builder'
import { NeighborhoodType } from '../types/neighborhood.type'

builder.queryField('neighborhoods', (t) =>
  t.field({
    type: [NeighborhoodType],
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      return ctx.repos.geographyRepo.listNeighborhoods()
    },
  }),
)
