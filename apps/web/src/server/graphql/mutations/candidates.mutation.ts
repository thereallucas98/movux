import {
  applyToShift,
  approveCandidate,
  rejectCandidate,
  withdrawFromShift,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { ShiftCandidateType } from '../types/candidate.type'

builder.mutationField('applyToShift', (t) =>
  t.field({
    type: ShiftCandidateType,
    args: { shiftId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await applyToShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { shiftId: String(args.shiftId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.mutationField('withdrawFromShift', (t) =>
  t.boolean({
    args: { candidateId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await withdrawFromShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { candidateId: String(args.candidateId) },
      )
      if (!result.success) throw gqlError(result.code)
      return true
    },
  }),
)

builder.mutationField('approveCandidate', (t) =>
  t.field({
    type: ShiftCandidateType,
    args: {
      candidateId: t.arg.id({ required: true }),
      autoAccept: t.arg.boolean(),
    },
    resolve: async (_root, args, ctx) => {
      const result = await approveCandidate(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          candidateId: String(args.candidateId),
          autoAccept: args.autoAccept ?? false,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.candidate
    },
  }),
)

builder.mutationField('rejectCandidate', (t) =>
  t.field({
    type: ShiftCandidateType,
    args: {
      candidateId: t.arg.id({ required: true }),
      reason: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await rejectCandidate(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          candidateId: String(args.candidateId),
          reason: args.reason,
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)
