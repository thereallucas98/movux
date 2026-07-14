import { addShiftTimelineNote } from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { ShiftTimelineEventType } from '../types/shift-timeline.type'

builder.mutationField('addShiftTimelineNote', (t) =>
  t.field({
    type: ShiftTimelineEventType,
    args: {
      shiftId: t.arg.id({ required: true }),
      note: t.arg.string({ required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const trimmed = args.note.trim()
      if (trimmed.length < 1 || trimmed.length > 2000) {
        throw gqlError('VALIDATION_ERROR')
      }
      const r = await addShiftTimelineNote(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.shiftRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.requestRepo,
        ctx.repos.shiftTimelineNoteRepo,
        ctx.repos.auditLogRepo,
        ctx.repos.userRepo,
        ctx.principal,
        { shiftId: String(args.shiftId), note: trimmed },
      )
      if (!r.success) throw gqlError(r.code)
      return r.data
    },
  }),
)
