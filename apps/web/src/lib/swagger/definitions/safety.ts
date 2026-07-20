/**
 * @swagger
 * /api/shipments/{shipmentId}/safety/confirm:
 *   post:
 *     summary: Confirm the safety term check-in
 *     description: >
 *       Only valid while the shipment is CARRIER_SELECTED. Caller must be
 *       the shipment's customer or the carrier of its ACCEPTED proposal —
 *       any other user gets 404. Role is derived from the caller, not sent
 *       by the client. One confirmation per role per shipment.
 *     tags: [Safety]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '201':
 *         description: Check-in confirmed
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not CARRIER_SELECTED, or this role already confirmed
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/safety:
 *   get:
 *     summary: Get safety check-in status
 *     description: >
 *       Returns the customer's and carrier's check-in state (null if not
 *       yet confirmed). Same access rule as confirm — only the shipment's
 *       customer or selected carrier can read it.
 *     tags: [Safety]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Check-in status for both roles
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not CARRIER_SELECTED
 */
