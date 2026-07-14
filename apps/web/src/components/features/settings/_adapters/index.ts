import { categoriesAdapter } from './categories'
import { specialtiesAdapter } from './specialties'
import type { TaxonomyAdapter, TaxonomyResource } from './types'

const ADAPTERS: Record<TaxonomyResource, TaxonomyAdapter> = {
  categories: categoriesAdapter,
  specialties: specialtiesAdapter,
}

export function adapterFor(resource: TaxonomyResource): TaxonomyAdapter {
  return ADAPTERS[resource]
}
