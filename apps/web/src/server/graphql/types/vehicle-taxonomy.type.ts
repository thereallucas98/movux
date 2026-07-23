import { builder } from '../builder'

export const VehicleSpecType = builder.simpleObject('VehicleSpec', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    maxWeightKg: t.float(),
    maxVolumeM3: t.float(),
  }),
})

export const VehicleCategoryType = builder.simpleObject('VehicleCategory', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    description: t.string({ nullable: true }),
    specs: t.field({ type: [VehicleSpecType] }),
  }),
})

// Catálogo real de marca/modelo (importado da FIPE) — ortogonal a
// categoria/spec (identidade do veículo, não capacidade de carga).
export const VehicleBrandType = builder.simpleObject('VehicleBrand', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
  }),
})

export const VehicleModelType = builder.simpleObject('VehicleModel', {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    brand: t.field({ type: VehicleBrandType }),
  }),
})

// Item de lista pro picker de modelo (cascata Marca → Modelo) — sem marca
// aninhada, o caller já sabe qual marca escolheu antes de listar modelos.
export const VehicleModelOptionType = builder.simpleObject(
  'VehicleModelOption',
  {
    fields: (t) => ({
      id: t.id(),
      name: t.string(),
    }),
  },
)
