import {
  clockInToShift,
  clockOutOfShift,
  closeAssignment,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError } from '../errors'
import { TimeEntryType, toTimeEntryPayload } from '../types/time-entry.type'

builder.mutationField('clockIn', (t) =>
  t.field({
    type: TimeEntryType,
    args: {
      assignmentId: t.arg.id({ required: true }),
      lat: t.arg.float(),
      lng: t.arg.float(),
    },
    resolve: async (_root, args, ctx) => {
      const r = await clockInToShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.workspaceRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.timeEntryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          assignmentId: String(args.assignmentId),
          ...(args.lat != null &&
            args.lng != null && { location: { lat: args.lat, lng: args.lng } }),
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toTimeEntryPayload(r.data)
    },
  }),
)

builder.mutationField('clockOut', (t) =>
  t.field({
    type: TimeEntryType,
    args: {
      assignmentId: t.arg.id({ required: true }),
      lat: t.arg.float(),
      lng: t.arg.float(),
    },
    resolve: async (_root, args, ctx) => {
      const r = await clockOutOfShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.workspaceRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.timeEntryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          assignmentId: String(args.assignmentId),
          ...(args.lat != null &&
            args.lng != null && { location: { lat: args.lat, lng: args.lng } }),
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toTimeEntryPayload(r.data)
    },
  }),
)

builder.mutationField('closeAssignment', (t) =>
  t.field({
    type: TimeEntryType,
    args: {
      assignmentId: t.arg.id({ required: true }),
      notes: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const r = await closeAssignment(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.assignmentRepo,
        ctx.repos.timeEntryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          assignmentId: String(args.assignmentId),
          ...(args.notes != null && { notes: args.notes }),
        },
      )
      if (!r.success) throw gqlError(r.code)
      return toTimeEntryPayload(r.data)
    },
  }),
)
