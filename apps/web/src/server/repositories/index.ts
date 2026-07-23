import { prisma } from '~/lib/db'
import { createCarrierDocumentRepository } from './carrier-document.repository'
import { createCarrierProfileRepository } from './carrier-profile.repository'
import { createCustomerProfileRepository } from './customer-profile.repository'
import { createDeliveryConfirmationRepository } from './delivery-confirmation.repository'
import { createGeographyRepository } from './geography.repository'
import { createNotificationLogRepository } from './notification-log.repository'
import { createPricingRepository } from './pricing.repository'
import { createProposalRepository } from './proposal.repository'
import { createProposalQueueRepository } from './proposal-queue.repository'
import { createShipmentRepository } from './shipment.repository'
import { createReviewRepository } from './review.repository'
import { createReviewTagRepository } from './review-tag.repository'
import { createSafetyCheckInRepository } from './safety-check-in.repository'
import { createShipmentEventRepository } from './shipment-event.repository'
import { createVehicleRepository } from './vehicle.repository'
import { createVehicleTaxonomyRepository } from './vehicle-taxonomy.repository'
import { createUserRepository } from './user.repository'

export const userRepository = createUserRepository(prisma)
export const customerProfileRepository = createCustomerProfileRepository(prisma)
export const carrierProfileRepository = createCarrierProfileRepository(prisma)
export const carrierDocumentRepository = createCarrierDocumentRepository(prisma)
export const pricingRepository = createPricingRepository(prisma)
export const geographyRepository = createGeographyRepository(prisma)
export const shipmentRepository = createShipmentRepository(prisma)
export const proposalQueueRepository = createProposalQueueRepository(prisma)
export const proposalRepository = createProposalRepository(prisma)
export const safetyCheckInRepository = createSafetyCheckInRepository(prisma)
export const deliveryConfirmationRepository =
  createDeliveryConfirmationRepository(prisma)
export const shipmentEventRepository = createShipmentEventRepository(prisma)
export const reviewRepository = createReviewRepository(prisma)
export const reviewTagRepository = createReviewTagRepository(prisma)
export const notificationLogRepository = createNotificationLogRepository(prisma)
export const vehicleRepository = createVehicleRepository(prisma)
export const vehicleTaxonomyRepository = createVehicleTaxonomyRepository(prisma)
