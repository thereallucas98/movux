import {
  createPattern,
  createShift,
  deleteShift,
  generateShiftsFromPattern,
  setExpectedComposition,
  updateShift,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'
import {
  GeneratePatternResultType,
  ShiftExpectedCompositionType,
  ShiftType,
} from '../types/shift.type'
import { ShiftPatternType } from '../types/shift-pattern.type'

const CreateShiftInput = builder.inputType('CreateShiftInput', {
  fields: (t) => ({
    workspaceId: t.id({ required: true }),
    scheduleId: t.id({ required: true }),
    categoryId: t.id({ required: true }),
    startAt: t.field({ type: 'DateTime', required: true }),
    endAt: t.field({ type: 'DateTime', required: true }),
    headcount: t.int({ required: true }),
    notes: t.string(),
  }),
})

const UpdateShiftInput = builder.inputType('UpdateShiftInput', {
  fields: (t) => ({
    categoryId: t.id(),
    startAt: t.field({ type: 'DateTime' }),
    endAt: t.field({ type: 'DateTime' }),
    headcount: t.int(),
    notes: t.string(),
  }),
})

const ShiftCompositionInput = builder.inputType('ShiftCompositionInput', {
  fields: (t) => ({
    specialtyId: t.id({ required: true }),
    count: t.int({ required: true }),
  }),
})

const CreatePatternInput = builder.inputType('CreatePatternInput', {
  fields: (t) => ({
    workspaceId: t.id({ required: true }),
    scheduleId: t.id({ required: true }),
    categoryId: t.id({ required: true }),
    name: t.string(),
    daysOfWeek: t.field({ type: ['Int'], required: true }),
    startTimeMinutes: t.int({ required: true }),
    endTimeMinutes: t.int({ required: true }),
    crossesMidnight: t.boolean({ required: true }),
    headcount: t.int({ required: true }),
  }),
})

builder.mutationField('createShift', (t) =>
  t.field({
    type: ShiftType,
    args: { input: t.arg({ type: CreateShiftInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await createShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.categoryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.input.workspaceId),
          scheduleId: String(args.input.scheduleId),
          categoryId: String(args.input.categoryId),
          startAt: new Date(args.input.startAt as Date | string),
          endAt: new Date(args.input.endAt as Date | string),
          headcount: args.input.headcount,
          notes: args.input.notes ?? null,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return { ...result.data, expectedComposition: [] }
    },
  }),
)

builder.mutationField('updateShift', (t) =>
  t.field({
    type: ShiftType,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: UpdateShiftInput, required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const data: {
        categoryId?: string
        startAt?: Date
        endAt?: Date
        headcount?: number
        notes?: string | null
      } = {}
      if (args.input.categoryId !== null && args.input.categoryId !== undefined)
        data.categoryId = String(args.input.categoryId)
      if (args.input.startAt !== null && args.input.startAt !== undefined)
        data.startAt = new Date(args.input.startAt as Date | string)
      if (args.input.endAt !== null && args.input.endAt !== undefined)
        data.endAt = new Date(args.input.endAt as Date | string)
      if (args.input.headcount !== null && args.input.headcount !== undefined)
        data.headcount = args.input.headcount
      if (args.input.notes !== undefined) data.notes = args.input.notes

      if (Object.keys(data).length === 0) {
        throw gqlError(
          'VALIDATION_ERROR',
          'At least one field must be provided',
        )
      }

      const result = await updateShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.shiftCandidateRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { shiftId: String(args.id), data },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return { ...result.data, expectedComposition: [] }
    },
  }),
)

builder.mutationField('deleteShift', (t) =>
  t.boolean({
    args: {
      id: t.arg.id({ required: true }),
      reason: t.arg.string(),
    },
    resolve: async (_root, args, ctx) => {
      const result = await deleteShift(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        { shiftId: String(args.id), reason: args.reason ?? null },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return true
    },
  }),
)

builder.mutationField('setShiftExpectedComposition', (t) =>
  t.field({
    type: [ShiftExpectedCompositionType],
    args: {
      shiftId: t.arg.id({ required: true }),
      items: t.arg({ type: [ShiftCompositionInput], required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await setExpectedComposition(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftRepo,
        ctx.repos.specialtyRepo,
        ctx.repos.shiftCompositionRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          shiftId: String(args.shiftId),
          items: args.items.map((i) => ({
            specialtyId: String(i.specialtyId),
            count: i.count,
          })),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('createShiftPattern', (t) =>
  t.field({
    type: ShiftPatternType,
    args: { input: t.arg({ type: CreatePatternInput, required: true }) },
    resolve: async (_root, args, ctx) => {
      const result = await createPattern(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftPatternRepo,
        ctx.repos.categoryRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          workspaceId: String(args.input.workspaceId),
          scheduleId: String(args.input.scheduleId),
          categoryId: String(args.input.categoryId),
          name: args.input.name ?? null,
          daysOfWeek: args.input.daysOfWeek,
          startTimeMinutes: args.input.startTimeMinutes,
          endTimeMinutes: args.input.endTimeMinutes,
          crossesMidnight: args.input.crossesMidnight,
          headcount: args.input.headcount,
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)

builder.mutationField('generateShiftsFromPattern', (t) =>
  t.field({
    type: GeneratePatternResultType,
    args: {
      patternId: t.arg.id({ required: true }),
      rangeStart: t.arg({ type: 'DateTime', required: true }),
      rangeEnd: t.arg({ type: 'DateTime', required: true }),
    },
    resolve: async (_root, args, ctx) => {
      const result = await generateShiftsFromPattern(
        ctx.repos.workspaceMembershipRepo,
        ctx.repos.scheduleRepo,
        ctx.repos.shiftPatternRepo,
        ctx.repos.shiftRepo,
        ctx.repos.auditLogRepo,
        ctx.principal,
        {
          patternId: String(args.patternId),
          rangeStart: new Date(args.rangeStart as Date | string),
          rangeEnd: new Date(args.rangeEnd as Date | string),
        },
      )
      if (!result.success) throw gqlErrorFromResult(result)
      return result.data
    },
  }),
)
