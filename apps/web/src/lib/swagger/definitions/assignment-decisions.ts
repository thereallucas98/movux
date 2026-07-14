/**
 * @swagger
 * /api/assignments/{assignmentId}/accept:
 *   post:
 *     summary: Assignee accepts the assignment
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Assignment accepted (with shiftFilled flag) }
 *       '403': { description: Not the assignee }
 *       '409': { description: INVALID_STATE_TRANSITION or DECISION_WINDOW_EXPIRED }
 *
 * /api/assignments/{assignmentId}/reject:
 *   post:
 *     summary: Assignee rejects (with reason); ADMIN/COORD may reject on-behalf
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, minLength: 1, maxLength: 500 }
 *     responses:
 *       '200': { description: Assignment rejected (with shiftUnfilled flag if was FILLED) }
 *       '409': { description: INVALID_STATE_TRANSITION (assignee cannot reject ACCEPTED) }
 *
 * /api/assignments/{assignmentId}/force-accept:
 *   post:
 *     summary: ADMIN/COORD forces accept (bypasses decision window; revives EXPIRED)
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Assignment force-accepted }
 *       '403': { description: Not ADMIN/COORD }
 *       '409': { description: INVALID_STATE_TRANSITION (only PENDING/EXPIRED) }
 *
 * /api/assignments/{assignmentId}/transfer:
 *   post:
 *     summary: Assignee requests transfer to another collaborator
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId, reason]
 *             properties:
 *               targetUserId: { type: string, format: uuid }
 *               reason: { type: string, minLength: 1, maxLength: 500 }
 *     responses:
 *       '201': { description: TransferRequest created }
 *       '400': { description: VALIDATION_ERROR (target == self) }
 *       '404': { description: USER_NOT_WORKSPACE_MEMBER }
 *       '409': { description: INVALID_STATE_TRANSITION, DECISION_WINDOW_EXPIRED, or SHIFT_OVERLAP_CONFLICT (target) }
 *
 * /api/transfer-requests/{transferRequestId}/decide:
 *   post:
 *     summary: ADMIN/COORD approves or rejects a TransferRequest
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: transferRequestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [APPROVE, REJECT] }
 *               reason: { type: string, minLength: 1, maxLength: 500 }
 *     responses:
 *       '200': { description: Decision recorded; if APPROVE, original=TRANSFERRED + new PENDING_ACCEPT created }
 *       '409': { description: INVALID_STATE_TRANSITION (not PENDING) or SHIFT_OVERLAP_CONFLICT (target re-check) }
 *
 * /api/transfer-requests/{transferRequestId}/cancel:
 *   post:
 *     summary: Original requester cancels their own TransferRequest
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: transferRequestId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Cancelled }
 *       '403': { description: Not the requester }
 *       '409': { description: INVALID_STATE_TRANSITION (not PENDING) }
 *
 * /api/workspaces/{id}/transfer-requests:
 *   get:
 *     summary: List transfer requests for a workspace (ADMIN/COORD only)
 *     tags: [Assignment Decisions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED, CANCELLED] }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200': { description: Paginated TransferRequests }
 *       '403': { description: Not ADMIN/COORD }
 */
export {}
