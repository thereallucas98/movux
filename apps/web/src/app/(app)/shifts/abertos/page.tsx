import { MyOpenShiftsList } from '~/components/features/my-shifts/my-open-shifts-list'

import { resolveMyShiftsContext } from '../_data'

export const dynamic = 'force-dynamic'

export default async function MyOpenShiftsPage() {
  await resolveMyShiftsContext()
  return <MyOpenShiftsList />
}
