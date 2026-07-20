import { builder } from '../builder'

export const NeighborhoodType = builder.simpleObject('Neighborhood', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    cityId: t.id(),
    cityName: t.string(),
    stateUf: t.string(),
  }),
})
