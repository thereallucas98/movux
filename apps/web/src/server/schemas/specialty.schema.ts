import { z } from 'zod'

export const WorkspaceIdParamSchema = z.object({
  id: z.uuid(),
})

export const SpecialtyIdParamSchema = z.object({
  id: z.uuid(),
  specialtyId: z.uuid(),
})

// Specialty slugs allow underscore (nurse_tech, medical_intern, etc.).
// Diverges from Category's stricter regex; see Task 05 Research §3.
const slugRegex = /^[a-z0-9][a-z0-9_-]{1,49}$/

export const CreateWorkspaceSpecialtySchema = z.object({
  slug: z.string().regex(slugRegex, {
    message:
      'Slug must be 2–50 chars, lowercase letters/digits/underscores/hyphens, starting with a letter or digit',
  }),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
})

export const UpdateWorkspaceSpecialtySchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined, {
    message: 'At least one field (name or description) must be provided.',
  })
