import {
  cancelRequest,
  peerRespondSwap,
  resolveRequest,
  submitOfferRequest,
  submitSwapRequest,
  submitTimeOffRequest,
} from '~/server/use-cases'
import { builder } from '../builder'
import {
  PeerRespondDecisionEnum,
  RequestResolveDecisionEnum,
} from '../enums/request.enum'
import { gqlError } from '../errors'
import { RequestType, toRequestPayload } from '../types/request.type'

builder.mutationField('submitSwapRequest', (t) =>
  t.field({
    type: RequestType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      swapSourceAssignmentId: t.arg.id({ required: true }),
      swapTargetUserId: t.arg.id({ required: true }),
      swapTargetAssignmentId: t.arg.id({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const r = await submitSwapRequest(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.requestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          swapSourceAssignmentId: String(args.swapSourceAssignmentId),
          swapTargetUserId: String(args.swapTargetUserId),
          swapTargetAssignmentId: String(args.swapTargetAssignmentId),
          reason: args.reason,
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toRequestPayload(r.data)
    },
  }),
)

builder.mutationField('submitOfferRequest', (t) =>
  t.field({
    type: RequestType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      offerSourceAssignmentId: t.arg.id({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const r = await submitOfferRequest(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.requestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          offerSourceAssignmentId: String(args.offerSourceAssignmentId),
          reason: args.reason,
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toRequestPayload(r.data)
    },
  }),
)

builder.mutationField('submitTimeOffRequest', (t) =>
  t.field({
    type: RequestType,
    args: {
      workspaceId: t.arg.id({ required: true }),
      timeOffStart: t.arg({ type: 'DateTime', required: true }),
      timeOffEnd: t.arg({ type: 'DateTime', required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const r = await submitTimeOffRequest(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.requestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.workspaceId),
          timeOffStart: new Date(args.timeOffStart),
          timeOffEnd: new Date(args.timeOffEnd),
          reason: args.reason,
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toRequestPayload(r.data)
    },
  }),
)

builder.mutationField('cancelRequest', (t) =>
  t.field({
    type: RequestType,
    args: { requestId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const r = await cancelRequest(
        ctx.repos.requestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { requestId: String(args.requestId) },
      )
      if (!r.success) throw gqlError(r.code)
      return toRequestPayload(r.data)
    },
  }),
)

builder.mutationField('peerRespondSwapRequest', (t) =>
  t.field({
    type: RequestType,
    args: {
      requestId: t.arg.id({ required: true }),
      decision: t.arg({ type: PeerRespondDecisionEnum, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const r = await peerRespondSwap(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.requestRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { requestId: String(args.requestId), decision: args.decision },
      )
      if (!r.success) throw gqlError(r.code)
      return toRequestPayload(r.data)
    },
  }),
)

builder.mutationField('resolveRequest', (t) =>
  t.field({
    type: RequestType,
    args: {
      requestId: t.arg.id({ required: true }),
      decision: t.arg({ type: RequestResolveDecisionEnum, required: true }),
      resolutionReason: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const r = await resolveRequest(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.requestRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          requestId: String(args.requestId),
          decision: args.decision,
          resolutionReason: args.resolutionReason ?? null,
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toRequestPayload(r.data)
    },
  }),
)
