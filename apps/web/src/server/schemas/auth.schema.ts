import { z } from 'zod'

export const RegisterSchema = z
  .object({
    fullName: z.string().min(2),
    email: z.email(),
    password: z.string().min(8),
    role: z.enum(['CUSTOMER', 'CARRIER']),
    phone: z.string().min(8).optional(),
  })
  .refine((data) => data.role !== 'CARRIER' || !!data.phone, {
    message: 'phone is required for CARRIER role',
    path: ['phone'],
  })

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})
