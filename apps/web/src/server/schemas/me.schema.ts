import { z } from 'zod'

const phoneRegex = /^\+?[1-9]\d{7,14}$/

const phoneField = z.string().trim().regex(phoneRegex, {
  message: 'Phone must match E.164 (~/\\+?[1-9]\\d{7,14}$/)',
})

const urlField = z.string().trim().url().max(500)

export const UpdateMeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    phone: phoneField.optional(),
    avatarUrl: urlField.nullable().optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    bio: z.string().trim().max(280).nullable().optional(),
    whatsappOptIn: z.boolean().optional(),
    emergencyContactName: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .nullable()
      .optional(),
    emergencyContactPhone: phoneField.nullable().optional(),
  })
  .refine(
    (data) =>
      data.fullName !== undefined ||
      data.phone !== undefined ||
      data.avatarUrl !== undefined ||
      data.dateOfBirth !== undefined ||
      data.bio !== undefined ||
      data.whatsappOptIn !== undefined ||
      data.emergencyContactName !== undefined ||
      data.emergencyContactPhone !== undefined,
    {
      message: 'At least one profile field must be provided.',
    },
  )

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
})
