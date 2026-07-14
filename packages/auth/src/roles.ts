import { z } from 'zod'

export const roleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'USER'])

export type Role = z.infer<typeof roleSchema>

export const MODERATOR_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN']
export const PUBLIC_REGISTRABLE_ROLES: Role[] = ['USER']
