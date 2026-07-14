-- CreateEnum
CREATE TYPE "SpecialtyScope" AS ENUM ('GLOBAL', 'TENANT', 'WORKSPACE');

-- DropIndex
DROP INDEX "category_scope_vertical_tenant_workspace_slug_key";

-- CreateTable
CREATE TABLE "specialty" (
    "id" TEXT NOT NULL,
    "scope" "SpecialtyScope" NOT NULL,
    "vertical" "WorkspaceVertical",
    "tenant_id" TEXT,
    "workspace_id" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specialty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "specialty_scope_vertical_idx" ON "specialty"("scope", "vertical");

-- CreateIndex
CREATE INDEX "specialty_scope_tenant_id_idx" ON "specialty"("scope", "tenant_id");

-- CreateIndex
CREATE INDEX "specialty_scope_workspace_id_idx" ON "specialty"("scope", "workspace_id");

-- AddForeignKey
ALTER TABLE "specialty" ADD CONSTRAINT "specialty_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialty" ADD CONSTRAINT "specialty_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate category's NULLS NOT DISTINCT unique (Prisma drops it on migrate dev because it can't model it in DSL).
-- Requires Postgres 15+. See follow-up in Task 04 validation.
CREATE UNIQUE INDEX "category_scope_vertical_tenant_workspace_slug_key"
  ON "category" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;

-- Specialty's own NULLS NOT DISTINCT unique.
CREATE UNIQUE INDEX "specialty_scope_vertical_tenant_workspace_slug_key"
  ON "specialty" (scope, vertical, tenant_id, workspace_id, slug)
  NULLS NOT DISTINCT;
