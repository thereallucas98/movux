import { MyShiftsList } from '~/components/features/my-shifts/my-shifts-list'

import { resolveMyShiftsContext } from './_data'

export const dynamic = 'force-dynamic'

export default async function MyShiftsPage() {
  await resolveMyShiftsContext()
  return <MyShiftsList />
}
