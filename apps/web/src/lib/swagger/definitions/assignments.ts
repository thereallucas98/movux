/**
 * @swagger
 * /api/workspaces/{id}/schedules/{scheduleId}/shifts/{shiftId}/assignments:
 *   post:
 *     summary: Bulk assign users to a shift (parent schedule must be PUBLISHED)
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 minItems: 1
 *                 maxItems: 20
 *     responses:
 *       '201':
 *         description: Assignments created (one per userId, with compositionStatus)
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: NOT_FOUND or USER_NOT_WORKSPACE_MEMBER }
 *       '409':
 *         description: |
 *           - INVALID_STATE_TRANSITION (schedule not PUBLISHED)
 *           - SHIFT_HEADCOUNT_FULL
 *           - SHIFT_OVERLAP_CONFLICT (response includes details.conflicts + details.alternatives)
 *   get:
 *     summary: List assignments for a shift (with compositionStatus)
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: OK }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 * /api/workspaces/{id}/schedules/{scheduleId}/shifts/{shiftId}/assignments/{assignmentId}:
 *   delete:
 *     summary: Unassign user (PENDING_ACCEPT only — hard delete)
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Removed }
 *       '409': { description: INVALID_STATE_TRANSITION (already accepted/rejected) }
 *
 * /api/assignments/{assignmentId}:
 *   get:
 *     summary: Get assignment by id (flat surface — used by Tasks 10+)
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Assignment with compositionStatus }
 *       '404': { description: NOT_FOUND }
 *   delete:
 *     summary: Unassign user via flat path
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Removed }
 *       '409': { description: INVALID_STATE_TRANSITION }
 */
export {}
