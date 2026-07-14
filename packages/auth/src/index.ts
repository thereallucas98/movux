import {
  AbilityBuilder,
  CreateAbility,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability'
import { z } from 'zod'

import { User } from './models/user'
import { MODERATOR_ROLES } from './roles'

export {
  roleSchema,
  type Role,
  MODERATOR_ROLES,
  PUBLIC_REGISTRABLE_ROLES,
} from './roles'
export { userSchema, type User } from './models/user'

// Domain subjects — extend this list as you add entities that need RBAC.
const subjects = ['User'] as const

const appAbilitiesSchema = z.tuple([
  z.enum(['manage', 'create', 'read', 'update', 'delete']),
  z.union([z.literal('all'), z.enum(subjects)]),
])

type AppAbilities = z.infer<typeof appAbilitiesSchema>
export type AppAbility = MongoAbility<[AppAbilities[0], AppAbilities[1]]>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>

export function defineAbilityFor(user: User) {
  const builder = new AbilityBuilder(createAppAbility)

  if (user.role === 'SUPER_ADMIN') {
    builder.can('manage', 'all')
    return builder.build()
  }

  if (user.role === 'ADMIN') {
    builder.can('manage', ['User'])
    return builder.build()
  }

  if (user.role === 'USER') {
    builder.can('read', ['User'])
    return builder.build()
  }

  return builder.build()
}

/** Check if role can moderate platform content */
export function isModerator(role: User['role']) {
  return MODERATOR_ROLES.includes(role)
}
