import { GraphQLError } from 'graphql'

import type { ErrorCode } from '~/server/http/error-response'

const CODE_TO_MESSAGE: Record<ErrorCode, string> = {
  UNAUTHENTICATED: 'Unauthenticated',
  FORBIDDEN: 'Forbidden',
  FORBIDDEN_ROLE: 'Role not allowed',
  VALIDATION_ERROR: 'Invalid payload',
  NOT_FOUND: 'Resource not found',
  TARGET_USER_NOT_FOUND: 'Target user not found',
  ALREADY_MEMBER: 'User is already a member',
  LAST_SUPER_ADMIN: 'Cannot remove the last SUPER_ADMIN',
  LAST_ADMIN: 'Cannot remove or demote the last ADMIN',
  CANNOT_DEMOTE_SELF: 'Cannot change your own role',
  ALREADY_EXISTS: 'Resource already exists',
  CANNOT_DELETE_GERAL: 'Cannot delete the default "Geral" category',
  PLAN_LIMIT_REACHED: 'Plan limit reached',
  SPECIALTY_NOT_IN_WORKSPACE: 'Specialty not accessible to this workspace',
  CANNOT_DELETE_IN_USE: 'Cannot delete resource; it is currently assigned',
  TARGET_MEMBER_NOT_FOUND: 'Target member not found',
  SCHEDULE_PERIOD_OVERLAP:
    'Period overlaps with another active schedule in this category',
  SHIFT_TIME_INVALID: 'Invalid shift time configuration',
  PATTERN_RANGE_TOO_LARGE: 'Pattern generation range exceeds the 90-day cap',
  SHIFT_HEADCOUNT_FULL: 'Shift headcount is full',
  SHIFT_OVERLAP_CONFLICT: 'User has an overlapping active assignment',
  USER_NOT_WORKSPACE_MEMBER: 'User is not an active member of the workspace',
  DECISION_WINDOW_EXPIRED: 'Decision window has expired',
  EMAIL_IN_USE: 'Email already in use',
  INVALID_STATE_TRANSITION: 'Invalid state transition',
  ATTACHMENT_INVALID: 'Invalid attachment (MIME or size)',
  ATTACHMENT_UPLOAD_FAILED: 'Failed to upload attachment',
  TIME_OFF_TOO_LARGE: 'TIME_OFF cascade exceeds the per-request cap',
  ALREADY_CLOCKED_IN: 'Assignment already has a time entry',
  EXPORT_TOO_LARGE: 'Export row count exceeds the cap',
  CUSTOMER_PROFILE_NOT_FOUND: 'Customer profile not found',
  INVALID_ADDRESS: 'Address neighborhood is not in the known catalog',
  NO_PRICING_AVAILABLE:
    'No pricing template available for this corridor and shipment type',
  ALREADY_IN_QUEUE: 'Carrier already has a queue entry for this shipment',
  NOT_CALLED: 'Carrier must be CALLED in the queue to submit a proposal',
  ALREADY_PROPOSED: 'Carrier already has a proposal for this shipment',
  TOO_MANY_ATTEMPTS: 'Proposal already has the maximum of 5 attempts',
  ALREADY_CONFIRMED: 'Safety check-in already confirmed for this role',
  SAFETY_NOT_CONFIRMED: 'Both customer and carrier must confirm the safety check-in first',
}

/**
 * Throws a GraphQLError with the extension code matching the REST error map.
 * Optional `extras` are merged into `extensions` alongside the code — used by
 * Task 09's SHIFT_OVERLAP_CONFLICT to surface conflicts + alternatives.
 */
export function gqlError(
  code: ErrorCode,
  messageOverride?: string,
  extras?: Record<string, unknown>,
): GraphQLError {
  return new GraphQLError(messageOverride ?? CODE_TO_MESSAGE[code], {
    extensions: { code, ...(extras ?? {}) },
  })
}

/**
 * Convenience: throws `gqlError` from a use-case failure result, forwarding
 * `meta` into the GraphQL extensions when present (e.g., `PLAN_LIMIT_REACHED`).
 */
export function gqlErrorFromResult(result: {
  code: ErrorCode
  meta?: unknown
}): GraphQLError {
  return gqlError(
    result.code,
    undefined,
    result.meta !== undefined ? { meta: result.meta } : undefined,
  )
}
