/**
 * @swagger
 * /api/me/documents:
 *   post:
 *     summary: Upload a carrier verification document
 *     description: >
 *       multipart/form-data with fields "type" (CPF | CNH_FRONT | CNH_BACK |
 *       ADDRESS_PROOF | SELFIE) and "file" (image/jpeg, image/png, or
 *       application/pdf, max 10MB). Re-uploading the same type creates a
 *       new row (history preserved) rather than replacing the previous one.
 *       Only the autonomous-carrier document types are accepted here —
 *       company documents (CNPJ, SOCIAL_CONTRACT) are out of scope.
 *     tags: [Carrier Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [type, file]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CPF, CNH_FRONT, CNH_BACK, ADDRESS_PROOF, SELFIE]
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '201':
 *         description: Document uploaded, status PENDING
 *       '400':
 *         description: Invalid type, or invalid file (MIME or size)
 *       '403':
 *         description: Caller is not a CARRIER
 *       '502':
 *         description: Storage upload failed (e.g. Supabase not configured)
 *   get:
 *     summary: List my uploaded documents
 *     description: Returns all documents uploaded by the authenticated carrier, most recent first.
 *     tags: [Carrier Documents]
 *     responses:
 *       '200':
 *         description: List of documents
 */

/**
 * @swagger
 * /api/admin/carrier-documents:
 *   get:
 *     summary: List carrier documents (admin review queue)
 *     description: Paginated, optionally filtered by status. Admin only.
 *     tags: [Carrier Documents]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, maximum: 100 }
 *     responses:
 *       '200':
 *         description: Paginated list of documents
 *       '403':
 *         description: Caller is not an ADMIN
 */

/**
 * @swagger
 * /api/admin/carrier-documents/{documentId}/approve:
 *   post:
 *     summary: Approve a carrier document
 *     description: >
 *       Only valid while the document is PENDING. If this completes all 5
 *       required document types for the carrier (each with at least one
 *       APPROVED document), CarrierProfile.verificationStatus
 *       auto-transitions to APPROVED. Admin only.
 *     tags: [Carrier Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       '200':
 *         description: Document approved
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Document is not PENDING
 */

/**
 * @swagger
 * /api/admin/carrier-documents/{documentId}/reject:
 *   post:
 *     summary: Reject a carrier document
 *     description: >
 *       Only valid while the document is PENDING. Requires rejectionReason.
 *       Does not change CarrierProfile.verificationStatus — a single
 *       rejection doesn't block the whole profile, since the carrier can
 *       re-upload a corrected document of the same type. Admin only.
 *     tags: [Carrier Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason: { type: string }
 *     responses:
 *       '200':
 *         description: Document rejected
 *       '400':
 *         description: Missing rejectionReason
 *       '404':
 *         $ref: '#/components/responses/NotFoundError'
 *       '409':
 *         description: Document is not PENDING
 */
