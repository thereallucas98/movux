import { prisma } from '~/lib/db'
import { getAccessTokenFromCookie, verifyAccessToken } from '~/lib/session'
import {
  carrierDocumentRepository,
  carrierProfileRepository,
  customerProfileRepository,
  deliveryConfirmationRepository,
  geographyRepository,
  notificationLogRepository,
  pricingRepository,
  proposalQueueRepository,
  proposalRepository,
  reviewRepository,
  reviewTagRepository,
  safetyCheckInRepository,
  shipmentEventRepository,
  shipmentRepository,
  userRepository,
  vehicleRepository,
  vehicleTaxonomyRepository,
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
    shipmentRepo: typeof shipmentRepository
    customerProfileRepo: typeof customerProfileRepository
    pricingRepo: typeof pricingRepository
    geographyRepo: typeof geographyRepository
    proposalQueueRepo: typeof proposalQueueRepository
    proposalRepo: typeof proposalRepository
    notificationLogRepo: typeof notificationLogRepository
    shipmentEventRepo: typeof shipmentEventRepository
    carrierProfileRepo: typeof carrierProfileRepository
    carrierDocumentRepo: typeof carrierDocumentRepository
    vehicleRepo: typeof vehicleRepository
    vehicleTaxonomyRepo: typeof vehicleTaxonomyRepository
    safetyCheckInRepo: typeof safetyCheckInRepository
    deliveryConfirmationRepo: typeof deliveryConfirmationRepository
    reviewRepo: typeof reviewRepository
    reviewTagRepo: typeof reviewTagRepository
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
      shipmentRepo: shipmentRepository,
      customerProfileRepo: customerProfileRepository,
      pricingRepo: pricingRepository,
      geographyRepo: geographyRepository,
      proposalQueueRepo: proposalQueueRepository,
      proposalRepo: proposalRepository,
      notificationLogRepo: notificationLogRepository,
      shipmentEventRepo: shipmentEventRepository,
      carrierProfileRepo: carrierProfileRepository,
      carrierDocumentRepo: carrierDocumentRepository,
      vehicleRepo: vehicleRepository,
      vehicleTaxonomyRepo: vehicleTaxonomyRepository,
      safetyCheckInRepo: safetyCheckInRepository,
      deliveryConfirmationRepo: deliveryConfirmationRepository,
      reviewRepo: reviewRepository,
      reviewTagRepo: reviewTagRepository,
    },
  }
}
