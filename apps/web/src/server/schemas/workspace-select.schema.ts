import { z } from 'zod'

export const SelectWorkspaceSchema = z.object({
  workspaceId: z.uuid(),
})

export type SelectWorkspaceInput = z.infer<typeof SelectWorkspaceSchema>
