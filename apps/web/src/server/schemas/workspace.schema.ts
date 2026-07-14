import { z } from 'zod'

import { ianaTimezone } from '~/server/lib/iana-timezone'

// ─── Path params ─────────────────────────────────────────────────────────────

export const WorkspaceIdParamSchema = z.object({
  id: z.uuid(),
})

export const WorkspaceMemberIdParamSchema = z.object({
  id: z.uuid(),
  memberId: z.uuid(),
})

export const TenantIdParamSchema = z.object({
  id: z.uuid(),
})

// ─── Enums ───────────────────────────────────────────────────────────────────

export const WorkspaceRoleSchema = z.enum([
  'ADMIN',
  'COORDENADOR',
  'COLABORADOR',
])

export const WorkspaceVerticalSchema = z.enum([
  'HOSPITAL',
  'CLINIC',
  'GYM',
  'OTHER',
])

// ─── Body schemas ────────────────────────────────────────────────────────────

export const CreateWorkspaceSchema = z.object({
  tenantId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  timezone: ianaTimezone.optional(),
  vertical: WorkspaceVerticalSchema,
})

export const UpdateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    timezone: ianaTimezone.optional(),
    vertical: WorkspaceVerticalSchema.optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.timezone !== undefined ||
      d.vertical !== undefined,
    {
      message:
        'At least one field (name, timezone, or vertical) must be provided.',
    },
  )

export const AddWorkspaceMemberSchema = z.object({
  email: z.email().transform((e) => e.trim().toLowerCase()),
  role: WorkspaceRoleSchema,
  specialtyId: z.uuid({ message: 'Profissão é obrigatória' }),
})

export const ChangeWorkspaceMemberRoleSchema = z.object({
  role: WorkspaceRoleSchema,
})

// ─── Query-string cursor pagination (reuse shape from tenant schema) ─────────

export const CursorPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
