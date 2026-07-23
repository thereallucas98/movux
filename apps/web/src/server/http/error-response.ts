import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

/**
 * Centralized mapping from domain error codes (discriminated-union `code` field
 * returned by use cases) to HTTP responses. Every REST route in Tasks 02-16
 * uses this — no per-route inline switch.
 *
 * To add a new code: extend ERROR_MAP below and the ErrorCode union. Tests will
 * fail until every branch has a status + message.
 */

export type ErrorCode =
  // Auth
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  // Validation / routing
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  // Tenant membership
  | 'TARGET_USER_NOT_FOUND'
  | 'ALREADY_MEMBER'
  | 'LAST_SUPER_ADMIN'
  // Workspace membership
  | 'LAST_ADMIN'
  | 'CANNOT_DEMOTE_SELF'
  // Categories
  | 'ALREADY_EXISTS'
  | 'CANNOT_DELETE_GERAL'
  | 'PLAN_LIMIT_REACHED'
  // Workspace member specialty
  | 'SPECIALTY_NOT_IN_WORKSPACE'
  | 'CANNOT_DELETE_IN_USE'
  | 'TARGET_MEMBER_NOT_FOUND'
  // Schedule
  | 'SCHEDULE_PERIOD_OVERLAP'
  // Shift / Pattern
  | 'SHIFT_TIME_INVALID'
  | 'PATTERN_RANGE_TOO_LARGE'
  // Assignment
  | 'SHIFT_HEADCOUNT_FULL'
  | 'SHIFT_OVERLAP_CONFLICT'
  | 'USER_NOT_WORKSPACE_MEMBER'
  // Assignment decisions (Task 10)
  | 'DECISION_WINDOW_EXPIRED'
  // State machines (reserved for Tasks 07+)
  | 'INVALID_STATE_TRANSITION'
  // Conflicts
  | 'EMAIL_IN_USE'
  | 'FORBIDDEN_ROLE'
  // Request system (Task 12)
  | 'ATTACHMENT_INVALID'
  | 'ATTACHMENT_UPLOAD_FAILED'
  | 'TIME_OFF_TOO_LARGE'
  // Time tracking (Task 13)
  | 'ALREADY_CLOCKED_IN'
  | 'EXPORT_TOO_LARGE'
  // Shipments (S1-T3)
  | 'CUSTOMER_PROFILE_NOT_FOUND'
  | 'INVALID_ADDRESS'
  | 'NO_PRICING_AVAILABLE'
  | 'ALREADY_IN_QUEUE'
  | 'NOT_CALLED'
  | 'ALREADY_PROPOSED'
  | 'TOO_MANY_ATTEMPTS'
  | 'ATTEMPT_STILL_PENDING'
  | 'CARRIER_NOT_VERIFIED'
  // Safety check-in (S3-T1)
  | 'ALREADY_CONFIRMED'
  // Transit status (S3-T2)
  | 'SAFETY_NOT_CONFIRMED'
  // Reviews (S4-T1)
  | 'ALREADY_REVIEWED'
  // Fleet taxonomy (S10-T1)
  | 'INVALID_SPEC'
  | 'INVALID_MODEL'
  | 'DUPLICATE_PLATE'
  | 'VEHICLE_LIMIT_REACHED'

interface ErrorShape {
  status: number
  message: string
}

const ERROR_MAP: Record<ErrorCode, ErrorShape> = {
  // 401
  UNAUTHENTICATED: { status: 401, message: 'Unauthenticated' },
  // 403
  FORBIDDEN: { status: 403, message: 'Forbidden' },
  FORBIDDEN_ROLE: { status: 403, message: 'Role not allowed' },
  // 400
  VALIDATION_ERROR: { status: 400, message: 'Invalid payload' },
  // 404
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  TARGET_USER_NOT_FOUND: { status: 404, message: 'Target user not found' },
  // 409
  ALREADY_MEMBER: { status: 409, message: 'User is already a member' },
  LAST_SUPER_ADMIN: {
    status: 409,
    message: 'Cannot remove the last SUPER_ADMIN',
  },
  LAST_ADMIN: {
    status: 409,
    message: 'Cannot remove or demote the last ADMIN',
  },
  CANNOT_DEMOTE_SELF: {
    status: 409,
    message: 'Cannot change your own role',
  },
  ALREADY_EXISTS: { status: 409, message: 'Resource already exists' },
  CANNOT_DELETE_GERAL: {
    status: 409,
    message: 'Cannot delete the default "Geral" category',
  },
  PLAN_LIMIT_REACHED: { status: 409, message: 'Plan limit reached' },
  SPECIALTY_NOT_IN_WORKSPACE: {
    status: 404,
    message: 'Specialty not accessible to this workspace',
  },
  CANNOT_DELETE_IN_USE: {
    status: 409,
    message: 'Cannot delete resource; it is currently assigned',
  },
  TARGET_MEMBER_NOT_FOUND: { status: 404, message: 'Target member not found' },
  SCHEDULE_PERIOD_OVERLAP: {
    status: 409,
    message: 'Period overlaps with another active schedule in this category',
  },
  SHIFT_TIME_INVALID: {
    status: 400,
    message: 'Invalid shift time configuration',
  },
  PATTERN_RANGE_TOO_LARGE: {
    status: 409,
    message: 'Pattern generation range exceeds the 90-day cap',
  },
  SHIFT_HEADCOUNT_FULL: {
    status: 409,
    message: 'Shift headcount is full',
  },
  SHIFT_OVERLAP_CONFLICT: {
    status: 409,
    message: 'User has an overlapping active assignment',
  },
  USER_NOT_WORKSPACE_MEMBER: {
    status: 404,
    message: 'User is not an active member of the workspace',
  },
  DECISION_WINDOW_EXPIRED: {
    status: 409,
    message: 'Decision window has expired',
  },
  EMAIL_IN_USE: { status: 409, message: 'Email already in use' },
  INVALID_STATE_TRANSITION: {
    status: 409,
    message: 'Invalid state transition',
  },
  ATTACHMENT_INVALID: {
    status: 400,
    message: 'Invalid attachment (MIME or size)',
  },
  ATTACHMENT_UPLOAD_FAILED: {
    status: 502,
    message: 'Failed to upload attachment',
  },
  TIME_OFF_TOO_LARGE: {
    status: 409,
    message: 'TIME_OFF cascade exceeds the per-request cap',
  },
  ALREADY_CLOCKED_IN: {
    status: 409,
    message: 'Assignment already has a time entry',
  },
  EXPORT_TOO_LARGE: {
    status: 409,
    message: 'Export row count exceeds the cap',
  },
  CUSTOMER_PROFILE_NOT_FOUND: {
    status: 404,
    message: 'Customer profile not found',
  },
  INVALID_ADDRESS: {
    status: 400,
    message: 'Address neighborhood is not in the known catalog',
  },
  NO_PRICING_AVAILABLE: {
    status: 422,
    message:
      'No pricing template available for this corridor and shipment type',
  },
  ALREADY_IN_QUEUE: {
    status: 409,
    message: 'Carrier already has a queue entry for this shipment',
  },
  NOT_CALLED: {
    status: 409,
    message: 'Carrier must be CALLED in the queue to submit a proposal',
  },
  ALREADY_PROPOSED: {
    status: 409,
    message: 'Carrier already has a proposal for this shipment',
  },
  CARRIER_NOT_VERIFIED: {
    status: 403,
    message: 'Carrier must be verified to submit a proposal',
  },
  TOO_MANY_ATTEMPTS: {
    status: 409,
    message: 'Proposal already has the maximum of 5 attempts',
  },
  ATTEMPT_STILL_PENDING: {
    status: 409,
    message: 'Customer has not responded to the current attempt yet',
  },
  ALREADY_CONFIRMED: {
    status: 409,
    message: 'Safety check-in already confirmed for this role',
  },
  SAFETY_NOT_CONFIRMED: {
    status: 409,
    message: 'Both customer and carrier must confirm the safety check-in first',
  },
  ALREADY_REVIEWED: {
    status: 409,
    message: 'This role has already reviewed this shipment',
  },
  INVALID_SPEC: { status: 400, message: 'Vehicle spec not found' },
  INVALID_MODEL: { status: 400, message: 'Vehicle model not found' },
  DUPLICATE_PLATE: { status: 409, message: 'Plate already registered' },
  VEHICLE_LIMIT_REACHED: {
    status: 409,
    message: 'Carrier already has the maximum of 2 active vehicles',
  },
}

/** Error body shape — consistent across every endpoint. */
export interface ErrorBody {
  message: string
  code: ErrorCode
  details?: unknown
  meta?: unknown
}

export function errorResponse(
  code: ErrorCode,
  extras?: { details?: unknown; meta?: unknown; messageOverride?: string },
) {
  const shape = ERROR_MAP[code]
  const body: ErrorBody = {
    message: extras?.messageOverride ?? shape.message,
    code,
  }
  if (extras?.details !== undefined) body.details = extras.details
  if (extras?.meta !== undefined) body.meta = extras.meta
  return NextResponse.json(body, { status: shape.status })
}

export function validationErrorResponse(zodError: ZodError) {
  return errorResponse('VALIDATION_ERROR', {
    details: zodError.issues,
  })
}

/**
 * Convenience helper for the very common shape:
 * `{ success: false; code: ErrorCode; meta?: unknown }` returned by use cases.
 * Forwards `meta` when present (e.g., `PLAN_LIMIT_REACHED`).
 */
export function errorResponseFromResult(result: {
  code: ErrorCode
  meta?: unknown
}) {
  return errorResponse(result.code, {
    ...(result.meta !== undefined ? { meta: result.meta } : {}),
  })
}
