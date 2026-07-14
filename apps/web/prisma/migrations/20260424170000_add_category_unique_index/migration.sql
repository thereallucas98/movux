-- Unique across (scope, vertical, tenant_id, workspace_id, slug) treating NULL as equal.
-- Requires Postgres 15+ (NULLS NOT DISTINCT).
-- Prisma schema DSL doesn't support NULLS NOT DISTINCT; enforced via raw SQL here.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
