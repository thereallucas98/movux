import { redirect } from 'next/navigation'

export default function MyShiftsHistoryPage() {
  redirect('/shifts?filter=history')
}
