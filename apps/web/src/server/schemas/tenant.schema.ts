import { z } from 'zod'

import { ianaTimezone } from '~/server/lib/iana-timezone'

// ─── Path params ─────────────────────────────────────────────────────────────

export const TenantIdParamSchema = z.object({
  id: z.uuid(),
})

export const MemberIdParamSchema = z.object({
  id: z.uuid(),
  memberId: z.uuid(),
})

// ─── Body schemas ────────────────────────────────────────────────────────────

export const CreateTenantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  timezone: ianaTimezone.optional(),
})

export const UpdateTenantSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    timezone: ianaTimezone.optional(),
  })
  .refine((d) => d.name !== undefined || d.timezone !== undefined, {
    message: 'At least one field (name or timezone) must be provided.',
  })

export const AddMemberSchema = z.object({
  userId: z.uuid(),
  role: z.enum(['SUPER_ADMIN']),
})

export const ChangeTenantPlanSchema = z.object({
  plan: z.enum(['FREE', 'SMALL_TEAM', 'BUSINESS', 'CORPORATE']),
})

// ─── Query-string cursor pagination ──────────────────────────────────────────

export const CursorPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
