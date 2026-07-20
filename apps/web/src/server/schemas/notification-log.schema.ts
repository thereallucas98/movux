import { z } from 'zod'

export const NotificationIdParamSchema = z.object({
  notificationId: z.uuid(),
})

export const ListNotificationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
})
