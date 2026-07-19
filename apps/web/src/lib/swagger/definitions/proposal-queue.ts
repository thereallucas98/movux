/**
 * @swagger
 * /api/shipments/{shipmentId}/queue/join:
 *   post:
 *     summary: Join the proposal queue
 *     description: >
 *       Carrier joins the FIFO queue for an OPEN shipment. If fewer than 3
 *       entries are currently CALLED, this (and/or the oldest WAITING
 *       entries) are called immediately (synchronous "hybrid" call-group,
 *       no background job).
 *     tags: [Proposal Queue]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '201':
 *         description: Queue entry created (status WAITING or CALLED)
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not OPEN, or carrier already has a queue entry
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/queue/withdraw:
 *   post:
 *     summary: Withdraw from the proposal queue
 *     description: Only valid from WAITING or CALLED. Withdrawing a CALLED entry frees a slot for the next WAITING carrier (by position).
 *     tags: [Proposal Queue]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Entry withdrawn
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Entry is already EXHAUSTED or WITHDRAWN
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/queue/me:
 *   get:
 *     summary: Get my queue entry
 *     description: Returns the authenticated carrier's own queue entry (status, position) for a shipment.
 *     tags: [Proposal Queue]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Queue entry
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */
