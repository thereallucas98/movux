/**
 * @swagger
 * /api/shipments/{shipmentId}/collect:
 *   post:
 *     summary: Mark the shipment as collected
 *     description: >
 *       CARRIER_SELECTED -> COLLECTED. Only the shipment's selected carrier
 *       (the ACCEPTED proposal's carrier) can call this. Requires both the
 *       customer and the carrier to have already confirmed the safety
 *       check-in (POST /safety/confirm) — otherwise 409.
 *     tags: [Transit]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Shipment marked COLLECTED
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not CARRIER_SELECTED, or safety check-in is incomplete
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/transit:
 *   post:
 *     summary: Mark the shipment as in transit
 *     description: COLLECTED -> IN_TRANSIT. Only the shipment's selected carrier can call this.
 *     tags: [Transit]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Shipment marked IN_TRANSIT
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not COLLECTED
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/deliver:
 *   post:
 *     summary: Mark the shipment as delivered
 *     description: >
 *       IN_TRANSIT -> DELIVERED. Only the shipment's selected carrier can
 *       call this. Only updates status — the customer's double-confirmation
 *       (deliveryConfirmation) is a separate step (S3-T3).
 *     tags: [Transit]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Shipment marked DELIVERED
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not IN_TRANSIT
 */
