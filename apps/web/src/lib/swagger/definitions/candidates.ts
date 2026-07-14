/**
 * @swagger
 * /api/shifts/{shiftId}/apply:
 *   post:
 *     summary: Colaborador applies to OPEN_FOR_APPLY shift; FIFO position
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '201': { description: ShiftCandidate created with QUEUED status }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: Shift not found / schedule not PUBLISHED }
 *       '409':
 *         description: |
 *           - INVALID_STATE_TRANSITION (shift is DIRECT_ASSIGN)
 *           - ALREADY_EXISTS (user already applied)
 *           - SHIFT_OVERLAP_CONFLICT (cross-workspace overlap)
 *
 * /api/shifts/{shiftId}/candidates:
 *   get:
 *     summary: List candidates (ADMIN/COORD only); ordered by queuePosition
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [QUEUED, APPROVED, REJECTED, WITHDRAWN] }
 *     responses:
 *       '200': { description: ShiftCandidate[] }
 *       '403': { description: Caller not ADMIN/COORD }
 *
 * /api/shifts/{shiftId}/candidates/me:
 *   get:
 *     summary: Caller's own candidacy (returns null fields when no candidacy)
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: |
 *           { candidateId: ID|null, position: int|null, count: int, status: enum|null }
 *
 * /api/shifts/{shiftId}/candidates/count:
 *   get:
 *     summary: Count of QUEUED candidates (any active member)
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: '{ count: int }' }
 *
 * /api/candidates/{candidateId}/approve:
 *   post:
 *     summary: ADMIN/COORD approves candidate; creates Assignment (PENDING_ACCEPT or ACCEPTED if autoAccept)
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoAccept: { type: boolean, default: false }
 *     responses:
 *       '200': { description: Approved + assignment created }
 *       '409':
 *         description: |
 *           - INVALID_STATE_TRANSITION (not QUEUED or schedule not PUBLISHED)
 *           - SHIFT_HEADCOUNT_FULL
 *           - SHIFT_OVERLAP_CONFLICT (re-check)
 *
 * /api/candidates/{candidateId}/reject:
 *   post:
 *     summary: ADMIN/COORD rejects candidate; reason required
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: candidateId
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
 *       '200': { description: Rejected }
 *       '409': { description: INVALID_STATE_TRANSITION }
 *
 * /api/candidates/{candidateId}/withdraw:
 *   post:
 *     summary: Candidate owner withdraws from queue (QUEUED only)
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: candidateId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Withdrawn }
 *       '403': { description: Not the candidate owner }
 *       '409': { description: INVALID_STATE_TRANSITION }
 */
export {}
