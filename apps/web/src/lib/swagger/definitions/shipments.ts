/**
 * @swagger
 * /api/shipments:
 *   post:
 *     summary: Create a shipment (DRAFT)
 *     description: Creates a shipment with origin/destination addresses and optional modifiers. Calculates suggestedPriceInCents from the pricing template for the address corridor. Both addresses must reference a known neighborhoodId.
 *     tags: [Shipments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, description, vehicleTypeRequired, scheduledDate, timeWindow, customerSlaHours, origin, destination]
 *             properties:
 *               type: { type: string, enum: [RESIDENTIAL_MOVING, COMMERCIAL_FREIGHT, DELIVERY, OTHER] }
 *               description: { type: string }
 *               estimatedWeightKg: { type: number }
 *               estimatedVolumeM3: { type: number }
 *               vehicleTypeRequired: { type: string, enum: [ANY, MOTORCYCLE, VAN, TRUCK_SMALL, TRUCK_LARGE] }
 *               scheduledDate: { type: string, format: date }
 *               timeWindow: { type: string, enum: [MORNING, AFTERNOON, EVENING, SPECIFIC] }
 *               specificTime: { type: string, description: 'HH:mm, required when timeWindow = SPECIFIC' }
 *               customerSlaHours: { type: integer, enum: [4, 6, 8, 12, 24] }
 *               origin: { $ref: '#/components/schemas/ShipmentAddressInput' }
 *               destination: { $ref: '#/components/schemas/ShipmentAddressInput' }
 *               modifiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     modifierCode: { type: string, enum: [FLOOR, HELPER, DISASSEMBLY, PACKING, DIFFICULT_ACCESS, NIGHT_WEEKEND] }
 *                     quantity: { type: integer, default: 1 }
 *           example:
 *             type: "RESIDENTIAL_MOVING"
 *             description: "Mudança de apartamento, 2 quartos"
 *             vehicleTypeRequired: "VAN"
 *             scheduledDate: "2026-08-01"
 *             timeWindow: "MORNING"
 *             customerSlaHours: 8
 *             origin: { street: "Av. Rui Carneiro", number: "500", neighborhoodId: "<uuid>", cityId: "<uuid>", state: "PB", zipCode: "58037000", floor: 3, hasElevator: true }
 *             destination: { street: "Av. Almirante Tamandaré", number: "100", neighborhoodId: "<uuid>", cityId: "<uuid>", state: "PB", zipCode: "58039000" }
 *             modifiers: [{ modifierCode: "HELPER", quantity: 2 }]
 *     responses:
 *       '201':
 *         description: Shipment created in DRAFT
 *       '400':
 *         $ref: '#/components/responses/ValidationError'
 *       '404':
 *         description: Customer profile not found
 *       '422':
 *         description: No pricing template for this corridor/shipment type
 *   get:
 *     summary: List my shipments
 *     description: Lists shipments belonging to the authenticated customer, paginated.
 *     tags: [Shipments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Paginated list
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}:
 *   get:
 *     summary: Get a shipment
 *     description: Returns a shipment with its addresses and modifiers. Only the owning customer can access it.
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Shipment detail
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 */

/**
 * @swagger
 * /api/shipments/browse:
 *   get:
 *     summary: Browse open shipments (carrier)
 *     description: >
 *       Lists shipments with status OPEN. Addresses are redacted — only
 *       neighborhoodName/cityId/state are returned, never street/number/
 *       zipCode/lat/lng, until the carrier is selected.
 *     tags: [Shipments]
 *     parameters:
 *       - in: query
 *         name: cityId
 *         schema: { type: string, format: uuid }
 *         description: Filters by the ORIGIN address city
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [RESIDENTIAL_MOVING, COMMERCIAL_FREIGHT, DELIVERY, OTHER] }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       '200':
 *         description: Paginated list of open shipments with redacted addresses
 *       '401':
 *         $ref: '#/components/responses/UnauthorizedError'
 *       '403':
 *         description: Only carriers can browse
 */

/**
 * @swagger
 * /api/shipments/{shipmentId}/publish:
 *   post:
 *     summary: Publish a shipment (DRAFT -> OPEN)
 *     description: Only valid from DRAFT. Once OPEN, carriers can see it in the browse queue (S1-T4).
 *     tags: [Shipments]
 *     parameters:
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Shipment published
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Shipment is not in DRAFT status
 */
