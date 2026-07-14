/**
 * @swagger
 * /api/workspaces/{id}/specialties:
 *   post:
 *     summary: Create a WORKSPACE-scoped specialty (ADMIN only)
 *     tags: [Workspace Specialties]
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
 *             required: [slug, name]
 *             properties:
 *               slug: { type: string, pattern: '^[a-z0-9][a-z0-9_-]{1,49}$' }
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               description: { type: string, maxLength: 500 }
 *     responses:
 *       '201': { description: Specialty created }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: ALREADY_EXISTS (duplicate slug) }
 *   get:
 *     summary: List specialties for workspace (merged GLOBAL + TENANT + WORKSPACE)
 *     description: >
 *       Any active member can read. Response items include a `source` field
 *       indicating which scope wins. Override order: WORKSPACE > TENANT > GLOBAL
 *       by slug. Sorted by name (PT-BR collation).
 *     tags: [Workspace Specialties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Merged specialty list }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 */

/**
 * @swagger
 * /api/workspaces/{id}/specialties/{specialtyId}:
 *   patch:
 *     summary: Update a WORKSPACE-scoped specialty (ADMIN only)
 *     tags: [Workspace Specialties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: specialtyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               description: { type: string, nullable: true, maxLength: 500 }
 *     responses:
 *       '200': { description: Specialty updated }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *   delete:
 *     summary: Soft-delete a WORKSPACE-scoped specialty (ADMIN only)
 *     tags: [Workspace Specialties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: specialtyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Specialty soft-deleted }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {}
