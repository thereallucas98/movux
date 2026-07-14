import { redirect } from 'next/navigation'

export default function MyShiftsAcceptedPage() {
  redirect('/shifts?filter=accepted')
}
