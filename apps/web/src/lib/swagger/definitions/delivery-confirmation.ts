/**
 * @swagger
 * /api/shipments/{shipmentId}/delivery-confirmation:
 *   post:
 *     summary: Confirm delivery, or report an issue
 *     description: >
 *       Only valid while the shipment is DELIVERED. Only the customer can
 *       call this. issueDescription is required when confirmed is false.
 *       One confirmation per shipment — a second call returns 409.
 *     tags: [Delivery Confirmation]
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
 *             required: [confirmed]
 *             properties:
 *               confirmed: { type: boolean }
 *               issueDescription: { type: string }
 *           example: { confirmed: false, issueDescription: "Caixa amassada" }
 *     responses:
 *       '201':
 *         description: Confirmation recorded
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not DELIVERED, or already confirmed
 *   get:
 *     summary: Get delivery confirmation status
 *     description: >
 *       Returns the confirmation record, or null if not confirmed yet. If
 *       24h have passed since the shipment became DELIVERED with no manual
 *       confirmation, this call lazily auto-confirms (confirmed: true)
 *       before responding — no background job exists yet. Accessible to
 *       the shipment's customer or its selected carrier.
 *     tags: [Delivery Confirmation]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Confirmation record, or null
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not DELIVERED
 */
