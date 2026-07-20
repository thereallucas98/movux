import { z } from 'zod'

export const SubmitReviewSchema = z.object({
  rating: z.int().min(1).max(5),
  tagIds: z.array(z.uuid()).optional(),
})
