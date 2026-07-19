import { z } from 'zod'

export const roleSchema = z.enum(['CUSTOMER', 'CARRIER', 'ADMIN'])

export type Role = z.infer<typeof roleSchema>

export const MODERATOR_ROLES: Role[] = ['ADMIN']
export const PUBLIC_REGISTRABLE_ROLES: Role[] = ['CUSTOMER', 'CARRIER']
