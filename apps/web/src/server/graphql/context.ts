import { prisma } from '~/lib/db'
import { getAccessTokenFromCookie, verifyAccessToken } from '~/lib/session'
import {
  assignmentRepository,
  auditLogRepository,
  categoryRepository,
  customerProfileRepository,
  geographyRepository,
  notificationPreferenceRepository,
  notificationRepository,
  pricingRepository,
  requestRepository,
  scheduleRepository,
  shiftCandidateRepository,
  shiftExpectedCompositionRepository,
  shiftPatternRepository,
  shiftRepository,
  shiftTimelineNoteRepository,
  shipmentRepository,
  specialtyRepository,
  tenantMembershipRepository,
  tenantRepository,
  timeEntryRepository,
  transferRequestRepository,
  userRepository,
  userSpecialtyRepository,
  workspaceMembershipRepository,
  workspaceRepository,
} from '~/server/repositories'

export interface Principal {
  userId: string
  email: string
  role: string
}

export interface GraphQLContext {
  principal: Principal | null
  repos: {
    userRepo: typeof userRepository
    tenantRepo: typeof tenantRepository
    tenantMembershipRepo: typeof tenantMembershipRepository
    workspaceRepo: typeof workspaceRepository
    workspaceMembershipRepo: typeof workspaceMembershipRepository
    categoryRepo: typeof categoryRepository
    specialtyRepo: typeof specialtyRepository
    userSpecialtyRepo: typeof userSpecialtyRepository
    scheduleRepo: typeof scheduleRepository
    shiftRepo: typeof shiftRepository
    shiftPatternRepo: typeof shiftPatternRepository
    shiftCompositionRepo: typeof shiftExpectedCompositionRepository
    assignmentRepo: typeof assignmentRepository
    transferRequestRepo: typeof transferRequestRepository
    shiftCandidateRepo: typeof shiftCandidateRepository
    requestRepo: typeof requestRepository
    timeEntryRepo: typeof timeEntryRepository
    shiftTimelineNoteRepo: typeof shiftTimelineNoteRepository
    auditLogRepo: typeof auditLogRepository
    notificationRepo: typeof notificationRepository
    notificationPreferenceRepo: typeof notificationPreferenceRepository
    shipmentRepo: typeof shipmentRepository
    customerProfileRepo: typeof customerProfileRepository
    pricingRepo: typeof pricingRepository
    geographyRepo: typeof geographyRepository
  }
}

async function resolvePrincipal(request: Request): Promise<Principal | null> {
  const cookieHeader = request.headers.get('cookie')
  const token = getAccessTokenFromCookie(cookieHeader)
  if (!token) return null

  try {
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        deletedAt: true,
      },
    })

    if (!user || user.deletedAt) return null

    return {
      userId: user.id,
      email: user.email,
      role: user.role as string,
    }
  } catch {
    return null
  }
}

export async function createGraphQLContext(
  request: Request,
): Promise<GraphQLContext> {
  const principal = await resolvePrincipal(request)

  return {
    principal,
    repos: {
      userRepo: userRepository,
      tenantRepo: tenantRepository,
      tenantMembershipRepo: tenantMembershipRepository,
      workspaceRepo: workspaceRepository,
      workspaceMembershipRepo: workspaceMembershipRepository,
      categoryRepo: categoryRepository,
      specialtyRepo: specialtyRepository,
      userSpecialtyRepo: userSpecialtyRepository,
      scheduleRepo: scheduleRepository,
      shiftRepo: shiftRepository,
      shiftPatternRepo: shiftPatternRepository,
      shiftCompositionRepo: shiftExpectedCompositionRepository,
      assignmentRepo: assignmentRepository,
      transferRequestRepo: transferRequestRepository,
      shiftCandidateRepo: shiftCandidateRepository,
      requestRepo: requestRepository,
      timeEntryRepo: timeEntryRepository,
      shiftTimelineNoteRepo: shiftTimelineNoteRepository,
      auditLogRepo: auditLogRepository,
      notificationRepo: notificationRepository,
      notificationPreferenceRepo: notificationPreferenceRepository,
      shipmentRepo: shipmentRepository,
      customerProfileRepo: customerProfileRepository,
      pricingRepo: pricingRepository,
      geographyRepo: geographyRepository,
    },
  }
}
