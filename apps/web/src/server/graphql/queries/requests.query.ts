import { getRequest, listRequests } from '~/server/use-cases'
import { builder } from '../builder'
import {
  RequestScopeEnum,
  RequestStatusEnum,
  RequestTypeEnum,
} from '../enums/request.enum'
import { gqlError } from '../errors'
import { RequestType, toRequestPayload } from '../types/request.type'

builder.queryField('requests', (t) =>
  t.field({
    type: [RequestType],
    args: {
      workspaceId: t.arg.id({ required: true }),
      status: t.arg({ type: RequestStatusEnum }),
      type: t.arg({ type: RequestTypeEnum }),
      scope: t.arg({ type: RequestScopeEnum }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listRequests(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.requestRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          status: args.status ?? undefined,
          type: args.type ?? undefined,
          scope: args.scope ?? 'mine',
          limit: 100,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.map(toRequestPayload)
    },
  }),
)

builder.queryField('request', (t) =>
  t.field({
    type: RequestType,
    args: { id: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await getRequest(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.requestRepo,
        ctx.principal,
        { requestId: String(args.id) },
      )
      if (!result.success) throw gqlError(result.code)
      return toRequestPayload(result.data)
    },
  }),
)
