/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a user
 *     description: Creates an account and sets the session cookie.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, password]
 *             properties:
 *               fullName: { type: string, minLength: 2 }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password, minLength: 8 }
 *               role: { type: string, enum: [USER], default: USER }
 *           example:
 *             fullName: "John Doe"
 *             email: "john@example.com"
 *             password: "password123"
 *             role: "USER"
 *     responses:
 *       '201':
 *         description: User created
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '409':
 *         description: Email already in use
 *         content:
 *           application/json:
 *             example: { message: 'Email already in use', code: 'EMAIL_IN_USE' }
 *       '403':
 *         description: Role not allowed for public registration
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
 *             email: "john@example.com"
 *             password: "password123"
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
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset
 *     description: >
 *       Always returns 200 — never reveals whether the email exists.
 *       In development the raw token is printed to the server console.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *           example:
 *             email: "john@example.com"
 *     responses:
 *       '200':
 *         description: Reset link sent (or silently ignored if email not found)
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     description: >
 *       Use the raw token printed to the server console (dev) or received by email.
 *       Token expires after 1 hour and is invalidated after first use.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string, description: 'Raw token from server console or email' }
 *               newPassword: { type: string, format: password, minLength: 8 }
 *           example:
 *             token: "a3f9c2e1b4d8..."
 *             newPassword: "newpassword123"
 *     responses:
 *       '200':
 *         description: Password reset successfully
 *       '400':
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             example: { message: 'Token is invalid or has expired.', code: 'INVALID_OR_EXPIRED_TOKEN' }
 */

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     description: >
 *       Use the JWT token printed to the server console (dev) or received by email.
 *       Token expires after 24 hours.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, description: 'JWT from server console or email' }
 *           example:
 *             token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       '200':
 *         description: Email verified
 *       '400':
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             example: { code: 'INVALID_OR_EXPIRED_TOKEN' }
 *       '409':
 *         description: Email already verified
 *         content:
 *           application/json:
 *             example: { code: 'ALREADY_VERIFIED' }
 */

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     description: >
 *       Requires authentication. Token printed to server console in dev.
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: Verification email sent
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '409':
 *         description: Email already verified
 *         content:
 *           application/json:
 *             example: { code: 'ALREADY_VERIFIED' }
 */
