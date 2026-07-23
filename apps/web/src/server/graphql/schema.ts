import { builder } from './builder'

// Import enums so they register with the builder (must come before types that reference them)
import './enums/shipment.enum'
import './enums/proposal.enum'
import './enums/carrier-document.enum'
import './enums/shipment-lifecycle.enum'

// Import types so they register with the builder
import './types/neighborhood.type'
import './types/shipment.type'
import './types/browse-shipment.type'
import './types/proposal.type'
import './types/queue-entry.type'
import './types/carrier-document.type'
import './types/shipment-lifecycle.type'

// Import queries
import './queries/neighborhoods.query'
import './queries/shipments.query'
import './queries/browse-shipments.query'
import './queries/queue.query'
import './queries/proposal.query'
import './queries/carrier-documents.query'
import './queries/dashboard-metrics.query'
import './queries/public-carrier-search.query'
import './queries/public-cities.query'
import './queries/shipment-lifecycle.query'
import './queries/vehicle-taxonomy.query'
import './queries/vehicles.query'

// Import mutations
import './mutations/shipments.mutation'
import './mutations/queue.mutation'
import './mutations/proposal.mutation'
import './mutations/carrier-documents.mutation'
import './mutations/shipment-lifecycle.mutation'
import './mutations/vehicles.mutation'

export const schema = builder.toSchema()
