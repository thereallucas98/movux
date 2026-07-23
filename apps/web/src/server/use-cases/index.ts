export { registerUser } from './auth/register-user.use-case'
export type {
  RegisterUserInput,
  RegisterUserResult,
} from './auth/register-user.use-case'

export { loginUser } from './auth/login-user.use-case'
export type {
  LoginUserInput,
  LoginUserResult,
} from './auth/login-user.use-case'

export { getCurrentUser } from './auth/get-current-user.use-case'
export type { GetCurrentUserResult } from './auth/get-current-user.use-case'

export { verifyEmail } from './auth/verify-email.use-case'
export type { VerifyEmailResult } from './auth/verify-email.use-case'

// ─── Shipments ───────────────────────────────────────────────────────────────

export { createShipment } from './shipments/create-shipment.use-case'
export type {
  CreateShipmentInput,
  CreateShipmentResult,
} from './shipments/create-shipment.use-case'

export { publishShipment } from './shipments/publish-shipment.use-case'
export type { PublishShipmentResult } from './shipments/publish-shipment.use-case'

export { getShipment } from './shipments/get-shipment.use-case'
export type { GetShipmentResult } from './shipments/get-shipment.use-case'
export { getShipmentForCarrier } from './shipments/get-shipment-for-carrier.use-case'
export type { GetShipmentForCarrierResult } from './shipments/get-shipment-for-carrier.use-case'

export { listShipmentsForCustomer } from './shipments/list-shipments-for-customer.use-case'
export type {
  ListShipmentsForCustomerInput,
  ListShipmentsForCustomerResult,
} from './shipments/list-shipments-for-customer.use-case'

export { browseOpenShipments } from './shipments/browse-open-shipments.use-case'
export type {
  BrowseOpenShipmentsInput,
  BrowseOpenShipmentsResult,
} from './shipments/browse-open-shipments.use-case'

// ─── Proposal Queue (S2-T1) ────────────────────────────────────────────────

export { joinProposalQueue } from './shipments/queue/join-proposal-queue.use-case'
export type { JoinProposalQueueResult } from './shipments/queue/join-proposal-queue.use-case'

export { withdrawProposalQueue } from './shipments/queue/withdraw-proposal-queue.use-case'
export type { WithdrawProposalQueueResult } from './shipments/queue/withdraw-proposal-queue.use-case'

export { getMyQueueEntry } from './shipments/queue/get-my-queue-entry.use-case'
export type { GetMyQueueEntryResult } from './shipments/queue/get-my-queue-entry.use-case'

export { listMyQueueEntries } from './shipments/queue/list-my-queue-entries.use-case'
export type {
  ListMyQueueEntriesInput,
  ListMyQueueEntriesResult,
} from './shipments/queue/list-my-queue-entries.use-case'

// ─── Proposals (S2-T2) ──────────────────────────────────────────────────────

export { submitProposal } from './shipments/proposals/submit-proposal.use-case'
export type {
  SubmitProposalInput,
  SubmitProposalResult,
} from './shipments/proposals/submit-proposal.use-case'

export { addProposalAttempt } from './shipments/proposals/add-proposal-attempt.use-case'
export type {
  AddProposalAttemptInput,
  AddProposalAttemptResult,
} from './shipments/proposals/add-proposal-attempt.use-case'

export { withdrawProposal } from './shipments/proposals/withdraw-proposal.use-case'
export type { WithdrawProposalResult } from './shipments/proposals/withdraw-proposal.use-case'

export { getMyProposal } from './shipments/proposals/get-my-proposal.use-case'
export type { GetMyProposalResult } from './shipments/proposals/get-my-proposal.use-case'

export { listProposalsForShipment } from './shipments/proposals/list-proposals-for-shipment.use-case'
export type { ListProposalsForShipmentResult } from './shipments/proposals/list-proposals-for-shipment.use-case'

export { acceptProposal } from './shipments/proposals/accept-proposal.use-case'
export type { AcceptProposalResult } from './shipments/proposals/accept-proposal.use-case'

export { rejectProposal } from './shipments/proposals/reject-proposal.use-case'
export type { RejectProposalResult } from './shipments/proposals/reject-proposal.use-case'

export { confirmSafetyCheckIn } from './shipments/safety/confirm-safety-check-in.use-case'
export type { ConfirmSafetyCheckInResult } from './shipments/safety/confirm-safety-check-in.use-case'

export { getSafetyCheckInStatus } from './shipments/safety/get-safety-check-in-status.use-case'
export type { GetSafetyCheckInStatusResult } from './shipments/safety/get-safety-check-in-status.use-case'

export { markCollected } from './shipments/transit/mark-collected.use-case'
export type { MarkCollectedResult } from './shipments/transit/mark-collected.use-case'

export { markInTransit } from './shipments/transit/mark-in-transit.use-case'
export type { MarkInTransitResult } from './shipments/transit/mark-in-transit.use-case'

export { markDelivered } from './shipments/transit/mark-delivered.use-case'
export type { MarkDeliveredResult } from './shipments/transit/mark-delivered.use-case'

export { setShipmentEta } from './shipments/transit/set-shipment-eta.use-case'
export type {
  EtaStage,
  SetShipmentEtaResult,
} from './shipments/transit/set-shipment-eta.use-case'

export { confirmDelivery } from './shipments/delivery/confirm-delivery.use-case'
export type { ConfirmDeliveryResult } from './shipments/delivery/confirm-delivery.use-case'

export { getDeliveryConfirmationStatus } from './shipments/delivery/get-delivery-confirmation-status.use-case'
export type { GetDeliveryConfirmationStatusResult } from './shipments/delivery/get-delivery-confirmation-status.use-case'

export { getShipmentEvents } from './shipments/get-shipment-events.use-case'
export type { GetShipmentEventsResult } from './shipments/get-shipment-events.use-case'

export { getShipmentCounterpartInfo } from './shipments/get-shipment-counterpart-info.use-case'
export type {
  GetShipmentCounterpartInfoResult,
  ShipmentCounterpartInfo,
} from './shipments/get-shipment-counterpart-info.use-case'

export { submitReview } from './shipments/reviews/submit-review.use-case'
export type { SubmitReviewResult } from './shipments/reviews/submit-review.use-case'

export { listReviewsForShipment } from './shipments/reviews/list-reviews-for-shipment.use-case'
export type { ListReviewsForShipmentResult } from './shipments/reviews/list-reviews-for-shipment.use-case'

export { uploadCarrierDocument } from './carrier-documents/upload-carrier-document.use-case'
export type { UploadCarrierDocumentResult } from './carrier-documents/upload-carrier-document.use-case'

export { listCarrierDocuments } from './carrier-documents/list-carrier-documents.use-case'

export { approveCarrierDocument } from './carrier-documents/approve-carrier-document.use-case'
export type { ApproveCarrierDocumentResult } from './carrier-documents/approve-carrier-document.use-case'

export { rejectCarrierDocument } from './carrier-documents/reject-carrier-document.use-case'
export type { RejectCarrierDocumentResult } from './carrier-documents/reject-carrier-document.use-case'

export { listCarrierDocumentsForAdmin } from './carrier-documents/list-carrier-documents-for-admin.use-case'

export { recordExternalValidation } from './carrier-documents/record-external-validation.use-case'
export type { RecordExternalValidationResult } from './carrier-documents/record-external-validation.use-case'

export { listMyVehicles } from './vehicles/list-my-vehicles.use-case'

export { createVehicle } from './vehicles/create-vehicle.use-case'
export type {
  CreateVehicleInput,
  CreateVehicleResult,
} from './vehicles/create-vehicle.use-case'

export { updateVehicle } from './vehicles/update-vehicle.use-case'
export type {
  UpdateVehicleInput,
  UpdateVehicleResult,
} from './vehicles/update-vehicle.use-case'

export { deactivateVehicle } from './vehicles/deactivate-vehicle.use-case'
export type { DeactivateVehicleResult } from './vehicles/deactivate-vehicle.use-case'

// ─── Carriers — Public Search (S9-T3) ────────────────────────────────────────

export { searchPublicCarriers } from './carriers/search-public-carriers.use-case'
export type {
  PublicCarrierResult,
  SearchPublicCarriersInput,
} from './carriers/search-public-carriers.use-case'

export { getCarrierPortfolio } from './carriers/get-carrier-portfolio.use-case'
export type {
  CarrierPortfolioResult,
  CarrierPortfolioVehicle,
  GetCarrierPortfolioInput,
  GetCarrierPortfolioResult,
} from './carriers/get-carrier-portfolio.use-case'

export { listNotificationsForAdmin } from './notifications/list-notifications-for-admin.use-case'

export { retryNotification } from './notifications/retry-notification.use-case'
export type { RetryNotificationResult } from './notifications/retry-notification.use-case'

// ─── Dashboard de métricas (S8-T7 — customer/carrier/admin) ──────────────────
export { getCustomerDashboardMetrics } from './dashboard/get-customer-dashboard-metrics.use-case'
export type {
  CustomerDashboardMetrics,
  GetCustomerDashboardMetricsResult,
} from './dashboard/get-customer-dashboard-metrics.use-case'

export { getCarrierDashboardMetrics } from './dashboard/get-carrier-dashboard-metrics.use-case'
export type {
  CarrierDashboardMetrics,
  GetCarrierDashboardMetricsResult,
} from './dashboard/get-carrier-dashboard-metrics.use-case'

export { getAdminDashboardMetrics } from './dashboard/get-admin-dashboard-metrics.use-case'
export type {
  AdminDashboardMetrics,
  GetAdminDashboardMetricsResult,
} from './dashboard/get-admin-dashboard-metrics.use-case'
