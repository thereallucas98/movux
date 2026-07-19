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

export { getMe } from './me/get-me.use-case'
export type { GetMeResult } from './me/get-me.use-case'

export { updateMe } from './me/update-me.use-case'
export type { UpdateMeInput, UpdateMeResult } from './me/update-me.use-case'

export { changePassword } from './me/change-password.use-case'
export type {
  ChangePasswordInput,
  ChangePasswordResult,
} from './me/change-password.use-case'

// ─── Tenants ─────────────────────────────────────────────────────────────────

export { createTenant } from './tenants/create-tenant.use-case'
export type {
  CreateTenantInput,
  CreateTenantResult,
  Principal,
} from './tenants/create-tenant.use-case'

export { listTenantsForUser } from './tenants/list-tenants-for-user.use-case'
export type {
  ListTenantsForUserInput,
  ListTenantsForUserResult,
} from './tenants/list-tenants-for-user.use-case'

export { getTenantById } from './tenants/get-tenant-by-id.use-case'
export type {
  GetTenantByIdInput,
  GetTenantByIdResult,
} from './tenants/get-tenant-by-id.use-case'

export { updateTenant } from './tenants/update-tenant.use-case'
export type {
  UpdateTenantInput,
  UpdateTenantResult,
} from './tenants/update-tenant.use-case'

export { changeTenantPlan } from './tenants/change-tenant-plan.use-case'
export type {
  ChangeTenantPlanInput,
  ChangeTenantPlanResult,
} from './tenants/change-tenant-plan.use-case'

export { getTenantPlanLimits } from './tenants/get-tenant-plan-limits.use-case'
export type {
  TenantPlanLimitsData,
  GetTenantPlanLimitsResult,
  PlanLimitResource,
} from './tenants/get-tenant-plan-limits.use-case'

export { getWorkspacePlanLimits } from './workspaces/get-workspace-plan-limits.use-case'
export type {
  WorkspacePlanLimitsData,
  GetWorkspacePlanLimitsResult,
} from './workspaces/get-workspace-plan-limits.use-case'

export { createTenantCategory } from './categories/create-tenant-category.use-case'
export type {
  CreateTenantCategoryInput,
  CreateTenantCategoryResult,
} from './categories/create-tenant-category.use-case'

export { createTenantSpecialty } from './specialties/create-tenant-specialty.use-case'
export type {
  CreateTenantSpecialtyInput,
  CreateTenantSpecialtyResult,
} from './specialties/create-tenant-specialty.use-case'

export { softDeleteTenant } from './tenants/soft-delete-tenant.use-case'
export type {
  SoftDeleteTenantInput,
  SoftDeleteTenantResult,
} from './tenants/soft-delete-tenant.use-case'

// ─── Tenant Memberships ──────────────────────────────────────────────────────

export { addTenantMember } from './tenant-memberships/add-member.use-case'
export type {
  AddMemberInput,
  AddMemberResult,
} from './tenant-memberships/add-member.use-case'

export { removeTenantMember } from './tenant-memberships/remove-member.use-case'
export type {
  RemoveMemberInput,
  RemoveMemberResult,
} from './tenant-memberships/remove-member.use-case'

export { listTenantMembers } from './tenant-memberships/list-members.use-case'
export type {
  ListMembersInput,
  ListMembersResult,
} from './tenant-memberships/list-members.use-case'

// ─── Workspaces ──────────────────────────────────────────────────────────────

export { createWorkspace } from './workspaces/create-workspace.use-case'
export type {
  CreateWorkspaceInput,
  CreateWorkspaceResult,
  WorkspaceVertical,
} from './workspaces/create-workspace.use-case'

export { listWorkspacesForUser } from './workspaces/list-workspaces-for-user.use-case'
export type {
  ListWorkspacesForUserInput,
  ListWorkspacesForUserResult,
} from './workspaces/list-workspaces-for-user.use-case'

export { listWorkspacesForTenant } from './workspaces/list-workspaces-for-tenant.use-case'
export type {
  ListWorkspacesForTenantInput,
  ListWorkspacesForTenantResult,
} from './workspaces/list-workspaces-for-tenant.use-case'

export { getWorkspaceById } from './workspaces/get-workspace-by-id.use-case'
export type {
  GetWorkspaceByIdInput,
  GetWorkspaceByIdResult,
} from './workspaces/get-workspace-by-id.use-case'

export { updateWorkspace } from './workspaces/update-workspace.use-case'
export type {
  UpdateWorkspaceInput,
  UpdateWorkspaceResult,
} from './workspaces/update-workspace.use-case'

export { softDeleteWorkspace } from './workspaces/soft-delete-workspace.use-case'
export type {
  SoftDeleteWorkspaceInput,
  SoftDeleteWorkspaceResult,
} from './workspaces/soft-delete-workspace.use-case'

// ─── Workspace Memberships ───────────────────────────────────────────────────

export { addWorkspaceMember } from './workspace-memberships/add-workspace-member.use-case'
export type {
  AddWorkspaceMemberInput,
  AddWorkspaceMemberResult,
  WorkspaceRole,
} from './workspace-memberships/add-workspace-member.use-case'

export { changeWorkspaceMemberRole } from './workspace-memberships/change-workspace-member-role.use-case'
export type {
  ChangeWorkspaceMemberRoleInput,
  ChangeWorkspaceMemberRoleResult,
} from './workspace-memberships/change-workspace-member-role.use-case'

export { removeWorkspaceMember } from './workspace-memberships/remove-workspace-member.use-case'
export type {
  RemoveWorkspaceMemberInput,
  RemoveWorkspaceMemberResult,
} from './workspace-memberships/remove-workspace-member.use-case'

export { getWorkspaceMemberDetail } from './workspace-memberships/get-workspace-member-detail.use-case'
export type {
  GetWorkspaceMemberDetailInput,
  GetWorkspaceMemberDetailResult,
  MemberDetail,
} from './workspace-memberships/get-workspace-member-detail.use-case'

export { setWorkspaceMemberSpecialty } from './workspace-memberships/set-workspace-member-specialty.use-case'
export type {
  SetWorkspaceMemberSpecialtyInput,
  SetWorkspaceMemberSpecialtyResult,
} from './workspace-memberships/set-workspace-member-specialty.use-case'

export { unsetWorkspaceMemberSpecialty } from './workspace-memberships/unset-workspace-member-specialty.use-case'
export type {
  UnsetWorkspaceMemberSpecialtyInput,
  UnsetWorkspaceMemberSpecialtyResult,
} from './workspace-memberships/unset-workspace-member-specialty.use-case'

// ─── Categories ──────────────────────────────────────────────────────────────

export { createWorkspaceCategory } from './categories/create-workspace-category.use-case'
export type {
  CreateWorkspaceCategoryInput,
  CreateWorkspaceCategoryResult,
} from './categories/create-workspace-category.use-case'

export { listCategoriesForWorkspace } from './categories/list-categories-for-workspace.use-case'
export type {
  ListCategoriesForWorkspaceInput,
  ListCategoriesForWorkspaceResult,
  MergedCategory,
} from './categories/list-categories-for-workspace.use-case'

export { updateWorkspaceCategory } from './categories/update-workspace-category.use-case'
export type {
  UpdateWorkspaceCategoryInput,
  UpdateWorkspaceCategoryResult,
} from './categories/update-workspace-category.use-case'

export { softDeleteWorkspaceCategory } from './categories/soft-delete-workspace-category.use-case'
export type {
  SoftDeleteWorkspaceCategoryInput,
  SoftDeleteWorkspaceCategoryResult,
} from './categories/soft-delete-workspace-category.use-case'

// ─── Specialties ─────────────────────────────────────────────────────────────

export { createWorkspaceSpecialty } from './specialties/create-workspace-specialty.use-case'
export type {
  CreateWorkspaceSpecialtyInput,
  CreateWorkspaceSpecialtyResult,
} from './specialties/create-workspace-specialty.use-case'

export { listSpecialtiesForWorkspace } from './specialties/list-specialties-for-workspace.use-case'
export type {
  ListSpecialtiesForWorkspaceInput,
  ListSpecialtiesForWorkspaceResult,
  MergedSpecialty,
} from './specialties/list-specialties-for-workspace.use-case'

export { updateWorkspaceSpecialty } from './specialties/update-workspace-specialty.use-case'
export type {
  UpdateWorkspaceSpecialtyInput,
  UpdateWorkspaceSpecialtyResult,
} from './specialties/update-workspace-specialty.use-case'

export { softDeleteWorkspaceSpecialty } from './specialties/soft-delete-workspace-specialty.use-case'
export type {
  SoftDeleteWorkspaceSpecialtyInput,
  SoftDeleteWorkspaceSpecialtyResult,
} from './specialties/soft-delete-workspace-specialty.use-case'

// ─── Schedules ───────────────────────────────────────────────────────────────

export { createSchedule } from './schedules/create-schedule.use-case'
export type {
  CreateScheduleInput,
  CreateScheduleResult,
} from './schedules/create-schedule.use-case'

export { listSchedulesForWorkspace } from './schedules/list-schedules-for-workspace.use-case'
export type {
  ListSchedulesForWorkspaceInput,
  ListSchedulesForWorkspaceResult,
} from './schedules/list-schedules-for-workspace.use-case'

export { getScheduleById } from './schedules/get-schedule-by-id.use-case'
export type {
  GetScheduleByIdInput,
  GetScheduleByIdResult,
} from './schedules/get-schedule-by-id.use-case'

export { updateSchedule } from './schedules/update-schedule.use-case'
export type {
  UpdateScheduleInput,
  UpdateScheduleResult,
} from './schedules/update-schedule.use-case'

export { publishSchedule } from './schedules/publish-schedule.use-case'
export type {
  PublishScheduleInput,
  PublishScheduleResult,
} from './schedules/publish-schedule.use-case'

export { closeSchedule } from './schedules/close-schedule.use-case'
export type {
  CloseScheduleInput,
  CloseScheduleResult,
} from './schedules/close-schedule.use-case'

export { deleteSchedule } from './schedules/delete-schedule.use-case'
export type {
  DeleteScheduleInput,
  DeleteScheduleResult,
} from './schedules/delete-schedule.use-case'

// ─── Shifts ──────────────────────────────────────────────────────────────────

export { createShift } from './shifts/create-shift.use-case'
export type {
  CreateShiftInput,
  CreateShiftResult,
} from './shifts/create-shift.use-case'

export { listShiftsForSchedule } from './shifts/list-shifts-for-schedule.use-case'
export type {
  ListShiftsInput,
  ListShiftsResult,
} from './shifts/list-shifts-for-schedule.use-case'

export { listOpenShiftsForMe } from './shifts/list-open-shifts-for-me.use-case'
export type { ListOpenShiftsForMeResult } from './shifts/list-open-shifts-for-me.use-case'

export { getShiftById } from './shifts/get-shift-by-id.use-case'
export type {
  GetShiftInput,
  GetShiftResult,
  ShiftDetail,
} from './shifts/get-shift-by-id.use-case'

export { updateShift } from './shifts/update-shift.use-case'
export type {
  UpdateShiftInput,
  UpdateShiftResult,
} from './shifts/update-shift.use-case'

export { deleteShift } from './shifts/delete-shift.use-case'
export type {
  DeleteShiftInput,
  DeleteShiftResult,
} from './shifts/delete-shift.use-case'

export { getShiftExpectedComposition } from './shifts/get-shift-expected-composition.use-case'
export type {
  GetShiftExpectedCompositionInput,
  GetShiftExpectedCompositionResult,
} from './shifts/get-shift-expected-composition.use-case'

export { listExpectedCompositionsForSchedule } from './shifts/list-expected-compositions-for-schedule.use-case'
export type {
  ListExpectedCompositionsInput,
  ListExpectedCompositionsResult,
} from './shifts/list-expected-compositions-for-schedule.use-case'

export { setExpectedComposition } from './shifts/set-expected-composition.use-case'
export type {
  SetExpectedCompositionInput,
  SetExpectedCompositionResult,
} from './shifts/set-expected-composition.use-case'

// ─── Shift Patterns ──────────────────────────────────────────────────────────

export { createPattern } from './shift-patterns/create-pattern.use-case'
export type {
  CreatePatternInput,
  CreatePatternResult,
} from './shift-patterns/create-pattern.use-case'

export { generateShiftsFromPattern } from './shift-patterns/generate-shifts-from-pattern.use-case'
export type {
  GenerateShiftsFromPatternInput,
  GenerateShiftsFromPatternResult,
} from './shift-patterns/generate-shifts-from-pattern.use-case'

export { listPatternsForSchedule } from './shift-patterns/list-patterns-for-schedule.use-case'
export type {
  ListPatternsInput,
  ListPatternsResult,
} from './shift-patterns/list-patterns-for-schedule.use-case'

// ─── Assignments ─────────────────────────────────────────────────────────────

export { listMyAssignments } from './assignments/list-my-assignments.use-case'
export type {
  ListMyAssignmentsInput,
  ListMyAssignmentsResult,
} from './assignments/list-my-assignments.use-case'

export { listAssignmentsForSchedule } from './assignments/list-assignments-for-schedule.use-case'
export type {
  ListAssignmentsForScheduleInput,
  ListAssignmentsForScheduleResult,
  ScheduleAssignmentSummary,
} from './assignments/list-assignments-for-schedule.use-case'

export { listAssignmentsForUserInWorkspace } from './assignments/list-assignments-for-user-in-workspace.use-case'
export type {
  ListAssignmentsForUserInWorkspaceInput,
  ListAssignmentsForUserInWorkspaceResult,
} from './assignments/list-assignments-for-user-in-workspace.use-case'

export { assignUsersToShift } from './assignments/assign-users-to-shift.use-case'
export type {
  AssignUsersToShiftInput,
  AssignUsersToShiftResult,
  AssignmentWithMatch,
  AssignmentConflict,
} from './assignments/assign-users-to-shift.use-case'

export { listAssignmentsForShift } from './assignments/list-assignments-for-shift.use-case'
export type {
  ListAssignmentsInput,
  ListAssignmentsResult,
} from './assignments/list-assignments-for-shift.use-case'

export { getAssignmentById } from './assignments/get-assignment-by-id.use-case'
export type {
  GetAssignmentInput,
  GetAssignmentResult,
  AssignmentDetail,
} from './assignments/get-assignment-by-id.use-case'

export { unassignUser } from './assignments/unassign-user.use-case'
export type {
  UnassignUserInput,
  UnassignUserResult,
} from './assignments/unassign-user.use-case'

// ─── Assignment Decisions (Task 10) ──────────────────────────────────────────

export { acceptAssignment } from './assignment-decisions/accept-assignment.use-case'
export type {
  AcceptAssignmentInput,
  AcceptAssignmentResult,
} from './assignment-decisions/accept-assignment.use-case'

export { rejectAssignment } from './assignment-decisions/reject-assignment.use-case'
export type {
  RejectAssignmentInput,
  RejectAssignmentResult,
} from './assignment-decisions/reject-assignment.use-case'

export { forceAcceptAssignment } from './assignment-decisions/force-accept-assignment.use-case'
export type {
  ForceAcceptAssignmentInput,
  ForceAcceptAssignmentResult,
} from './assignment-decisions/force-accept-assignment.use-case'

export { requestTransfer } from './assignment-decisions/request-transfer.use-case'
export type {
  RequestTransferInput,
  RequestTransferResult,
} from './assignment-decisions/request-transfer.use-case'

export { decideTransferRequest } from './assignment-decisions/decide-transfer-request.use-case'
export type {
  DecideTransferRequestInput,
  DecideTransferRequestResult,
  TransferDecision,
} from './assignment-decisions/decide-transfer-request.use-case'

export { cancelTransferRequest } from './assignment-decisions/cancel-transfer-request.use-case'
export type {
  CancelTransferRequestInput,
  CancelTransferRequestResult,
} from './assignment-decisions/cancel-transfer-request.use-case'

export { listTransferRequestsForWorkspace } from './assignment-decisions/list-transfer-requests-for-workspace.use-case'
export type {
  ListTransferRequestsForWorkspaceInput,
  ListTransferRequestsForWorkspaceResult,
} from './assignment-decisions/list-transfer-requests-for-workspace.use-case'

// ─── Candidates (Task 11) ────────────────────────────────────────────────────

export { listCandidatesSummaryForSchedule } from './candidates/list-candidates-summary-for-schedule.use-case'
export type {
  ListCandidatesSummaryInput,
  ListCandidatesSummaryResult,
} from './candidates/list-candidates-summary-for-schedule.use-case'

export { applyToShift } from './candidates/apply-to-shift.use-case'
export type {
  ApplyToShiftInput,
  ApplyToShiftResult,
} from './candidates/apply-to-shift.use-case'

export { withdrawFromShift } from './candidates/withdraw-from-shift.use-case'
export type {
  WithdrawFromShiftInput,
  WithdrawFromShiftResult,
} from './candidates/withdraw-from-shift.use-case'

export { listCandidatesForShift } from './candidates/list-candidates-for-shift.use-case'
export type {
  ListCandidatesForShiftInput,
  ListCandidatesForShiftResult,
} from './candidates/list-candidates-for-shift.use-case'

export { getMyCandidacyForShift } from './candidates/get-my-candidacy-for-shift.use-case'
export type {
  GetMyCandidacyForShiftInput,
  GetMyCandidacyForShiftResult,
  MyCandidacyData,
} from './candidates/get-my-candidacy-for-shift.use-case'

export { getCandidateCountForShift } from './candidates/get-candidate-count-for-shift.use-case'
export type {
  GetCandidateCountForShiftInput,
  GetCandidateCountForShiftResult,
} from './candidates/get-candidate-count-for-shift.use-case'

export { approveCandidate } from './candidates/approve-candidate.use-case'
export type {
  ApproveCandidateInput,
  ApproveCandidateResult,
  ApproveCandidateData,
} from './candidates/approve-candidate.use-case'

export { rejectCandidate } from './candidates/reject-candidate.use-case'
export type {
  RejectCandidateInput,
  RejectCandidateResult,
} from './candidates/reject-candidate.use-case'

export { submitSwapRequest } from './requests/submit-swap.use-case'
export type {
  SubmitSwapInput,
  SubmitSwapResult,
} from './requests/submit-swap.use-case'

export { submitOfferRequest } from './requests/submit-offer.use-case'
export type {
  SubmitOfferInput,
  SubmitOfferResult,
} from './requests/submit-offer.use-case'

export { submitTimeOffRequest } from './requests/submit-time-off.use-case'
export type {
  SubmitTimeOffInput,
  SubmitTimeOffResult,
} from './requests/submit-time-off.use-case'

export { cancelRequest } from './requests/cancel-request.use-case'
export type {
  CancelRequestInput,
  CancelRequestResult,
} from './requests/cancel-request.use-case'

export { peerRespondSwap } from './requests/peer-respond-swap.use-case'
export type {
  PeerRespondSwapInput,
  PeerRespondSwapResult,
} from './requests/peer-respond-swap.use-case'

export { resolveRequest } from './requests/resolve-request.use-case'
export type {
  ResolveRequestInput,
  ResolveRequestResult,
} from './requests/resolve-request.use-case'

export { clockInToShift } from './time-entries/clock-in.use-case'
export type {
  ClockInInput,
  ClockInResult,
} from './time-entries/clock-in.use-case'

export { clockOutOfShift } from './time-entries/clock-out.use-case'
export type {
  ClockOutInput,
  ClockOutResult,
} from './time-entries/clock-out.use-case'

export { closeAssignment } from './time-entries/close-assignment.use-case'
export type {
  CloseAssignmentInput,
  CloseAssignmentResult,
} from './time-entries/close-assignment.use-case'

export { listTimeEntries } from './time-entries/list-time-entries.use-case'
export type {
  ListTimeEntriesInput,
  ListTimeEntriesResult,
} from './time-entries/list-time-entries.use-case'

export {
  exportTimeEntriesCsv,
  EXPORT_ROW_CAP,
} from './time-entries/export-time-entries-csv.use-case'
export type {
  ExportTimeEntriesCsvInput,
  ExportTimeEntriesCsvResult,
  CsvExportPayload,
} from './time-entries/export-time-entries-csv.use-case'

export { listRequests } from './requests/list-requests.use-case'
export type {
  ListRequestsInput,
  ListRequestsResult,
} from './requests/list-requests.use-case'

export { getRequest } from './requests/get-request.use-case'
export type {
  GetRequestInput,
  GetRequestResult,
} from './requests/get-request.use-case'

export { listShiftTimeline } from './shift-timelines/list-shift-timeline.use-case'
export type {
  ListShiftTimelineInput,
  ListShiftTimelineResult,
} from './shift-timelines/list-shift-timeline.use-case'

export { addShiftTimelineNote } from './shift-timelines/add-shift-timeline-note.use-case'
export type {
  AddShiftTimelineNoteInput,
  AddShiftTimelineNoteResult,
} from './shift-timelines/add-shift-timeline-note.use-case'

// Dashboard (Phase 1b — F01)
export { listUpcomingShifts } from './dashboard/list-upcoming-shifts.use-case'
export type {
  ListUpcomingShiftsInput,
  ListUpcomingShiftsResult,
  UpcomingShift,
} from './dashboard/list-upcoming-shifts.use-case'

export { getDashboardKpis } from './dashboard/get-dashboard-kpis.use-case'
export type {
  GetDashboardKpisInput,
  GetDashboardKpisResult,
  DashboardKpis,
} from './dashboard/get-dashboard-kpis.use-case'

export { getCategoryBreakdown } from './dashboard/get-category-breakdown.use-case'
export type {
  GetCategoryBreakdownInput,
  GetCategoryBreakdownResult,
  CategoryBreakdownRow,
} from './dashboard/get-category-breakdown.use-case'

// ─── Notifications (Task 16) ─────────────────────────────────────────────────
export { listMyNotifications } from './notifications/list-my-notifications.use-case'
export type {
  ListMyNotificationsInput,
  ListMyNotificationsResult,
} from './notifications/list-my-notifications.use-case'

export { getMyUnreadNotificationCount } from './notifications/get-my-unread-count.use-case'
export type { GetMyUnreadCountResult } from './notifications/get-my-unread-count.use-case'

export { markNotificationRead } from './notifications/mark-notification-read.use-case'
export type {
  MarkNotificationReadInput,
  MarkNotificationReadResult,
} from './notifications/mark-notification-read.use-case'

export { markAllMyNotificationsRead } from './notifications/mark-all-read.use-case'
export type { MarkAllReadResult } from './notifications/mark-all-read.use-case'

export { getMyNotificationPreferences } from './notifications/get-my-preferences.use-case'
export type {
  GetMyPreferencesResult,
  PreferenceItem,
} from './notifications/get-my-preferences.use-case'

export { updateMyNotificationPreferences } from './notifications/update-my-preferences.use-case'
export type {
  UpdateMyPreferencesInput,
  UpdateMyPreferencesResult,
} from './notifications/update-my-preferences.use-case'

// ─── Dashboard extras (Track 2 — expanded dashboard) ─────────────────────────
export { getDashboardExtras } from './dashboard/get-dashboard-extras.use-case'
export type {
  GetDashboardExtrasInput,
  GetDashboardExtrasResult,
  DashboardExtras,
} from './dashboard/get-dashboard-extras.use-case'

export { getMyNextShift } from './dashboard/get-my-next-shift.use-case'
export type {
  GetMyNextShiftInput,
  GetMyNextShiftResult,
  MyNextShift,
} from './dashboard/get-my-next-shift.use-case'
