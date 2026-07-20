/**
 * @swagger
 * /api/shipments/{shipmentId}/events:
 *   get:
 *     summary: Get the shipment's event history
 *     description: >
 *       Chronological audit trail (occurredAt asc) of the shipment's
 *       lifecycle transitions: PUBLISHED, PROPOSAL_RECEIVED,
 *       CARRIER_SELECTED, SAFETY_CONFIRMED (only once, when both the
 *       customer and carrier have confirmed), COLLECTED, IN_TRANSIT,
 *       DELIVERED. Accessible to the shipment's customer or its selected
 *       carrier, at any point in the lifecycle.
 *     tags: [Shipment Events]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: List of events, chronological order
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */
