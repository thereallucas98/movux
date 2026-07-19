/**
 * @swagger
 * /api/shipments/{shipmentId}/proposal:
 *   post:
 *     summary: Submit a proposal (attempt 1)
 *     description: >
 *       Carrier must be CALLED in the shipment's queue. Creates the proposal
 *       with agreedSlaHours = ceil((customerSlaHours + carrierSlaHours) / 2)
 *       and moves the carrier's queue entry to ACTIVE (freeing a CALLED slot
 *       for the next WAITING carrier).
 *     tags: [Proposals]
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
 *             required: [priceInCents, carrierSlaHours]
 *             properties:
 *               priceInCents: { type: integer }
 *               carrierSlaHours: { type: integer, enum: [4, 6, 8, 12, 24] }
 *               message: { type: string }
 *           example: { priceInCents: 22000, carrierSlaHours: 6, message: "Posso ir hoje" }
 *     responses:
 *       '201':
 *         description: Proposal created (attempt 1)
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Carrier is not CALLED, or already has a proposal for this shipment
 *   get:
 *     summary: Get my proposal
 *     description: Returns the authenticated carrier's own proposal and all attempts.
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Proposal with attempts
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/proposal/attempts:
 *   post:
 *     summary: Add a proposal attempt (counter-offer)
 *     description: Only valid while the proposal is ACTIVE and has fewer than 5 attempts. Resets expiresAt relative to now.
 *     tags: [Proposals]
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
 *             required: [priceInCents]
 *             properties:
 *               priceInCents: { type: integer }
 *               message: { type: string }
 *     responses:
 *       '201':
 *         description: Attempt added
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Proposal is not ACTIVE, or already has 5 attempts
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/proposals:
 *   get:
 *     summary: List all proposals (customer)
 *     description: Returns every proposal (any status) with attempts for a shipment the authenticated customer owns.
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: List of proposals with attempts
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/proposals/{proposalId}/accept:
 *   post:
 *     summary: Accept a proposal (select the carrier)
 *     description: >
 *       Only valid while the shipment is PROPOSALS_RECEIVED and the proposal
 *       is ACTIVE. Accepts the proposal's current attempt, moves the
 *       shipment to CARRIER_SELECTED with finalPriceInCents set, rejects
 *       every other ACTIVE proposal for the shipment, and exhausts any
 *       remaining non-terminal queue entries.
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Proposal accepted, shipment CARRIER_SELECTED
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not PROPOSALS_RECEIVED, or proposal is not ACTIVE
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/proposals/{proposalId}/reject:
 *   post:
 *     summary: Reject a proposal's current attempt
 *     description: >
 *       Rejects the current attempt. If it was the 5th attempt, the whole
 *       proposal becomes REJECTED and the queue entry EXHAUSTED (advancing
 *       the call group); otherwise the proposal stays ACTIVE and the
 *       carrier may submit another attempt.
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Attempt rejected
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not PROPOSALS_RECEIVED, or proposal is not ACTIVE
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/proposal/withdraw:
 *   post:
 *     summary: Withdraw the proposal
 *     description: Only valid from ACTIVE. Moves the queue entry to WITHDRAWN and triggers the call-group refill.
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Proposal withdrawn
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Proposal is not ACTIVE
 */
