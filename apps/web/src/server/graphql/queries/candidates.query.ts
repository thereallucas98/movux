import {
  getCandidateCountForShift,
  getMyCandidacyForShift,
  listCandidatesForShift,
} from '~/server/use-cases'
import { builder } from '../builder'
import { ShiftCandidateStatusEnum } from '../enums/candidate.enum'
import { gqlError } from '../errors'
import { MyCandidacyType, ShiftCandidateType } from '../types/candidate.type'

builder.queryField('shiftCandidates', (t) =>
  t.field({
    type: [ShiftCandidateType],
    args: {
      shiftId: t.arg.id({ required: true }),
      status: t.arg({ type: ShiftCandidateStatusEnum }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await listCandidatesForShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.principal,
        {
          shiftId: String(args.shiftId),
          filter: { status: args.status ?? undefined },
        },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.queryField('myCandidacy', (t) =>
  t.field({
    type: MyCandidacyType,
    args: { shiftId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await getMyCandidacyForShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.principal,
        { shiftId: String(args.shiftId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data
    },
  }),
)

builder.queryField('candidateCountForShift', (t) =>
  t.int({
    args: { shiftId: t.arg.id({ required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await getCandidateCountForShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.principal,
        { shiftId: String(args.shiftId) },
      )
      if (!result.success) throw gqlError(result.code)
      return result.data.count
    },
  }),
)
