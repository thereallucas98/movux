import { z } from 'zod'

export const MemberIdParamSchema = z.object({
  id: z.uuid(),
  memberId: z.uuid(),
})

export const SetMemberSpecialtySchema = z.object({
  specialtyId: z.uuid(),
})
