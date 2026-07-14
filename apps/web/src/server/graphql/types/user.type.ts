import { builder } from '../builder'

export const UserType = builder.simpleObject('User', {
  fields: (t) => ({
    id: t.id(),
    fullName: t.string(),
    email: t.string(),
    role: t.string(),
    emailVerified: t.boolean(),
    avatarUrl: t.string({ nullable: true }),
    dateOfBirth: t.field({ type: 'DateTime', nullable: true }),
    bio: t.string({ nullable: true }),
    whatsappOptIn: t.boolean(),
    emergencyContactName: t.string({ nullable: true }),
    emergencyContactPhone: t.string({ nullable: true }),
  }),
})
