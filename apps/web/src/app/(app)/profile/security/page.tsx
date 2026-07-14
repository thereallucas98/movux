import { PasswordForm } from '~/components/features/profile/password-form'

import { resolveProfileContext } from '../_data'

export const dynamic = 'force-dynamic'

export default async function ProfileSecurityPage() {
  await resolveProfileContext()
  return <PasswordForm />
}
