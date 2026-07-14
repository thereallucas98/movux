/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create a tenant
 *     description: >
 *       Creates a new tenant. The authenticated caller is automatically made a
 *       SUPER_ADMIN of the tenant (atomic create + membership + audit log).
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, minLength: 2, maxLength: 100 }
 *               timezone: { type: string, description: 'IANA timezone; defaults to America/Sao_Paulo' }
 *           example:
 *             name: "Hospital São Lucas"
 *             timezone: "America/Sao_Paulo"
 *     responses:
 *       '201':
 *         description: Tenant created
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *   get:
 *     summary: List tenants for the authenticated user
 *     description: Returns cursor-paginated tenants where the caller has an active membership.
 *     tags: [Tenants]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       '200':
 *         description: Page of tenants
 *         content:
 *           application/json:
 *             example:
 *               data: []
 *               nextCursor: null
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Get tenant detail with members page
 *     tags: [Tenants]
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
 *       '200':
 *         description: Tenant detail + paginated memberships
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *   patch:
 *     summary: Update tenant
 *     description: Update tenant name and/or timezone. SUPER_ADMIN only.
 *     tags: [Tenants]
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
 *     responses:
 *       '200':
 *         description: Updated tenant
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Soft-delete tenant
 *     description: Marks the tenant inactive + cascades soft-delete to all memberships.
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '204':
 *         description: Deleted
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/tenants/{id}/members:
 *   post:
 *     summary: Add a SUPER_ADMIN to the tenant
 *     description: >
 *       Adds a user as SUPER_ADMIN of the tenant. The target user must already exist.
 *       Duplicates return 409 ALREADY_MEMBER.
 *     tags: [Tenant Members]
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
 *             required: [userId, role]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               role:   { type: string, enum: [SUPER_ADMIN] }
 *     responses:
 *       '201':
 *         description: Membership created
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         description: Target user not found
 *       '409':
 *         description: User is already a member
 *   get:
 *     summary: List active members of the tenant
 *     tags: [Tenant Members]
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
 *       '200':
 *         description: Page of memberships
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 */

/**
 * @swagger
 * /api/tenants/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a member
 *     description: >
 *       Soft-deletes the membership. Cannot remove the last active SUPER_ADMIN
 *       (returns 409 LAST_SUPER_ADMIN).
 *     tags: [Tenant Members]
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
 *       '204':
 *         description: Membership removed
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         $ref: '#/components/responses/ForbiddenError'
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Cannot remove the last SUPER_ADMIN
 */
