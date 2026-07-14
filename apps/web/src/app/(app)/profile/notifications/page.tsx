import { NotificationsForm } from '~/components/features/profile/notifications-form'

import { resolveProfileContext } from '../_data'

export const dynamic = 'force-dynamic'

export default async function ProfileNotificationsPage() {
  await resolveProfileContext()
  return <NotificationsForm />
}
