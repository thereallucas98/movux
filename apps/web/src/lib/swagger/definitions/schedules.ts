/**
 * @swagger
 * /api/workspaces/{id}/schedules:
 *   post:
 *     summary: Create a schedule (DRAFT)
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoryId, periodStart, periodEnd]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string, minLength: 2, maxLength: 120 }
 *               periodStart: { type: string, format: date-time }
 *               periodEnd: { type: string, format: date-time }
 *     responses:
 *       '201': { description: Created }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: Category not accessible }
 *       '409': { description: SCHEDULE_PERIOD_OVERLAP }
 *   get:
 *     summary: List schedules
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, PUBLISHED, CLOSED] }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
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
 */

/**
 * @swagger
 * /api/workspaces/{id}/schedules/{scheduleId}:
 *   get:
 *     summary: Get schedule detail
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Schedule }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *   patch:
 *     summary: Update schedule metadata (DRAFT only)
 *     tags: [Schedules]
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
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string, minLength: 2, maxLength: 120, nullable: true }
 *               periodStart: { type: string, format: date-time }
 *               periodEnd: { type: string, format: date-time }
 *     responses:
 *       '200': { description: Updated }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: INVALID_STATE_TRANSITION or SCHEDULE_PERIOD_OVERLAP }
 *   delete:
 *     summary: Delete schedule (hard for DRAFT, soft for PUBLISHED/CLOSED)
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Deleted }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 */

/**
 * @swagger
 * /api/workspaces/{id}/schedules/{scheduleId}/publish:
 *   post:
 *     summary: Publish a DRAFT schedule (ADMIN or COORDENADOR)
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: PUBLISHED }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: INVALID_STATE_TRANSITION }
 */

/**
 * @swagger
 * /api/workspaces/{id}/schedules/{scheduleId}/close:
 *   post:
 *     summary: Close a PUBLISHED schedule (response flags closedEarly)
 *     tags: [Schedules]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: CLOSED (with closedEarly flag)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 schedule: { type: object }
 *                 closedEarly: { type: boolean }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: INVALID_STATE_TRANSITION }
 */
export {}
