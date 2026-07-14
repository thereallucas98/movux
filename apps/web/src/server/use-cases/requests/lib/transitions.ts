import type {
  RequestStatus,
  RequestType,
} from '~/server/repositories/request.repository'

/** Statuses where the requester is still allowed to cancel their own request. */
export const CANCELLABLE_STATUSES: RequestStatus[] = ['PENDING_PEER', 'PENDING']

/** Statuses where the request is awaiting a Coordenador decision. */
export const COORD_RESOLVABLE_STATUSES: RequestStatus[] = ['PENDING']

/** Statuses where the SWAP target peer can still respond. */
export const PEER_RESPONDABLE_STATUSES: RequestStatus[] = ['PENDING_PEER']

export function canCancel(status: RequestStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status)
}

export function canCoordResolve(status: RequestStatus): boolean {
  return COORD_RESOLVABLE_STATUSES.includes(status)
}

export function canPeerRespond(
  type: RequestType,
  status: RequestStatus,
): boolean {
  return type === 'SWAP' && PEER_RESPONDABLE_STATUSES.includes(status)
}
