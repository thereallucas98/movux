import { MyProposalsList } from '~/components/features/proposals/my-proposals-list'

export default function CarrierProposalsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-foreground text-2xl font-bold">Minhas propostas</h1>
      <MyProposalsList />
    </div>
  )
}
