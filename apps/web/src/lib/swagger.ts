import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Movux API',
      version: '1.0.0',
      description:
        'REST API — authentication, user profile, tenants, and tenant memberships.',
    },
    servers: [{ url: '/' }],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication — register (customer/carrier), login, logout, me',
      },
      { name: 'Me', description: 'Authenticated user — profile and password' },
      {
        name: 'Shipments',
        description: 'Freight/moving shipments — create, publish, get, list (customer)',
      },
      {
        name: 'Proposal Queue',
        description: 'Carrier queue per shipment — join, withdraw, own status',
      },
      {
        name: 'Proposals',
        description: 'Carrier price proposals per shipment — submit, counter-offer, withdraw',
      },
      {
        name: 'Safety',
        description: 'Safety term check-in — customer and selected carrier confirm before transit',
      },
      {
        name: 'Transit',
        description: 'Carrier-driven lifecycle transitions — collect, in transit, deliver',
      },
      {
        name: 'Delivery Confirmation',
        description:
          "Customer's double-confirmation of delivery, with 24h lazy auto-confirm",
      },
      {
        name: 'Shipment Events',
        description: 'Chronological audit log of a shipment lifecycle transitions',
      },
      {
        name: 'Reviews',
        description: 'Mutual rating between customer and carrier after delivery',
      },
      {
        name: 'Carrier Documents',
        description: 'Carrier verification document upload (Supabase Storage)',
      },
      {
        name: 'Notifications',
        description: 'Admin view of sent/failed notifications, with manual retry',
      },
      {
        name: 'Tenants',
        description:
          'Tenant containers — CRUD, soft-delete, detail with paginated memberships',
      },
      {
        name: 'Tenant Members',
        description:
          'Tenant memberships — add/remove/list members (SUPER_ADMIN scope)',
      },
      {
        name: 'Workspaces',
        description:
          'Workspaces — operational units inside a tenant. CRUD + role-filtered detail view',
      },
      {
        name: 'Workspace Members',
        description:
          'Workspace memberships — invite by email, change role, remove (ADMIN scope)',
      },
      {
        name: 'Workspace Categories',
        description:
          'Setores — GLOBAL + TENANT + WORKSPACE catalog with override by slug; WORKSPACE-scope CRUD for ADMIN',
      },
      {
        name: 'Workspace Specialties',
        description:
          'Profissões — GLOBAL + TENANT + WORKSPACE catalog with override by slug; WORKSPACE-scope CRUD for ADMIN',
      },
      {
        name: 'Schedules',
        description:
          'Escalas — DRAFT/PUBLISHED/CLOSED state machine. ADMIN or COORDENADOR creates/publishes/closes. Overlap guarded per (workspace, category).',
      },
      {
        name: 'Shifts',
        description:
          'Turnos and recurrence patterns. Shifts attach to a Schedule; ADMIN or COORDENADOR creates/edits/cancels. Pattern generation is idempotent and capped at 90 days.',
      },
      {
        name: 'Assignments',
        description:
          'Direct shift assignments. Bulk-assign with cross-workspace overlap detection + alternatives. Self-assign auto-accepts. ADMIN or COORDENADOR scope.',
      },
      {
        name: 'Assignment Decisions',
        description:
          'Accept/Reject/Transfer flow on existing assignments. Assignee or ADMIN/COORD override (Q1 Ideal). TransferRequest with PENDING → APPROVED/REJECTED/CANCELLED state machine.',
      },
      {
        name: 'Candidates',
        description:
          'Open-for-Apply queue. Colab applies (FIFO), withdraws; ADMIN/COORD approves (creates Assignment) or rejects (reason required). Visibility split: full list ADMIN/COORD only; /me + /count for any member.',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description:
            'JWT stored in the session cookie. Obtain it via POST /api/auth/login.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        ShipmentAddressInput: {
          type: 'object',
          required: ['street', 'number', 'neighborhoodId', 'cityId', 'state', 'zipCode'],
          properties: {
            street: { type: 'string' },
            number: { type: 'string' },
            complement: { type: 'string' },
            neighborhoodId: { type: 'string', format: 'uuid' },
            cityId: { type: 'string', format: 'uuid' },
            state: { type: 'string', minLength: 2, maxLength: 2 },
            zipCode: { type: 'string' },
            lat: { type: 'number' },
            lng: { type: 'number' },
            floor: { type: 'integer' },
            hasElevator: { type: 'boolean' },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Unauthenticated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { message: 'Unauthenticated' },
            },
          },
        },
        ForbiddenError: {
          description: 'Forbidden — insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { message: 'Forbidden', code: 'FORBIDDEN' },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: { message: 'Not found', code: 'NOT_FOUND' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                message: 'Invalid payload',
                details: [{ path: ['email'], message: 'Invalid email' }],
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ['./src/lib/swagger/definitions/**/*.ts'],
}

export const swaggerSpec = swaggerJsdoc(options)
