/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a customer or carrier
 *     description: Creates an account (with the matching customerProfile or carrierProfile) and sets the session cookie.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password, role]
 *             properties:
 *               fullName: { type: string, minLength: 2 }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *               role: { type: string, enum: [CUSTOMER, CARRIER] }
 *               phone: { type: string, description: 'Required when role = CARRIER; optional for CUSTOMER' }
 *           examples:
 *             customer:
 *               value: { fullName: "João Cliente", email: "joao@cliente.dev", password: "Senha@123", role: "CUSTOMER" }
 *             carrier:
 *               value: { fullName: "Maria Carrier", email: "maria@carrier.dev", password: "Senha@123", role: "CARRIER", phone: "83999990000" }
 *     responses:
 *       '201':
 *         description: User created
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '409':
 *         description: Email already in use
 *         content:
 *           application/json:
 *             example: { message: 'Email already in use' }
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login
 *     description: Authenticates with email and password. Sets the session cookie.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *           example:
 *             email: "joao@cliente.dev"
 *             password: "Senha@123"
 *     responses:
 *       '200':
 *         description: Login successful
 *       '401':
 *         description: Invalid credentials
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Clears the session cookie.
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       '200':
 *         description: Logged out
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the authenticated user
 *     description: Returns the user tied to the session cookie.
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: Authenticated user
 *         content:
 *           application/json:
 *             example: { id: "uuid", email: "joao@cliente.dev", fullName: "João Cliente", role: "CUSTOMER", avatarUrl: null, createdAt: "2026-07-19T00:00:00.000Z" }
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */
