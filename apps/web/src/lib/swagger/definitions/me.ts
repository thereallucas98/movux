/**
 * @swagger
 * /api/me:
 *   get:
 *     summary: Get authenticated user
 *     description: Returns the authenticated user and context (memberships, adminCities).
 *     tags: [Me]
 *     responses:
 *       '200':
 *         description: User data
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *   patch:
 *     summary: Update profile
 *     description: Updates fullName and/or phone of the authenticated user.
 *     tags: [Me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string, minLength: 2 }
 *               phone: { type: string, minLength: 8 }
 *           example:
 *             fullName: "John Doe"
 *             phone: "+5511999999999"
 *     responses:
 *       '200':
 *         description: Profile updated
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/me/password:
 *   patch:
 *     summary: Change password
 *     description: Verifies the current password then sets a new one.
 *     tags: [Me]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, format: password, minLength: 8 }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *           example:
 *             currentPassword: "oldpassword123"
 *             newPassword: "newpassword456"
 *     responses:
 *       '200':
 *         description: Password changed
 *       '400':
 *         description: Wrong current password
 *         content:
 *           application/json:
 *             example: { code: 'WRONG_PASSWORD' }
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
