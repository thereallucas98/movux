import {
  approveCarrierDocument,
  recordExternalValidation,
  rejectCarrierDocument,
} from '~/server/use-cases'
import { builder } from '../builder'
import { ExternalValidationResultEnum } from '../enums/carrier-document.enum'
import { gqlError, gqlErrorFromResult } from '../errors'

const ExternalValidationInput = builder.inputType('ExternalValidationInput', {
  fields: (t) => ({
    result: t.field({ type: ExternalValidationResultEnum, required: true }),
    notes: t.string(),
  }),
})

builder.mutationField('approveCarrierDocument', (t) =>
  t.field({
    type: 'Boolean',
    args: { documentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')

      const result = await approveCarrierDocument(
        {
          carrierDocumentRepo: ctx.repos.carrierDocumentRepo,
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.documentId),
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)

builder.mutationField('rejectCarrierDocument', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      documentId: t.arg.id({ required: true }),
      rejectionReason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')

      const result = await rejectCarrierDocument(
        {
          carrierDocumentRepo: ctx.repos.carrierDocumentRepo,
          userRepo: ctx.repos.userRepo,
          notificationLogRepo: ctx.repos.notificationLogRepo,
        },
        ctx.principal.userId,
        String(args.documentId),
        args.rejectionReason,
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)

builder.mutationField('recordExternalValidation', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      documentId: t.arg.id({ required: true }),
      input: t.arg({ type: ExternalValidationInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')

      const result = await recordExternalValidation(
        { carrierDocumentRepo: ctx.repos.carrierDocumentRepo },
        ctx.principal.userId,
        String(args.documentId),
        {
          result: args.input.result,
          notes: args.input.notes ?? undefined,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return true
    },
  }),
)
