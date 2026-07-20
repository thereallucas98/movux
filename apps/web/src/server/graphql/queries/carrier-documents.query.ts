import { listCarrierDocumentsForAdmin } from '~/server/use-cases'
import { builder } from '../builder'
import { VerificationStatusEnum } from '../enums/carrier-document.enum'
import { gqlError } from '../errors'
import {
  CarrierDocumentConnectionType,
  toGraphQLCarrierDocument,
} from '../types/carrier-document.type'

builder.queryField('carrierDocuments', (t) =>
  t.field({
    type: CarrierDocumentConnectionType,
    args: {
      status: t.arg({ type: VerificationStatusEnum }),
      cursor: t.arg.id(),
      limit: t.arg.int(),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')

      const result = await listCarrierDocumentsForAdmin(
        { carrierDocumentRepo: ctx.repos.carrierDocumentRepo },
        {
          status: args.status ?? undefined,
          cursor: args.cursor ? String(args.cursor) : undefined,
          limit: args.limit ?? undefined,
        },
      )

      return {
        data: result.data.map(toGraphQLCarrierDocument),
        nextCursor: result.nextCursor,
      }
    },
  }),
)
