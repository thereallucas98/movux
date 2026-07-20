import type { NotificationLog } from '~/generated/prisma/client'
import type {
  ListNotificationsFilter,
  NotificationLogRepository,
} from '../../repositories/notification-log.repository'

interface ListNotificationsForAdminRepos {
  notificationLogRepo: NotificationLogRepository
}

export async function listNotificationsForAdmin(
  repos: ListNotificationsForAdminRepos,
  filter: ListNotificationsFilter,
): Promise<{ data: NotificationLog[]; nextCursor: string | null }> {
  return repos.notificationLogRepo.findByStatus(filter)
}
