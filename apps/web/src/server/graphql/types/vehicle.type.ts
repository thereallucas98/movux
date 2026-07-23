import { builder } from '../builder'
import { VehicleModelType, VehicleSpecType } from './vehicle-taxonomy.type'

export const VehicleType = builder.simpleObject('Vehicle', {
  fields: (t) => ({
    id: t.id(),
    plate: t.string(),
    year: t.int(),
    isActive: t.boolean(),
    spec: t.field({ type: VehicleSpecType }),
    model: t.field({ type: VehicleModelType }),
  }),
})
