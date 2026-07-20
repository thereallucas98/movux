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
