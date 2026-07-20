/**
 * @swagger
 * /api/shipments/{shipmentId}/reviews:
 *   post:
 *     summary: Submit a review for the other party
 *     description: >
 *       Only valid while the shipment is DELIVERED or REVIEWED. Role is
 *       derived from the caller. Tags must belong to the reviewed party's
 *       role (e.g. a customer reviewing a carrier must use CARRIER tags).
 *       One review per role per shipment. When both reviews exist, the
 *       shipment transitions to REVIEWED.
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               tagIds: { type: array, items: { type: string, format: uuid } }
 *           example: { rating: 5, tagIds: [] }
 *     responses:
 *       '201':
 *         description: Review created
 *       '400':
 *         description: Invalid rating, or a tag doesn't exist / doesn't match the reviewed role
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not DELIVERED/REVIEWED, or this role already reviewed
 *   get:
 *     summary: List the shipment's reviews
 *     description: Returns 0, 1, or 2 reviews (customer and/or carrier), with selected tags.
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: List of reviews
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */
