import { listTransferRequestsForWorkspace } from '~/server/use-cases'
import { builder } from '../builder'
import { TransferRequestStatusEnum } from '../enums/transfer-request.enum'
import { gqlError } from '../errors'
import { TransferRequestType } from '../types/transfer-request.type'

builder.queryField('transferRequestsForWorkspace', (t) =>
  t.field({
    type: [TransferRequestType],
    args: {
      workspaceId: t.arg.id({ required: true }),
      status: t.arg({ type: TransferRequestStatusEnum }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listTransferRequestsForWorkspace(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.transferRequestRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          filter: { status: args.status ?? undefined },
          limit: 100,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.data
    },
  }),
)
