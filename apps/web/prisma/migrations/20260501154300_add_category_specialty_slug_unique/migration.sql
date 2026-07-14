-- Add unique constraint on (workspace_id, slug) for both Category and Specialty.
--
-- Postgres treats NULLs as distinct in unique indexes, so the constraint only
-- enforces uniqueness for WORKSPACE-scope rows (their workspace_id is non-null);
-- GLOBAL/TENANT rows (workspace_id IS NULL) are not affected.
--
-- This fixes the "ALREADY_EXISTS on duplicate slug" failure path in
-- createWorkspaceCategory / createWorkspaceSpecialty, which relies on the
-- Prisma P2002 unique-violation surfacing the error.
--
-- Tenant-scope slug uniqueness is intentionally NOT enforced here — Geral
-- auto-creation produces multiple WORKSPACE-scope rows with the same
-- (tenant_id, slug='general') across different workspaces of one tenant,
-- which would conflict with a naive (tenant_id, slug) unique index. If
-- Corporate-tier tenant-scope catalogs ever need slug uniqueness, add it as
-- a partial unique index `WHERE scope = 'TENANT'`.
--
-- Follow-up #1 from `docs/tasks/15-plan-limits/validation.md`.

CREATE UNIQUE INDEX "category_workspace_slug_unique" ON "category"("workspace_id", "slug");
CREATE UNIQUE INDEX "specialty_workspace_slug_unique" ON "specialty"("workspace_id", "slug");
