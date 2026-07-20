/**
 * @swagger
 * /api/admin/notifications:
 *   get:
 *     summary: List notifications (admin)
 *     description: Paginated, optionally filtered by status. Admin only.
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, SENT, FAILED] }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, maximum: 100 }
 *     responses:
 *       '200':
 *         description: Paginated list of notifications
 *       '403':
 *         description: Caller is not an ADMIN
 */

/**
 * @swagger
 * /api/admin/notifications/{notificationId}/retry:
 *   post:
 *     summary: Retry a failed notification
 *     description: >
 *       Only valid for FAILED notifications. Resends the exact HTML
 *       captured at the original send attempt (stored in metadata) — does
 *       not re-run the business logic that produced it, so the resend
 *       reflects the state at the time of the original attempt, not
 *       necessarily the current state. No retry limit (manual action, no
 *       background job). Admin only.
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Retry attempted (check notification status for the outcome)
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Notification is not FAILED
 */
