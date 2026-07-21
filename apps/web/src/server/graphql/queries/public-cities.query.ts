import { builder } from '../builder'

export const CityOptionType = builder.simpleObject('CityOption', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    stateUf: t.string(),
  }),
})

// Rota pública (S9-T3) — cidade/UF são referência geográfica não-sensível;
// necessário pro visitante sem conta escolher uma cidade na busca pública.
builder.queryField('publicCities', (t) =>
  t.field({
    type: [CityOptionType],
    resolve: async (_root, _args, ctx) => ctx.repos.geographyRepo.listCities(),
  }),
)
