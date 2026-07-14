/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a workspace
 *     description: >
 *       Creates a workspace inside a tenant. Caller must be SUPER_ADMIN of the
 *       tenant. The caller is auto-added as ADMIN of the new workspace in the
 *       same transaction (workspace + membership + audit log).
 *     tags: [Workspaces]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId, name, vertical]
 *             properties:
 *               tenantId: { type: string, format: uuid }
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               timezone: { type: string, description: 'IANA timezone; defaults to America/Sao_Paulo' }
 *               vertical: { type: string, enum: [HOSPITAL, CLINIC, GYM, OTHER] }
 *           example:
 *             tenantId: "00000000-0000-0000-0000-000000000001"
 *             name: "Unidade Central"
 *             vertical: "HOSPITAL"
 *     responses:
 *       '201': { description: Workspace created }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *   get:
 *     summary: List workspaces the caller belongs to
 *     tags: [Workspaces]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200': { description: Page of workspaces }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 */

/**
 * @swagger
 * /api/tenants/{id}/workspaces:
 *   get:
 *     summary: List workspaces in a tenant (SUPER_ADMIN only)
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200': { description: Page of workspaces }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 */

/**
 * @swagger
 * /api/workspaces/{id}:
 *   get:
 *     summary: Get workspace detail
 *     description: >
 *       Returns the workspace. ADMIN callers get paginated memberships inline;
 *       COORDENADOR and COLABORADOR callers get the workspace fields only
 *       (memberships list is empty).
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: membersCursor
 *         schema: { type: string }
 *       - in: query
 *         name: membersLimit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200': { description: Workspace detail }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *   patch:
 *     summary: Update workspace (ADMIN only)
 *     tags: [Workspaces]
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
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               timezone: { type: string }
 *               vertical: { type: string, enum: [HOSPITAL, CLINIC, GYM, OTHER] }
 *     responses:
 *       '200': { description: Workspace updated }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *   delete:
 *     summary: Soft-delete workspace (ADMIN only)
 *     description: Cascade soft-deletes all active memberships.
 *     tags: [Workspaces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204': { description: Workspace soft-deleted }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 */

/**
 * @swagger
 * /api/workspaces/{id}/members:
 *   post:
 *     summary: Add member to workspace by email (ADMIN only)
 *     description: >
 *       Looks up an active user by email. Returns 404 TARGET_USER_NOT_FOUND if
 *       no active user matches. A soft-deleted membership is reactivated with
 *       the new role instead of returning 409.
 *     tags: [Workspace Members]
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
 *             required: [email, role]
 *             properties:
 *               email: { type: string, format: email }
 *               role: { type: string, enum: [ADMIN, COORDENADOR, COLABORADOR] }
 *     responses:
 *       '201': { description: Member added }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: ALREADY_MEMBER }
 */

/**
 * @swagger
 * /api/workspaces/{id}/members/{memberId}:
 *   patch:
 *     summary: Change member role (ADMIN only)
 *     description: >
 *       Guards: LAST_ADMIN (409) when demoting the only active ADMIN;
 *       CANNOT_DEMOTE_SELF (409) when caller targets their own membership.
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
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [ADMIN, COORDENADOR, COLABORADOR] }
 *     responses:
 *       '200': { description: Role updated }
 *       '400': { $ref: '#/components/responses/ValidationError' }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: LAST_ADMIN or CANNOT_DEMOTE_SELF }
 *   delete:
 *     summary: Remove member from workspace (ADMIN only)
 *     description: Returns 409 LAST_ADMIN when removing the last active ADMIN.
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
 *       '204': { description: Member removed }
 *       '401': { $ref: '#/components/responses/UnauthorizedError' }
 *       '403': { $ref: '#/components/responses/ForbiddenError' }
 *       '404': { $ref: '#/components/responses/NotFoundError' }
 *       '409': { description: LAST_ADMIN }
 */
export {}
