'use client'

import { useState } from 'react'
import { AdaptiveDialog } from '~/components/ui/adaptive-dialog'

export default function AdaptiveDialogDemoPage() {
  const [open, setOpen] = useState(false)

  return (
    <main className="p-8">
      <button
        type="button"
        data-testid="open-demo"
        onClick={() => setOpen(true)}
        className="rounded bg-slate-800 px-4 py-2 text-white"
      >
        Open
      </button>

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title="Demo title"
        description="Demo description"
      >
        <p data-testid="demo-body">demo content</p>
      </AdaptiveDialog>
    </main>
  )
}
