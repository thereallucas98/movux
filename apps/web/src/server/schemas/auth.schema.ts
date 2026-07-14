import { roleSchema } from '@movux/auth'
import { z } from 'zod'

export const RegisterSchema = z.object({
  fullName: z.string().min(2),
  email: z.email(),
  password: z.string().min(8),
  role: roleSchema.default('USER'),
})

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

export const ForgotPasswordSchema = z.object({
  email: z.email(),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
})
