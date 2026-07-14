/**
 * @swagger
 * /api/workspaces/{id}/schedules/{scheduleId}/shifts:
 *   post:
 *     summary: Create a shift (parent schedule must be DRAFT)
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, startAt, endAt]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               startAt: { type: string, format: date-time }
 *               endAt: { type: string, format: date-time }
 *               headcount: { type: integer, minimum: 1, maximum: 1000 }
 *               notes: { type: string, maxLength: 500, nullable: true }
 *     responses:
 *       '201': { description: Created }
 *       '400': { description: SHIFT_TIME_INVALID or VALIDATION_ERROR }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: NOT_FOUND }
 *       '409': { description: INVALID_STATE_TRANSITION }
 *   get:
 *     summary: List shifts in a schedule
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [OPEN, FILLED, CANCELLED, COMPLETED] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: fromAt
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: toAt
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200': { description: Paginated list }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 * /api/workspaces/{id}/schedules/{scheduleId}/shifts/{shiftId}:
 *   get:
 *     summary: Get shift detail with expected composition
 *     tags: [Shifts]
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
 *       '404': { description: NOT_FOUND }
 *   patch:
 *     summary: Edit shift fields (parent schedule must be DRAFT)
 *     tags: [Shifts]
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
 *       '200': { description: Updated }
 *       '409': { description: INVALID_STATE_TRANSITION }
 *   delete:
 *     summary: Delete shift (DRAFT hard, PUBLISHED -> CANCELLED, CLOSED 409)
 *     tags: [Shifts]
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
 *       - in: query
 *         name: reason
 *         schema: { type: string }
 *     responses:
 *       '204': { description: Deleted or cancelled }
 *       '409': { description: INVALID_STATE_TRANSITION when CLOSED }
 *
 * /api/workspaces/{id}/schedules/{scheduleId}/shifts/{shiftId}/expected-composition:
 *   patch:
 *     summary: Replace expected specialty composition for a shift
 *     tags: [Shifts]
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
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [specialtyId, count]
 *                   properties:
 *                     specialtyId: { type: string, format: uuid }
 *                     count: { type: integer, minimum: 1 }
 *     responses:
 *       '200': { description: Composition replaced }
 *       '404': { description: SPECIALTY_NOT_IN_WORKSPACE }
 *       '409': { description: INVALID_STATE_TRANSITION }
 *
 * /api/workspaces/{id}/schedules/{scheduleId}/patterns:
 *   post:
 *     summary: Create a shift pattern
 *     tags: [Shifts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, daysOfWeek, startTimeMinutes, endTimeMinutes]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string, nullable: true }
 *               daysOfWeek:
 *                 type: array
 *                 items: { type: integer, minimum: 0, maximum: 6 }
 *               startTimeMinutes: { type: integer, minimum: 0, maximum: 1439 }
 *               endTimeMinutes: { type: integer, minimum: 0, maximum: 1439 }
 *               crossesMidnight: { type: boolean }
 *               headcount: { type: integer, minimum: 1, maximum: 1000 }
 *     responses:
 *       '201': { description: Pattern created }
 *       '400': { description: SHIFT_TIME_INVALID }
 *
 * /api/workspaces/{id}/schedules/{scheduleId}/patterns/{patternId}/generate:
 *   post:
 *     summary: Generate Shift instances from a Pattern (idempotent, max 90 days)
 *     tags: [Shifts]
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
 *         name: patternId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rangeStart, rangeEnd]
 *             properties:
 *               rangeStart: { type: string, format: date-time }
 *               rangeEnd: { type: string, format: date-time }
 *     responses:
 *       '200':
 *         description: Generation report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 generated: { type: integer }
 *                 skipped: { type: integer }
 *       '409': { description: PATTERN_RANGE_TOO_LARGE or INVALID_STATE_TRANSITION }
 */
export {}
