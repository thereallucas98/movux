import {
  getAdminDashboardMetrics,
  getCarrierDashboardMetrics,
  getCustomerDashboardMetrics,
} from '~/server/use-cases'
import { builder } from '../builder'
import { gqlError, gqlErrorFromResult } from '../errors'

export const CustomerDashboardMetricsType = builder.simpleObject(
  'CustomerDashboardMetrics',
  {
    fields: (t) => ({
      activeShipments: t.int(),
      totalShipments: t.int(),
      totalSpentInCents: t.int(),
      avgRating: t.float({ nullable: true }),
    }),
  },
)

export const CarrierDashboardMetricsType = builder.simpleObject(
  'CarrierDashboardMetrics',
  {
    fields: (t) => ({
      activeShipments: t.int(),
      totalShipments: t.int(),
      totalEarnedInCents: t.int(),
      avgRating: t.float({ nullable: true }),
    }),
  },
)

export const AdminDashboardMetricsType = builder.simpleObject(
  'AdminDashboardMetrics',
  {
    fields: (t) => ({
      pendingDocuments: t.int(),
      flaggedCarriers: t.int(),
      verifiedCarriers: t.int(),
      activeCarriers: t.int(),
    }),
  },
)

builder.queryField('customerDashboardMetrics', (t) =>
  t.field({
    type: CustomerDashboardMetricsType,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CUSTOMER') throw gqlError('FORBIDDEN')

      const result = await getCustomerDashboardMetrics(
        {
          customerProfileRepo: ctx.repos.customerProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
        },
        ctx.principal.userId,
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.metrics
    },
  }),
)

builder.queryField('carrierDashboardMetrics', (t) =>
  t.field({
    type: CarrierDashboardMetricsType,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'CARRIER') throw gqlError('FORBIDDEN')

      const result = await getCarrierDashboardMetrics(
        {
          carrierProfileRepo: ctx.repos.carrierProfileRepo,
          shipmentRepo: ctx.repos.shipmentRepo,
        },
        ctx.principal.userId,
      )
      if (!result.success) throw gqlErrorFromResult(result)

      return result.metrics
    },
  }),
)

builder.queryField('adminDashboardMetrics', (t) =>
  t.field({
    type: AdminDashboardMetricsType,
    resolve: async (_root, _args, ctx) => {
      if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
      if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')

      const result = await getAdminDashboardMetrics({
        carrierDocumentRepo: ctx.repos.carrierDocumentRepo,
        carrierProfileRepo: ctx.repos.carrierProfileRepo,
      })

      return result.metrics
    },
  }),
)
