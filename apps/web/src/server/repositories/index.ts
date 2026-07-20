import { prisma } from '~/lib/db'
import { createAssignmentRepository } from './assignment.repository'
import { createAuditLogRepository } from './audit-log.repository'
import { createShiftCandidateRepository } from './candidate.repository'
import { createCategoryRepository } from './category.repository'
import { createCarrierDocumentRepository } from './carrier-document.repository'
import { createCarrierProfileRepository } from './carrier-profile.repository'
import { createCustomerProfileRepository } from './customer-profile.repository'
import { createDeliveryConfirmationRepository } from './delivery-confirmation.repository'
import { createNotificationRepository } from './notification.repository'
import { createNotificationPreferenceRepository } from './notification-preference.repository'
import { createPricingRepository } from './pricing.repository'
import { createProposalRepository } from './proposal.repository'
import { createProposalQueueRepository } from './proposal-queue.repository'
import { createScheduleRepository } from './schedule.repository'
import { createShipmentRepository } from './shipment.repository'
import { createShiftRepository } from './shift.repository'
import { createShiftPatternRepository } from './shift-pattern.repository'
import { createShiftExpectedCompositionRepository } from './shift-expected-composition.repository'
import { createRequestRepository } from './request.repository'
import { createReviewRepository } from './review.repository'
import { createReviewTagRepository } from './review-tag.repository'
import { createSafetyCheckInRepository } from './safety-check-in.repository'
import { createShiftTimelineNoteRepository } from './shift-timeline-note.repository'
import { createShipmentEventRepository } from './shipment-event.repository'
import { createTimeEntryRepository } from './time-entry.repository'
import { createTransferRequestRepository } from './transfer-request.repository'
import { createSpecialtyRepository } from './specialty.repository'
import { createUserSpecialtyRepository } from './user-specialty.repository'
import { createTenantMembershipRepository } from './tenant-membership.repository'
import { createTenantRepository } from './tenant.repository'
import { createUserRepository } from './user.repository'
import { createWorkspaceMembershipRepository } from './workspace-membership.repository'
import { createWorkspaceRepository } from './workspace.repository'

export const userRepository = createUserRepository(prisma)
export const customerProfileRepository = createCustomerProfileRepository(prisma)
export const carrierProfileRepository = createCarrierProfileRepository(prisma)
export const carrierDocumentRepository = createCarrierDocumentRepository(prisma)
export const pricingRepository = createPricingRepository(prisma)
export const shipmentRepository = createShipmentRepository(prisma)
export const proposalQueueRepository = createProposalQueueRepository(prisma)
export const proposalRepository = createProposalRepository(prisma)
export const safetyCheckInRepository = createSafetyCheckInRepository(prisma)
export const deliveryConfirmationRepository = createDeliveryConfirmationRepository(prisma)
export const shipmentEventRepository = createShipmentEventRepository(prisma)
export const reviewRepository = createReviewRepository(prisma)
export const reviewTagRepository = createReviewTagRepository(prisma)
export const tenantRepository = createTenantRepository(prisma)
export const tenantMembershipRepository =
  createTenantMembershipRepository(prisma)
export const workspaceRepository = createWorkspaceRepository(prisma)
export const workspaceMembershipRepository =
  createWorkspaceMembershipRepository(prisma)
export const categoryRepository = createCategoryRepository(prisma)
export const specialtyRepository = createSpecialtyRepository(prisma)
export const userSpecialtyRepository = createUserSpecialtyRepository(prisma)
export const scheduleRepository = createScheduleRepository(prisma)
export const shiftRepository = createShiftRepository(prisma)
export const shiftPatternRepository = createShiftPatternRepository(prisma)
export const shiftExpectedCompositionRepository =
  createShiftExpectedCompositionRepository(prisma)
export const assignmentRepository = createAssignmentRepository(prisma)
export const transferRequestRepository = createTransferRequestRepository(prisma)
export const requestRepository = createRequestRepository(prisma)
export const timeEntryRepository = createTimeEntryRepository(prisma)
export const shiftTimelineNoteRepository =
  createShiftTimelineNoteRepository(prisma)
export const shiftCandidateRepository = createShiftCandidateRepository(prisma)
export const auditLogRepository = createAuditLogRepository(prisma)
export const notificationRepository = createNotificationRepository(prisma)
export const notificationPreferenceRepository =
  createNotificationPreferenceRepository(prisma)
