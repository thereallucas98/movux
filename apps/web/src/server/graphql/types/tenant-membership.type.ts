import { builder } from '../builder'
import { UserType } from './user.type'

export const TenantMembershipType = builder.simpleObject('TenantMembership', {
  fields: (t) => ({
    id: t.id(),
    tenantId: t.id(),
    userId: t.id(),
    role: t.string(),
    isActive: t.boolean(),
    createdAt: t.field({ type: 'DateTime' }),
    user: t.field({ type: UserType, nullable: true }),
  }),
})
