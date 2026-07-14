import {
  acceptAssignment,
  cancelTransferRequest,
  decideTransferRequest,
  forceAcceptAssignment,
  rejectAssignment,
  requestTransfer,
} from '~/server/use-cases'
import { builder } from '../builder'
import { TransferDecisionEnum } from '../enums/transfer-request.enum'
import { gqlError } from '../errors'
import { AssignmentType } from '../types/assignment.type'
import { TransferRequestType } from '../types/transfer-request.type'

builder.mutationField('acceptAssignment', (t) =>
  t.field({
    type: AssignmentType,
    args: { assignmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await acceptAssignment(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { assignmentId: String(args.assignmentId) },
      )
      if (!result.success) throw gqlError(result.code)
      return { ...result.data, compositionStatus: 'UNKNOWN' as const }
    },
  }),
)

builder.mutationField('rejectAssignment', (t) =>
  t.field({
    type: AssignmentType,
    args: {
      assignmentId: t.arg.id({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await rejectAssignment(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          assignmentId: String(args.assignmentId),
          reason: args.reason,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return { ...result.data, compositionStatus: 'UNKNOWN' as const }
    },
  }),
)

builder.mutationField('forceAcceptAssignment', (t) =>
  t.field({
    type: AssignmentType,
    args: { assignmentId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await forceAcceptAssignment(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { assignmentId: String(args.assignmentId) },
      )
      if (!result.success) throw gqlError(result.code)
      return { ...result.data, compositionStatus: 'UNKNOWN' as const }
    },
  }),
)

builder.mutationField('requestTransfer', (t) =>
  t.field({
    type: TransferRequestType,
    args: {
      assignmentId: t.arg.id({ required: true }),
      targetUserId: t.arg.id({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await requestTransfer(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.transferRequestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          assignmentId: String(args.assignmentId),
          targetUserId: String(args.targetUserId),
          reason: args.reason,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.mutationField('decideTransferRequest', (t) =>
  t.field({
    type: TransferRequestType,
    args: {
      transferRequestId: t.arg.id({ required: true }),
      decision: t.arg({ type: TransferDecisionEnum, required: true }),
      reason: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const result = await decideTransferRequest(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.transferRequestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          transferRequestId: String(args.transferRequestId),
          decision: args.decision,
          reason: args.reason ?? undefined,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.mutationField('cancelTransferRequest', (t) =>
  t.boolean({
    args: { transferRequestId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await cancelTransferRequest(
        ctx.repos.transferRequestRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { transferRequestId: String(args.transferRequestId) },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)
