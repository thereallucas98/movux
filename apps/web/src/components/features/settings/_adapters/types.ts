import type { LucideIcon } from 'lucide-react'

export type TaxonomyResource = 'categories' | 'specialties'

export type TaxonomySource = 'GLOBAL' | 'TENANT' | 'WORKSPACE'

export interface TaxonomyRow {
  id: string
  scope: TaxonomySource
  source: TaxonomySource
  vertical: string | null
  tenantId: string | null
  workspaceId: string | null
  slug: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxonomyAdapter {
  resource: TaxonomyResource
  copy: {
    pageTitle: string
    pageDescription: string
    addCta: string
    addingTitle: string
    editingTitle: string
    emptyTitle: string
    emptyBody: string
    emptyCta: string
    inheritedHeader: string
    rowSubject: string
    deleteBody: string
  }
  errorMap: Record<string, string>
  iconResolver(id: string): { Icon: LucideIcon; blockClass: string }
}
