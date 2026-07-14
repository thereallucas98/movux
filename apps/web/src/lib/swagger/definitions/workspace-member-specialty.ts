/**
 * @swagger
 * /api/workspaces/{id}/members/{memberId}:
 *   get:
 *     summary: Get workspace member detail (includes specialty)
 *     tags: [Workspace Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Member detail with user + specialty inline }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: TARGET_MEMBER_NOT_FOUND }
 */

/**
 * @swagger
 * /api/workspaces/{id}/members/{memberId}/specialty:
 *   patch:
 *     summary: Set member's specialty in the workspace (ADMIN or COORDENADOR)
 *     description: >
 *       Validates that the specialty is available to the workspace (GLOBAL matching
 *       vertical, TENANT of same tenant, or WORKSPACE of this workspace).
 *       Reassigning soft-deletes the previous active row and creates a new one.
 *     tags: [Workspace Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [specialtyId]
 *             properties:
 *               specialtyId: { type: string, format: uuid }
 *     responses:
 *       '200': { description: Specialty assigned }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: TARGET_MEMBER_NOT_FOUND or SPECIALTY_NOT_IN_WORKSPACE }
 *   delete:
 *     summary: Unset member's specialty (ADMIN or COORDENADOR)
 *     tags: [Workspace Members]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Specialty unset }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { description: TARGET_MEMBER_NOT_FOUND or NOT_FOUND (no active assignment) }
 */
export {}
