import { ProfileForm } from '~/components/features/profile/profile-form'

import { resolveProfileContext } from './_data'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  await resolveProfileContext()
  return <ProfileForm />
}
